/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Instagram Service (frontend) — reflete o estado REAL da conexão no servidor.
 *
 * - Conectar = OAuth no backend (/api/auth/instagram/start). Nunca marca "conectado" localmente.
 * - Tokens nunca chegam ao navegador; o cache local guarda apenas status e dados já sincronizados.
 * - Sincronizar = POST /api/instagram/sync (idempotente) + leitura dos dados persistidos.
 * - Métricas ausentes permanecem null.
 */

import { InstagramAccount, InstagramConnectionStatus, AccountSnapshot, Content, SyncTrigger, SyncStatus } from '../types';
import { storageService } from './storageService';
import { apiClient, ApiError, describeApiError } from './api/apiClient';
import { DemoProvider } from './demo/DemoProvider';
import { logger } from '../utils/logger';
import { engagementFrom } from '../utils/metrics';

export interface SyncResult {
  success: boolean;
  timestamp: string;
  itemsSynced: number;
  error?: string;
  partial?: boolean;
}

interface ServerConnection {
  id: string;
  clientId: string;
  instagramAccountId: string;
  username: string | null;
  status: InstagramConnectionStatus;
  scopes: string[];
  tokenExpiresAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
}

interface ServerContent {
  id: string;
  externalId: string;
  mediaType: string | null;
  format: 'Reels' | 'Carrossel' | 'Foto';
  caption: string;
  permalink: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  metrics: { likes: number | null; comments: number | null; reach: number | null; views: number | null; shares: number | null; saves: number | null };
  createdAt: string;
  updatedAt: string;
}

interface ServerSnapshot {
  date: string;
  followers: number | null;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  postsPublished: number | null;
  engagementRate: number | null;
  sourceTimestamp: string;
}

interface ServerSyncLog {
  id: string;
  trigger: string;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'ERROR';
  startedAt: string;
  finishedAt: string | null;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: string[];
  requestId: string;
}

const CONNECTED_STATES: InstagramConnectionStatus[] = ['CONNECTED', 'SYNCING'];

function isDemoClient(clientId: string): boolean {
  return clientId === DemoProvider.getDemoClientId();
}

export function contentFromServer(item: ServerContent, clientId: string): Content {
  const firstLine = item.caption.split('\n')[0]?.trim() ?? '';
  return {
    id: `content-meta-${item.externalId}`,
    clientId,
    instagramMediaId: item.externalId,
    mediaType: item.mediaType ?? undefined,
    permalink: item.permalink ?? undefined,
    mediaUrl: item.mediaUrl ?? undefined,
    thumbnailUrl: item.thumbnailUrl ?? undefined,
    title: firstLine.length > 3 ? firstLine.slice(0, 80) : `Publicação (${item.format})`,
    caption: item.caption,
    publishedAt: item.publishedAt ?? item.createdAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    format: item.format,
    pillar: 'Geral',
    objective: 'Engajamento',
    hook: firstLine.slice(0, 120),
    cta: '',
    metrics: {
      views: item.metrics.views,
      reach: item.metrics.reach,
      likes: item.metrics.likes,
      comments: item.metrics.comments,
      shares: item.metrics.shares,
      saves: item.metrics.saves,
      engagementRate: engagementFrom(item.metrics)
    }
  };
}

