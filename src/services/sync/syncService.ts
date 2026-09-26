/**
 * Sincronização do workspace com a nuvem (/api/workspace).
 *
 * - O navegador continua sendo a fonte rápida (localStorage/IndexedDB); a nuvem guarda
 *   uma cópia por coleção, com versão, para abrir os mesmos dados em outro aparelho.
 * - Escritas locais marcam a coleção como pendente e são enviadas ~1,5s depois.
 * - Se outro aparelho (ou o portal do cliente) gravou antes, o servidor responde 409
 *   com o documento atual; mesclamos por id (três vias) e reenviamos.
 * - Dados do modo demonstração nunca vão para a nuvem.
 */

import { apiClient, ApiError } from '../api/apiClient';
import { BACKUP_COLLECTIONS } from '../storageService';
import { storageFactory } from '../storage/StorageFactory';
import { indexedDBAdapter } from '../storage/IndexedDBAdapter';
import { onStorageWrite, withoutNotify } from '../storage/changeBus';
import { DemoProvider } from '../demo/DemoProvider';
import { idsOf, mergeCollections } from './merge';
import { logger } from '../../utils/logger';

type Item = Record<string, unknown>;

export type SyncState = 'disabled' | 'syncing' | 'saved' | 'pending' | 'offline' | 'error';

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: string | null;
  message: string | null;
}

interface RemoteDoc {
  key: string;
  data: Item[];
  version: number;
  updatedAt: string;
}

interface Meta {
  agencyId: string;
  versions: Record<string, number>;
  dirty: string[];
  lastSyncedAt: string | null;
}

const META_KEY = 'gs_sync_meta';
const BASE_KEY = 'gs_sync_base';
const PUSH_DELAY_MS = 1500;
const RETRY_MS = 60_000;
const PULL_ON_FOCUS_AFTER_MS = 30_000;

const collections = () => new Map(BACKUP_COLLECTIONS.map((c) => [c.key, c.entity]));

let meta: Meta | null = null;
let status: SyncStatus = { state: 'disabled', lastSyncedAt: null, message: null };
const statusListeners = new Set<(s: SyncStatus) => void>();
const remoteListeners = new Set<(keys: string[]) => void>();
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setInterval> | null = null;
let unsubscribeWrites: (() => void) | null = null;
let running: Promise<void> | null = null;
let lastPullAt = 0;

function setStatus(next: Partial<SyncStatus>): void {
  status = { ...status, ...next };
  statusListeners.forEach((l) => l(status));
}

function loadMeta(agencyId: string): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    const parsed = raw ? (JSON.parse(raw) as Meta) : null;
    if (parsed && parsed.agencyId === agencyId) return { ...parsed, dirty: parsed.dirty ?? [], versions: parsed.versions ?? {} };
  } catch {
    // meta corrompida: recomeça (a primeira sincronização une os dois lados, sem perder nada)
  }
  return { agencyId, versions: {}, dirty: [], lastSyncedAt: null };
}

function saveMeta(): void {
  if (!meta) return;
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // sem espaço: a sincronização continua em memória
  }
}

function baseIds(key: string): Set<string> | null {
  const all = indexedDBAdapter.get<Record<string, string[]>>(BASE_KEY, {});
  return all[key] ? new Set(all[key]) : null;
}

function setBaseIds(key: string, ids: string[]): void {
  const all = { ...indexedDBAdapter.get<Record<string, string[]>>(BASE_KEY, {}) };
  all[key] = ids;
  withoutNotify(() => indexedDBAdapter.set(BASE_KEY, all));
}

const demoId = () => DemoProvider.getDemoClientId();
const isDemoRow = (key: string, item: Item) =>
  item.clientId === demoId() || (key === 'gs_intel_clients' && item.id === demoId());

function readLocal(key: string): Item[] {
  const entity = collections().get(key);
  if (!entity) return [];
  return storageFactory.getAdapter(entity).getCollection<Item>(key);
}

/** O que vai para a nuvem: a coleção local sem linhas do modo demonstração. */
function shareable(key: string): Item[] {
  return readLocal(key).filter((i) => !isDemoRow(key, i));
}

function writeLocal(key: string, items: Item[]): void {
  const entity = collections().get(key);
  if (!entity) return;
  const demoRows = readLocal(key).filter((i) => isDemoRow(key, i));
  withoutNotify(() => storageFactory.getAdapter(entity).setCollection(key, [...items, ...demoRows]));
}

function markDirty(key: string): void {
  if (!meta || !collections().has(key)) return;
  if (!meta.dirty.includes(key)) meta.dirty.push(key);
  saveMeta();
  setStatus({ state: 'pending' });
  schedulePush();
}

function schedulePush(delay = PUSH_DELAY_MS): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void run(pushDirty);
  }, delay);
}

/** Serializa as operações (nunca dois envios da mesma coleção ao mesmo tempo). */
async function run(op: () => Promise<void>): Promise<void> {
  while (running) await running;
  running = op().finally(() => {
    running = null;
  });
  return running;
}

