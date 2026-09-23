/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Schema Migrations Engine: v1 -> v2
 * Safely preserves and upgrades existing user records without data loss.
 */

import { logger } from '../../utils/logger';

export const STORAGE_SCHEMA_VERSION = 2;

const SCHEMA_VERSION_KEY = 'gs_intel_schema_version';

export function normalizeWeekDay(val: unknown): 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo' {
  if (typeof val !== 'string') return 'segunda';
  const clean = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (clean.includes('seg')) return 'segunda';
  if (clean.includes('ter')) return 'terca';
  if (clean.includes('qua')) return 'quarta';
  if (clean.includes('qui')) return 'quinta';
  if (clean.includes('sex')) return 'sexta';
  if (clean.includes('sab')) return 'sabado';
  if (clean.includes('dom')) return 'domingo';
  return 'segunda';
}

export function normalizeAlertStatus(val: unknown): 'NEW' | 'READ' | 'RESOLVED' {
  if (typeof val !== 'string') return 'NEW';
  const upper = val.toUpperCase();
  if (upper === 'READ' || upper === 'VISUALIZADO') return 'READ';
  if (upper === 'RESOLVED' || upper === 'RESOLVIDO') return 'RESOLVED';
  return 'NEW';
}

export function normalizePipelineStatus(val: unknown): 'IDEIA' | 'PLANEJADO' | 'ROTEIRO' | 'EM_PRODUCAO' | 'EDITANDO' | 'APROVACAO' | 'AGENDADO' | 'PUBLICADO' | 'ANALISADO' {
  if (typeof val !== 'string') return 'IDEIA';
  const upper = val.toUpperCase().replace(/\s+/g, '_');
  if (upper.includes('PRODUC') || upper.includes('PRODUCAO')) return 'EM_PRODUCAO';
  if (upper.includes('ROTEIR')) return 'ROTEIRO';
  if (upper.includes('PLAN')) return 'PLANEJADO';
  if (upper.includes('EDIT')) return 'EDITANDO';
  if (upper.includes('APROV')) return 'APROVACAO';
  if (upper.includes('AGEND')) return 'AGENDADO';
  if (upper.includes('PUBLI')) return 'PUBLICADO';
  if (upper.includes('ANALIS')) return 'ANALISADO';
  return 'IDEIA';
}

export function runMigrations(storage: {
  getRaw: (key: string) => string | null;
  setRaw: (key: string, val: string) => void;
}): void {
  try {
    const rawVersion = storage.getRaw(SCHEMA_VERSION_KEY);
    const currentVersion = rawVersion ? parseInt(rawVersion, 10) : 1;

    if (currentVersion >= STORAGE_SCHEMA_VERSION) {
      return; // Already up to date
    }

    logger.info(`Migrating storage schema from v${currentVersion} to v${STORAGE_SCHEMA_VERSION}...`);

    // Migration v1 -> v2
    if (currentVersion < 2) {
      // 1. Migrate Clients
      const rawClients = storage.getRaw('gs_intel_clients');
      if (rawClients) {
        try {
          const clients = JSON.parse(rawClients);
          if (Array.isArray(clients)) {
            const upgraded = clients.map((c: Record<string, unknown>) => ({
              ...c,
              healthStatus: c.healthStatus || 'not_connected',
              onboardingStep: typeof c.onboardingStep === 'number' ? Math.min(Math.max(c.onboardingStep, 1), 10) : 1,
              updatedAt: c.updatedAt || new Date().toISOString()
            }));
            storage.setRaw('gs_intel_clients', JSON.stringify(upgraded));
          }
        } catch (e) {
          logger.warn('Failed migrating clients', { error: String(e) });
        }
      }

      // 2. Migrate Alerts
      const rawAlerts = storage.getRaw('gs_intel_alerts');
      if (rawAlerts) {
        try {
          const alerts = JSON.parse(rawAlerts);
          if (Array.isArray(alerts)) {
            const upgraded = alerts.map((a: Record<string, unknown>) => ({
              ...a,
              status: normalizeAlertStatus(a.status)
            }));
            storage.setRaw('gs_intel_alerts', JSON.stringify(upgraded));
          }
        } catch (e) {
          logger.warn('Failed migrating alerts', { error: String(e) });
        }
      }

      // 3. Migrate Calendar
      const rawCalendar = storage.getRaw('gs_intel_calendar');
      if (rawCalendar) {
        try {
          const items = JSON.parse(rawCalendar);
          if (Array.isArray(items)) {
            const upgraded = items.map((item: Record<string, unknown>) => ({
              ...item,
              dayOfWeek: normalizeWeekDay(item.dayOfWeek),
              status: normalizePipelineStatus(item.status),
              orderIndex: typeof item.orderIndex === 'number' ? item.orderIndex : 0
            }));
            storage.setRaw('gs_intel_calendar', JSON.stringify(upgraded));
          }
        } catch (e) {
          logger.warn('Failed migrating calendar items', { error: String(e) });
        }
      }

      // 4. Migrate Ideas
      const rawIdeas = storage.getRaw('gs_intel_ideas');
      if (rawIdeas) {
        try {
          const ideas = JSON.parse(rawIdeas);
          if (Array.isArray(ideas)) {
            const upgraded = ideas.map((idea: Record<string, unknown>) => ({
              ...idea,
              status: normalizePipelineStatus(idea.status),
              calendarDay: idea.calendarDay ? normalizeWeekDay(idea.calendarDay) : undefined
            }));
            storage.setRaw('gs_intel_ideas', JSON.stringify(upgraded));
          }
        } catch (e) {
          logger.warn('Failed migrating ideas', { error: String(e) });
        }
      }

      // 5. Migrate Snapshots
      const rawSnapshots = storage.getRaw('gs_intel_snapshots');
      if (rawSnapshots) {
        try {
          const snapshots = JSON.parse(rawSnapshots);
          if (Array.isArray(snapshots)) {
            const upgraded = snapshots.map((s: Record<string, unknown>) => ({
              ...s,
              date: s.date || s.timestamp,
              postsPublished: typeof s.postsPublished === 'number' ? s.postsPublished : (typeof s.postsCount === 'number' ? s.postsCount : 0),
              source: s.source || 'MANUAL',
              sourceTimestamp: s.sourceTimestamp || new Date().toISOString()
            }));
            storage.setRaw('gs_intel_snapshots', JSON.stringify(upgraded));
          }
        } catch (e) {
          logger.warn('Failed migrating snapshots', { error: String(e) });
        }
      }
    }

    storage.setRaw(SCHEMA_VERSION_KEY, STORAGE_SCHEMA_VERSION.toString());
    logger.info(`Storage schema successfully migrated to v${STORAGE_SCHEMA_VERSION}`);
  } catch (err) {
    logger.error('Error executing storage migrations', { error: String(err) });
  }
}

export const migrationEngine = {
  runMigrations(customStorage?: { getRaw: (key: string) => string | null; setRaw: (key: string, val: string) => void }): void {
    if (customStorage) {
      runMigrations(customStorage);
      return;
    }

    // Default to browser localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      runMigrations({
        getRaw: (key: string) => window.localStorage.getItem(key),
        setRaw: (key: string, val: string) => window.localStorage.setItem(key, val)
      });
    }
  }
};