export const instagramService = {
  getAccount(clientId: string): InstagramAccount {
    const existing = storageService.instagram.getByClientId(clientId);
    if (existing) return existing;
    const client = storageService.clients.getById(clientId);
    const initial: InstagramAccount = {
      clientId,
      handle: client?.instagram || '@',
      status: 'DISCONNECTED',
      isConnected: false,
      permissions: []
    };
    storageService.instagram.saveAccount(initial);
    return initial;
  },

  saveState(clientId: string, patch: Partial<InstagramAccount>): InstagramAccount {
    const current = this.getAccount(clientId);
    const status = patch.status ?? current.status;
    return storageService.instagram.saveAccount({ ...current, ...patch, isConnected: CONNECTED_STATES.includes(status) });
  },

  /** Consulta o estado real da conexão no servidor e atualiza o cache local. */
  async checkStatus(clientId: string): Promise<InstagramAccount> {
    if (isDemoClient(clientId)) return this.getAccount(clientId);
    try {
      const res = await apiClient.get<{ status: InstagramConnectionStatus; configured: boolean; connection: ServerConnection | null }>(
        `/api/instagram/connection?clientId=${encodeURIComponent(clientId)}`
      );
      const c = res.connection;
      return this.saveState(clientId, {
        status: res.status,
        accountId: c?.instagramAccountId,
        username: c?.username ?? null,
        permissions: c?.scopes ?? [],
        tokenExpiresAt: c?.tokenExpiresAt ?? null,
        lastSyncAt: c?.lastSyncAt ?? undefined,
        errorStatus: c?.lastError ?? null
      });
    } catch (err) {
      logger.warn('Falha ao consultar status do Instagram', { error: describeApiError(err) });
      if (err instanceof ApiError && err.status === 404) {
        return this.saveState(clientId, { status: 'ERROR', errorStatus: 'Cliente ainda não registrado no servidor.' });
      }
      return this.getAccount(clientId);
    }
  },

  /** Inicia o OAuth: o backend gera o state e devolve a URL de autorização da Meta. */
  async beginOAuth(clientId: string): Promise<void> {
    this.saveState(clientId, { status: 'CONNECTING', errorStatus: null });
    try {
      const res = await apiClient.get<{ authorizationUrl: string }>(
        `/api/auth/instagram/start?clientId=${encodeURIComponent(clientId)}&mode=json`,
        { retries: 0 }
      );
      const url = new URL(res.authorizationUrl);
      if (url.protocol !== 'https:' || !url.hostname.endsWith('facebook.com')) throw new Error('URL de autorização inesperada.');
      window.location.assign(url.toString());
    } catch (err) {
      const message = describeApiError(err, 'Não foi possível iniciar a conexão com o Instagram.');
      const notConfigured = err instanceof ApiError && err.code === 'META_NOT_CONFIGURED';
      this.saveState(clientId, { status: notConfigured ? 'NOT_CONFIGURED' : 'ERROR', errorStatus: message });
      throw err;
    }
  },

  async disconnectAccount(clientId: string): Promise<void> {
    if (!isDemoClient(clientId)) {
      await apiClient.delete(`/api/instagram/connection?clientId=${encodeURIComponent(clientId)}`);
    }
    this.saveState(clientId, { status: 'DISCONNECTED', errorStatus: null, accountId: undefined, username: null, permissions: [] });
    logger.info(`Instagram desconectado para o cliente ${clientId}`);
  },

  /** Baixa os dados persistidos no servidor e atualiza o cache local (sem duplicar). */
  async pullServerData(clientId: string): Promise<{ contents: number; snapshots: number }> {
    const data = await apiClient.get<{ contents: ServerContent[]; snapshots: ServerSnapshot[]; syncLogs: ServerSyncLog[] }>(
      `/api/instagram/sync?clientId=${encodeURIComponent(clientId)}`
    );
    data.contents.forEach((item) => {
      const mapped = contentFromServer(item, clientId);
      const existing = storageService.contents.getAll().find((c) => c.clientId === clientId && c.instagramMediaId === item.externalId);
      // Preserva classificações editoriais feitas pela equipe (pilar, objetivo, CTA).
      storageService.contents.upsert(existing ? { ...mapped, pillar: existing.pillar, objective: existing.objective, cta: existing.cta, aiAnalysis: existing.aiAnalysis } : mapped);
    });
    data.snapshots.forEach((snap) => {
      storageService.history.saveSnapshot({
        clientId,
        date: snap.date,
        followers: snap.followers,
        reach: snap.reach,
        views: snap.views,
        likes: snap.likes,
        comments: snap.comments,
        shares: snap.shares,
        saves: snap.saves,
        profileVisits: null,
        websiteClicks: null,
        postsPublished: snap.postsPublished,
        engagementRate: snap.engagementRate,
        source: 'META_API',
        sourceTimestamp: snap.sourceTimestamp
      });
    });
    const knownLogs = new Set(storageService.syncLogs.getByClient(clientId).map((l) => l.requestId));
    data.syncLogs
      .filter((log) => log.status !== 'RUNNING' && !knownLogs.has(log.requestId))
      .forEach((log) =>
        storageService.syncLogs.create({
          clientId,
          startedAt: log.startedAt,
          finishedAt: log.finishedAt ?? log.startedAt,
          status: log.status as SyncStatus,
          trigger: (['MANUAL', 'AUTO_OPEN', 'SCHEDULED'].includes(log.trigger) ? log.trigger : 'MANUAL') as SyncTrigger,
          recordsFetched: log.recordsFetched,
          recordsCreated: log.recordsCreated,
          recordsUpdated: log.recordsUpdated,
          errors: log.errors,
          provider: 'meta_instagram',
          requestId: log.requestId
        })
      );
    return { contents: data.contents.length, snapshots: data.snapshots.length };
  },

  async syncNow(clientId: string, trigger: SyncTrigger = 'MANUAL'): Promise<SyncResult> {
    const startedAt = new Date().toISOString();
    if (isDemoClient(clientId)) {
      return { success: false, timestamp: startedAt, itemsSynced: 0, error: 'O modo demonstração não sincroniza com a Meta.' };
    }
    const account = this.getAccount(clientId);
    if (!account.isConnected) {
      return { success: false, timestamp: startedAt, itemsSynced: 0, error: 'Instagram não conectado. Conecte a conta pela aba Instagram.' };
    }

    this.saveState(clientId, { status: 'SYNCING' });
    try {
      const res = await apiClient.post<{ summary: { status: 'SUCCESS' | 'PARTIAL'; fetched: number; syncedAt: string; username: string | null } }>(
        '/api/instagram/sync',
        { clientId, trigger },
        { timeoutMs: 60000 }
      );
      await this.pullServerData(clientId);
      this.saveState(clientId, { status: 'CONNECTED', lastSyncAt: res.summary.syncedAt, errorStatus: null, username: res.summary.username });
      return { success: true, timestamp: res.summary.syncedAt, itemsSynced: res.summary.fetched, partial: res.summary.status === 'PARTIAL' };
    } catch (err) {
      const message = describeApiError(err, 'Falha ao sincronizar com a Meta.');
      await this.checkStatus(clientId);
      logger.error('Sincronização Instagram falhou', { error: message });
      return { success: false, timestamp: new Date().toISOString(), itemsSynced: 0, error: message };
    }
  },

  /** Registro manual de snapshot (fonte MANUAL, rotulada como tal). */
  recordManualSnapshot(
    clientId: string,
    data: { date: string; followers: number | null; reach: number | null; views: number | null; likes: number | null; comments: number | null; shares: number | null; saves: number | null; profileVisits?: number | null; postsPublished?: number | null }
  ): AccountSnapshot {
    return storageService.history.saveSnapshot({
      clientId,
      date: data.date,
      followers: data.followers,
      reach: data.reach,
      views: data.views,
      likes: data.likes,
      comments: data.comments,
      shares: data.shares,
      saves: data.saves,
      profileVisits: data.profileVisits ?? null,
      websiteClicks: null,
      postsPublished: data.postsPublished ?? null,
      engagementRate: engagementFrom(data),
      source: 'MANUAL',
      sourceTimestamp: new Date().toISOString()
    });
  }
};