function isNetworkError(err: unknown): boolean {
  return err instanceof ApiError && (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT' || err.status >= 500);
}

function applyRemote(doc: RemoteDoc, changed: string[]): void {
  writeLocal(doc.key, doc.data);
  meta!.versions[doc.key] = doc.version;
  setBaseIds(doc.key, idsOf(doc.data));
  changed.push(doc.key);
}

async function pushKey(key: string, changed: string[]): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const data = shareable(key);
    try {
      const res = await apiClient.put<{ document: RemoteDoc }>('/api/workspace', { key, baseVersion: meta!.versions[key] ?? 0, data });
      meta!.versions[key] = res.document.version;
      setBaseIds(key, idsOf(data));
      return;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const current = (err.data as { document?: RemoteDoc | null } | undefined)?.document;
        if (!current) {
          meta!.versions[key] = 0;
          continue;
        }
        const merged = mergeCollections(shareable(key), current.data, baseIds(key));
        writeLocal(key, merged);
        meta!.versions[key] = current.version;
        setBaseIds(key, idsOf(current.data));
        changed.push(key);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Conflito persistente ao salvar ${key}.`);
}

function notifyRemote(changed: string[]): void {
  const unique = [...new Set(changed)];
  if (unique.length) remoteListeners.forEach((l) => l(unique));
}

async function pushDirty(): Promise<void> {
  if (!meta || meta.dirty.length === 0) return;
  if (DemoProvider.isDemoActive()) return;
  setStatus({ state: 'syncing', message: null });
  const changed: string[] = [];
  try {
    while (meta.dirty.length) {
      // Sai da fila antes do envio: uma edição feita durante o envio volta para a fila.
      const key = meta.dirty.shift() as string;
      saveMeta();
      try {
        await pushKey(key, changed);
      } catch (err) {
        if (meta && !meta.dirty.includes(key)) meta.dirty.unshift(key);
        saveMeta();
        throw err;
      }
    }
    meta.lastSyncedAt = new Date().toISOString();
    saveMeta();
    setStatus({ state: 'saved', lastSyncedAt: meta.lastSyncedAt, message: null });
  } catch (err) {
    handleError(err);
  } finally {
    notifyRemote(changed);
  }
}

function handleError(err: unknown): void {
  if (isNetworkError(err)) {
    setStatus({ state: 'offline', message: 'Sem conexão com a nuvem. As alterações ficam salvas neste aparelho e sobem quando voltar.' });
    return;
  }
  const message =
    err instanceof ApiError && err.status === 413
      ? 'Uma coleção ficou grande demais para a nuvem (limite de 4MB). Faça um backup e apague dados antigos.'
      : err instanceof Error
        ? err.message
        : 'Falha ao sincronizar.';
  logger.warn('Sincronização falhou', { error: message });
  setStatus({ state: 'error', message });
}

async function pull(): Promise<void> {
  if (!meta || DemoProvider.isDemoActive()) return;
  setStatus({ state: 'syncing', message: null });
  const changed: string[] = [];
  try {
    const { documents } = await apiClient.get<{ documents: RemoteDoc[] }>('/api/workspace');
    lastPullAt = Date.now();
    const remote = new Map(documents.map((d) => [d.key, d]));
    for (const key of collections().keys()) {
      const doc = remote.get(key);
      const known = meta.versions[key];
      const dirty = meta.dirty.includes(key);
      const local = shareable(key);
      if (!doc) {
        // Nada na nuvem ainda: sobe o que existe aqui.
        if (local.length && !dirty) meta.dirty.push(key);
        if (known) delete meta.versions[key];
        continue;
      }
      if (known === doc.version) continue;
      if (dirty || (known === undefined && local.length > 0)) {
        // Mudanças dos dois lados (ou primeira vez neste aparelho com dados): mescla e reenvia.
        const merged = mergeCollections(local, doc.data, known === undefined ? null : baseIds(key));
        writeLocal(key, merged);
        meta.versions[key] = doc.version;
        setBaseIds(key, idsOf(doc.data));
        changed.push(key);
        if (!dirty) meta.dirty.push(key);
      } else {
        applyRemote(doc, changed);
      }
    }
    saveMeta();
    if (meta.dirty.length) {
      await pushDirty();
    } else {
      meta.lastSyncedAt = new Date().toISOString();
      saveMeta();
      setStatus({ state: 'saved', lastSyncedAt: meta.lastSyncedAt });
    }
  } catch (err) {
    handleError(err);
  } finally {
    notifyRemote(changed);
  }
}

function onOnline(): void {
  void run(pull);
}

function onVisible(): void {
  if (document.visibilityState === 'visible' && Date.now() - lastPullAt > PULL_ON_FOCUS_AFTER_MS) void run(pull);
}

export const syncService = {
  /** Liga a sincronização para a agência logada e baixa/mescla os dados da nuvem. */
  async start(agencyId: string): Promise<void> {
    this.stop();
    meta = loadMeta(agencyId);
    setStatus({ state: 'syncing', lastSyncedAt: meta.lastSyncedAt, message: null });
    unsubscribeWrites = onStorageWrite(markDirty);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    retryTimer = setInterval(() => {
      if (status.state === 'offline' || (status.state === 'pending' && !pushTimer)) void run(pull);
    }, RETRY_MS);
    await run(pull);
  },

  stop(): void {
    unsubscribeWrites?.();
    unsubscribeWrites = null;
    if (pushTimer) clearTimeout(pushTimer);
    if (retryTimer) clearInterval(retryTimer);
    pushTimer = null;
    retryTimer = null;
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
    meta = null;
    setStatus({ state: 'disabled', message: null });
  },

  /** Envia agora o que estiver pendente (ex.: antes de gerar um link de aprovação). */
  async flush(): Promise<void> {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = null;
    await run(pushDirty);
  },

  /** Busca novidades da nuvem (ex.: decisões do cliente no portal). */
  async refresh(): Promise<void> {
    await run(pull);
  },

  getStatus(): SyncStatus {
    return status;
  },

  onStatus(listener: (s: SyncStatus) => void): () => void {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
  },

  /** Avisado quando dados vindos da nuvem foram gravados localmente (a tela deve recarregar). */
  onRemoteChange(listener: (keys: string[]) => void): () => void {
    remoteListeners.add(listener);
    return () => remoteListeners.delete(listener);
  }
};
