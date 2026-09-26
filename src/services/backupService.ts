/**
 * Backup e restauração dos dados de trabalho que ficam no navegador
 * (posts importados, métricas, ideias, calendário, tarefas, diagnósticos, relatórios).
 * Os clientes também ficam no servidor; o backup garante o restante.
 */

import { BACKUP_COLLECTIONS } from './storageService';
import { storageFactory } from './storage/StorageFactory';
import { DemoProvider } from './demo/DemoProvider';

export const BACKUP_APP = 'gs-social-intelligence';
export const BACKUP_VERSION = 1;
const LAST_BACKUP_KEY = 'gs_last_backup_at';

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: Record<string, unknown[]>;
}

type Row = { id?: unknown; clientId?: unknown };

/** Monta o backup (sem os dados fictícios do modo demonstração). */
export function buildBackup(now = new Date()): BackupFile {
  const demoId = DemoProvider.getDemoClientId();
  const data: Record<string, unknown[]> = {};
  for (const { key, entity } of BACKUP_COLLECTIONS) {
    const rows = storageFactory.getAdapter(entity).getCollection<Row>(key);
    data[key] = rows.filter((r) => r && r.clientId !== demoId && r.id !== demoId);
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

export function backupStats(file: BackupFile): { total: number; byKey: Record<string, number> } {
  const byKey = Object.fromEntries(Object.entries(file.data).map(([k, v]) => [k, v.length]));
  return { total: Object.values(byKey).reduce((a, b) => a + b, 0), byKey };
}

/** Valida um arquivo de backup; lança Error com mensagem amigável se inválido. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  const f = raw as Partial<BackupFile>;
  if (!f || f.app !== BACKUP_APP || typeof f.data !== 'object' || f.data === null) {
    throw new Error('Este arquivo não é um backup do Social Intelligence.');
  }
  if (typeof f.version !== 'number' || f.version > BACKUP_VERSION) {
    throw new Error('Backup de uma versão mais nova do sistema. Atualize o site e tente de novo.');
  }
  const known = new Set(BACKUP_COLLECTIONS.map((c) => c.key));
  for (const [k, v] of Object.entries(f.data)) {
    if (!known.has(k)) continue;
    if (!Array.isArray(v)) throw new Error(`Seção "${k}" do backup está corrompida.`);
  }
  return f as BackupFile;
}

/** Substitui os dados locais pelos do backup (coleções ausentes no arquivo ficam como estão). */
export function restoreBackup(file: BackupFile): number {
  let restored = 0;
  for (const { key, entity } of BACKUP_COLLECTIONS) {
    const rows = file.data[key];
    if (!Array.isArray(rows)) continue;
    storageFactory.getAdapter(entity).setCollection(key, rows);
    restored += rows.length;
  }
  return restored;
}

export function markBackupDone(now = new Date()): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
  } catch {
    /* sem armazenamento: apenas não lembra a data */
  }
}

export function lastBackupAt(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

/** Dias desde o último backup (null = nunca). */
export function daysSinceBackup(now = new Date()): number | null {
  const at = lastBackupAt();
  if (!at || Number.isNaN(Date.parse(at))) return null;
  return Math.floor((now.getTime() - Date.parse(at)) / 86_400_000);
}

/** Dispara o download do backup no navegador. */
export function downloadBackup(now = new Date()): BackupFile {
  const file = buildBackup(now);
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-social-intelligence-${now.toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  markBackupDone(now);
  return file;
}
