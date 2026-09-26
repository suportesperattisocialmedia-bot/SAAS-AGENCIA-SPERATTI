/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Storage Service - Decoupled Persistence Layer with Multi-Adapter & Cascade Integrity
 * 
 * Strict rule: All data operations route through storageFactory / StorageAdapter.
 * Zod schemas validate data integrity with strict mathematical semantics.
 * Snapshots are idempotent: composite key `clientId + date`.
 * Deleting a client performs a complete cascade delete across ALL collections.
 */

import {
  Client,
  InstagramAccount,
  AccountSnapshot,
  Content,
  ContentMetricSnapshot,
  Competitor,
  AudienceInsight,
  ContentIdea,
  CalendarItem,
  Alert,
  Report,
  AppSettings,
  SyncLog,
  AIAnalysis,
  ResearchInsight,
  ResearchRun,
  DeliveryTask,
  TaskStatus
} from '../types';
import { storageFactory } from './storage/StorageFactory';
import { defaultStorageAdapter } from './storage/LocalStorageAdapter';
import { DemoProvider } from './demo/DemoProvider';
import {
  ClientSchema,
  InstagramAccountSchema,
  AccountSnapshotSchema,
  ContentSchema,
  CompetitorSchema,
  AudienceInsightSchema,
  ContentIdeaSchema,
  CalendarItemSchema,
  AlertSchema,
  ReportSchema,
  SyncLogSchema,
  AIAnalysisRecordSchema,
  ResearchInsightSchema,
  DeliveryTaskSchema
} from '../schemas';
import { logger } from '../utils/logger';
import { generateUUID } from '../utils/uuid';

const KEYS = {
  CLIENTS: 'gs_intel_clients',
  INSTAGRAM: 'gs_intel_instagram',
  SNAPSHOTS: 'gs_intel_snapshots',
  CONTENTS: 'gs_intel_contents',
  CONTENT_METRIC_SNAPSHOTS: 'gs_intel_content_metric_snapshots',
  COMPETITORS: 'gs_intel_competitors',
  AUDIENCE: 'gs_intel_audience',
  IDEAS: 'gs_intel_ideas',
  CALENDAR: 'gs_intel_calendar',
  ALERTS: 'gs_intel_alerts',
  REPORTS: 'gs_intel_reports',
  SETTINGS: 'gs_intel_settings',
  SYNC_LOGS: 'gs_intel_sync_logs',
  AI_ANALYSES: 'gs_intel_ai_analyses',
  RESEARCH_INSIGHTS: 'gs_intel_research_insights',
  RESEARCH_RUNS: 'gs_intel_research_runs',
  TASKS: 'gs_intel_tasks'
};

/** Chave de armazenamento -> tipo de entidade (define o adaptador). Usado pelo backup. */
export const BACKUP_COLLECTIONS: Array<{ key: string; entity: Parameters<typeof storageFactory.getAdapter>[0] }> = [
  { key: KEYS.CLIENTS, entity: 'clients' },
  { key: KEYS.INSTAGRAM, entity: 'instagram_accounts' },
  { key: KEYS.SNAPSHOTS, entity: 'account_snapshots' },
  { key: KEYS.CONTENTS, entity: 'contents' },
  { key: KEYS.CONTENT_METRIC_SNAPSHOTS, entity: 'content_metric_snapshots' },
  { key: KEYS.COMPETITORS, entity: 'competitors' },
  { key: KEYS.AUDIENCE, entity: 'audience_insights' },
  { key: KEYS.IDEAS, entity: 'content_ideas' },
  { key: KEYS.CALENDAR, entity: 'calendar_items' },
  { key: KEYS.ALERTS, entity: 'alerts' },
  { key: KEYS.REPORTS, entity: 'reports' },
  { key: KEYS.SYNC_LOGS, entity: 'sync_logs' },
  { key: KEYS.AI_ANALYSES, entity: 'ai_analysis' },
  { key: KEYS.RESEARCH_INSIGHTS, entity: 'research_insights' },
  { key: KEYS.RESEARCH_RUNS, entity: 'research_runs' },
  { key: KEYS.TASKS, entity: 'tasks' }
];

const DEFAULT_SETTINGS: AppSettings = {
  instagramApiConfigured: false,
  aiApiConfigured: true,
  storageType: 'indexedDB',
  agencyName: 'Gabriel Speratti | Social Intelligence',
  ownerName: 'Gabriel Speratti',
  appMode: 'PRODUCTION'
};

export const storageService = {
  // CLIENTS
  clients: {
    getAll(): Client[] {
      const adapter = storageFactory.getAdapter('clients');
      return adapter.getCollection<Client>(KEYS.CLIENTS);
    },

    getById(id: string): Client | undefined {
      return this.getAll().find(c => c.id === id);
    },

    create(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Client {
      const now = new Date().toISOString();
      const newClient: Client = {
        ...clientData,
        id: clientData.id || `client-${generateUUID()}`,
        status: clientData.status || 'active',
        onboardingStep: clientData.onboardingStep || 1,
        healthStatus: clientData.healthStatus || 'not_connected',
        createdAt: now,
        updatedAt: now
      };

      const validated = ClientSchema.parse(newClient);
      const all = this.getAll();
      const adapter = storageFactory.getAdapter('clients');
      adapter.setCollection(KEYS.CLIENTS, [validated, ...all]);
      logger.info(`Client created: ${validated.name}`, { id: validated.id });
      return validated;
    },

    update(id: string, updates: Partial<Client>): Client | null {
      const all = this.getAll();
      const index = all.findIndex(c => c.id === id);
      if (index === -1) return null;

      const merged = {
        ...all[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const validated = ClientSchema.parse(merged);
      all[index] = validated;
      const adapter = storageFactory.getAdapter('clients');
      adapter.setCollection(KEYS.CLIENTS, all);
      logger.info(`Client updated: ${validated.name}`, { id });
      return validated;
    },

    delete(id: string): boolean {
      // FASE 17: Cascade delete guarantees zero orphan records!
      return storageService.deleteClientCascade(id);
    }
  },

  // INSTAGRAM ACCOUNTS
  instagram: {
    getAll(): InstagramAccount[] {
      const adapter = storageFactory.getAdapter('instagram_accounts');
      return adapter.getCollection<InstagramAccount>(KEYS.INSTAGRAM);
    },

    getByClientId(clientId: string): InstagramAccount | undefined {
      return this.getAll().find(acc => acc.clientId === clientId);
    },

    saveAccount(accountData: InstagramAccount): InstagramAccount {
      const validated = InstagramAccountSchema.parse(accountData);
      const all = this.getAll();
      const existingIndex = all.findIndex(acc => acc.clientId === validated.clientId);

      if (existingIndex >= 0) {
        all[existingIndex] = validated;
      } else {
        all.push(validated);
      }

      const adapter = storageFactory.getAdapter('instagram_accounts');
      adapter.setCollection(KEYS.INSTAGRAM, all);
      return validated;
    },

    remove(clientId: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(acc => acc.clientId !== clientId);
      if (filtered.length === all.length) return false;

      const adapter = storageFactory.getAdapter('instagram_accounts');
      adapter.setCollection(KEYS.INSTAGRAM, filtered);
      return true;
    }
  },

  // HISTORY / ACCOUNT SNAPSHOTS (Idempotent per clientId + date)
  history: {
    getAll(): AccountSnapshot[] {
      const adapter = storageFactory.getAdapter('account_snapshots');
      return adapter.getCollection<AccountSnapshot>(KEYS.SNAPSHOTS);
    },

    getByClient(clientId: string): AccountSnapshot[] {
      return this.getAll()
        .filter(s => s.clientId === clientId)
        .sort((a, b) => a.date.localeCompare(b.date));
    },

    getLatest(clientId: string): AccountSnapshot | null {
      const list = this.getByClient(clientId);
      if (list.length === 0) return null;
      return list[list.length - 1];
    },

    saveSnapshot(snapshotData: Omit<AccountSnapshot, 'id' | 'sourceTimestamp'> & { id?: string; sourceTimestamp?: string }): AccountSnapshot {
      const all = this.getAll();
      const existing = all.find(s => s.clientId === snapshotData.clientId && s.date === snapshotData.date);

      const snapshotToSave: AccountSnapshot = {
        ...snapshotData,
        id: existing ? existing.id : (snapshotData.id || `snap-${generateUUID()}`),
        sourceTimestamp: snapshotData.sourceTimestamp || new Date().toISOString()
      };

      const validated = AccountSnapshotSchema.parse(snapshotToSave);
      const existingIndex = all.findIndex(s => s.clientId === validated.clientId && s.date === validated.date);

      if (existingIndex >= 0) {
        all[existingIndex] = validated;
      } else {
        all.push(validated);
      }

      const adapter = storageFactory.getAdapter('account_snapshots');
      adapter.setCollection(KEYS.SNAPSHOTS, all);
      return validated;
    }
  },

  // CONTENTS & INGESTION
  contents: {
    getAll(): Content[] {
      const adapter = storageFactory.getAdapter('contents');
      return adapter.getCollection<Content>(KEYS.CONTENTS);
    },

    getByClient(clientId: string): Content[] {
      return this.getAll()
        .filter(c => c.clientId === clientId)
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    },

    getById(id: string): Content | undefined {
      return this.getAll().find(c => c.id === id);
    },

    create(contentData: Omit<Content, 'id'> & { id?: string }): Content {
      const now = new Date().toISOString();
      const newContent: Content = {
        ...contentData,
        id: contentData.id || `content-${generateUUID()}`,
        createdAt: contentData.createdAt || now,
        updatedAt: now
      };

      const validated = ContentSchema.parse(newContent);
      const all = this.getAll();
      const adapter = storageFactory.getAdapter('contents');
      adapter.setCollection(KEYS.CONTENTS, [validated, ...all]);
      return validated;
    },

    upsert(contentData: Omit<Content, 'id'> & { id?: string }): Content {
      const all = this.getAll();
      const existingIndex = contentData.instagramMediaId
        ? all.findIndex(c => c.clientId === contentData.clientId && c.instagramMediaId === contentData.instagramMediaId)
        : (contentData.id ? all.findIndex(c => c.id === contentData.id) : -1);

      const now = new Date().toISOString();
      if (existingIndex >= 0) {
        const merged: Content = {
          ...all[existingIndex],
          ...contentData,
          id: all[existingIndex].id,
          updatedAt: now
        };
        const validated = ContentSchema.parse(merged);
        all[existingIndex] = validated;
        const adapter = storageFactory.getAdapter('contents');
        adapter.setCollection(KEYS.CONTENTS, all);
        return validated;
      }

      return this.create(contentData);
    },

    update(id: string, updates: Partial<Content>): Content | null {
      const all = this.getAll();
      const index = all.findIndex(c => c.id === id);
      if (index === -1) return null;

      const merged = {
        ...all[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const validated = ContentSchema.parse(merged);
      all[index] = validated;
      const adapter = storageFactory.getAdapter('contents');
      adapter.setCollection(KEYS.CONTENTS, all);
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(c => c.id !== id);
      if (filtered.length === all.length) return false;

      const adapter = storageFactory.getAdapter('contents');
      adapter.setCollection(KEYS.CONTENTS, filtered);

      // Also clean associated metric snapshots
      storageService.contentMetrics.deleteByContentId(id);
      return true;
    }
  },

  // CONTENT METRIC SNAPSHOTS
  contentMetrics: {
    getAll(): ContentMetricSnapshot[] {
      const adapter = storageFactory.getAdapter('content_metric_snapshots');
      return adapter.getCollection<ContentMetricSnapshot>(KEYS.CONTENT_METRIC_SNAPSHOTS);
    },

    getByContentId(contentId: string): ContentMetricSnapshot[] {
      return this.getAll().filter(m => m.contentId === contentId);
    },

    saveSnapshot(snapshotData: Omit<ContentMetricSnapshot, 'id'>): ContentMetricSnapshot {
      const newItem: ContentMetricSnapshot = {
        ...snapshotData,
        id: `cms-${generateUUID()}`
      };

      const all = this.getAll();
      const adapter = storageFactory.getAdapter('content_metric_snapshots');
      adapter.setCollection(KEYS.CONTENT_METRIC_SNAPSHOTS, [newItem, ...all]);
      return newItem;
    },

    deleteByContentId(contentId: string): void {
      const all = this.getAll();
      const filtered = all.filter(m => m.contentId !== contentId);
      const adapter = storageFactory.getAdapter('content_metric_snapshots');
      adapter.setCollection(KEYS.CONTENT_METRIC_SNAPSHOTS, filtered);
    }
  },

  // COMPETITORS
  competitors: {
    getAll(): Competitor[] {
      const adapter = storageFactory.getAdapter('competitors');
      return adapter.getCollection<Competitor>(KEYS.COMPETITORS);
    },

    getByClient(clientId: string): Competitor[] {
      return this.getAll().filter(c => c.clientId === clientId);
    },

    create(competitorData: Omit<Competitor, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Competitor {
      const now = new Date().toISOString();
      const newItem: Competitor = {
        ...competitorData,
        id: competitorData.id || `comp-${generateUUID()}`,
        status: competitorData.status || 'candidate',
        createdAt: now,
        updatedAt: now
      };

      const validated = CompetitorSchema.parse(newItem);
      const all = this.getAll();
      const adapter = storageFactory.getAdapter('competitors');
      adapter.setCollection(KEYS.COMPETITORS, [validated, ...all]);
      return validated;
    },

    update(id: string, updates: Partial<Competitor>): Competitor | null {
      const all = this.getAll();
      const index = all.findIndex(c => c.id === id);
      if (index === -1) return null;

      const merged = {
        ...all[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const validated = CompetitorSchema.parse(merged);
      all[index] = validated;
      const adapter = storageFactory.getAdapter('competitors');
      adapter.setCollection(KEYS.COMPETITORS, all);
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(c => c.id !== id);
      if (filtered.length === all.length) return false;

      const adapter = storageFactory.getAdapter('competitors');
      adapter.setCollection(KEYS.COMPETITORS, filtered);
      return true;
    }
  },

  // AUDIENCE INSIGHTS
  audience: {
    getAll(): AudienceInsight[] {
      const adapter = storageFactory.getAdapter('audience_insights');
      return adapter.getCollection<AudienceInsight>(KEYS.AUDIENCE);
    },

    getByClient(clientId: string): AudienceInsight[] {
      return this.getAll().filter(a => a.clientId === clientId);
    },

    create(insightData: Omit<AudienceInsight, 'id' | 'createdAt'> & { id?: string }): AudienceInsight {
      const newItem: AudienceInsight = {
        ...insightData,
        id: insightData.id || `aud-${generateUUID()}`,
        createdAt: new Date().toISOString()
      };

      const validated = AudienceInsightSchema.parse(newItem);
      const all = this.getAll();
      const adapter = storageFactory.getAdapter('audience_insights');
      adapter.setCollection(KEYS.AUDIENCE, [validated, ...all]);
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(a => a.id !== id);
      if (filtered.length === all.length) return false;

      const adapter = storageFactory.getAdapter('audience_insights');
      adapter.setCollection(KEYS.AUDIENCE, filtered);
      return true;
    }
  },

  // CONTENT IDEAS
  ideas: {
    getAll(): ContentIdea[] {
      const adapter = storageFactory.getAdapter('content_ideas');
      return adapter.getCollection<ContentIdea>(KEYS.IDEAS);
    },

    getByClient(clientId: string): ContentIdea[] {
      return this.getAll().filter(i => i.clientId === clientId);
    },

    create(ideaData: Omit<ContentIdea, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): ContentIdea {
      const now = new Date().toISOString();
      const newItem: ContentIdea = {
        ...ideaData,
        id: ideaData.id || `idea-${generateUUID()}`,
        status: ideaData.status || 'IDEIA',
        notes: ideaData.notes || '',
        createdAt: now,
        updatedAt: now
      };

      const validated = ContentIdeaSchema.parse(newItem);
      const all = this.getAll();
      const adapter = storageFactory.getAdapter('content_ideas');
      adapter.setCollection(KEYS.IDEAS, [validated, ...all]);
      return validated;
    },

    update(id: string, updates: Partial<ContentIdea>): ContentIdea | null {
      const all = this.getAll();
      const index = all.findIndex(i => i.id === id);
      if (index === -1) return null;

      const merged = {
        ...all[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const validated = ContentIdeaSchema.parse(merged);
      all[index] = validated;
      const adapter = storageFactory.getAdapter('content_ideas');
      adapter.setCollection(KEYS.IDEAS, all);
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(i => i.id !== id);
      if (filtered.length === all.length) return false;

      const adapter = storageFactory.getAdapter('content_ideas');
      adapter.setCollection(KEYS.IDEAS, filtered);
      return true;
    }
  },

  // CALENDAR
  calendar: {
    getAll(): CalendarItem[] {
      const adapter = storageFactory.getAdapter('calendar_items');
      return adapter.getCollection<CalendarItem>(KEYS.CALENDAR);
    },

    getByClient(clientId: string): CalendarItem[] {
      return this.getAll()
        .filter(c => c.clientId === clientId)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    },

    saveItem(itemData: Omit<CalendarItem, 'id' | 'orderIndex'> & { id?: string; orderIndex?: number }): CalendarItem {
      const all = this.getAll();
      const id = itemData.id || `cal-${generateUUID()}`;

      let order = itemData.orderIndex;
      if (typeof order !== 'number') {
        const dayItems = all.filter(c => c.clientId === itemData.clientId && c.dayOfWeek === itemData.dayOfWeek);
        order = dayItems.length;
      }

      const newItem: CalendarItem = {
        ...itemData,
        id,
        orderIndex: order
      };

      const validated = CalendarItemSchema.parse(newItem);
      const existingIndex = all.findIndex(c => c.id === validated.id);

      if (existingIndex >= 0) {
        all[existingIndex] = validated;
      } else {
        all.push(validated);
      }

      const adapter = storageFactory.getAdapter('calendar_items');
      adapter.setCollection(KEYS.CALENDAR, all);
      return validated;
    },

    reorderItems(clientId: string, items: CalendarItem[]): void {
      const all = this.getAll().filter(c => c.clientId !== clientId);
      const adapter = storageFactory.getAdapter('calendar_items');
      adapter.setCollection(KEYS.CALENDAR, [...all, ...items]);
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(c => c.id !== id);
      if (filtered.length === all.length) return false;

      const adapter = storageFactory.getAdapter('calendar_items');
      adapter.setCollection(KEYS.CALENDAR, filtered);
      return true;
    }
  },

  // ALERTS
  alerts: {
    getAll(): Alert[] {
      const adapter = storageFactory.getAdapter('alerts');
      return adapter.getCollection<Alert>(KEYS.ALERTS);
    },

    getByClient(clientId: string): Alert[] {
      return this.getAll().filter(a => a.clientId === clientId);
    },

    create(alertData: Omit<Alert, 'id' | 'createdAt'>): Alert {
      const newItem: Alert = {
        ...alertData,
        id: `alert-${generateUUID()}`,
        status: alertData.status || 'NEW',
        createdAt: new Date().toISOString()
      };

      const validated = AlertSchema.parse(newItem);
      const all = this.getAll();
      const adapter = storageFactory.getAdapter('alerts');
      adapter.setCollection(KEYS.ALERTS, [validated, ...all]);
      return validated;
    },

    update(id: string, updates: Partial<Alert>): Alert | null {
      const all = this.getAll();
      const index = all.findIndex(a => a.id === id);
      if (index === -1) return null;

      const merged = { ...all[index], ...updates };
      const validated = AlertSchema.parse(merged);
      all[index] = validated;
      const adapter = storageFactory.getAdapter('alerts');
      adapter.setCollection(KEYS.ALERTS, all);
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(a => a.id !== id);
      if (filtered.length === all.length) return false;

      const adapter = storageFactory.getAdapter('alerts');
      adapter.setCollection(KEYS.ALERTS, filtered);
      return true;
    }
  },

  // REPORTS
  reports: {
    getAll(): Report[] {
      const adapter = storageFactory.getAdapter('reports');
      return adapter.getCollection<Report>(KEYS.REPORTS);
    },

    getByClient(clientId: string): Report[] {
      return this.getAll().filter(r => r.clientId === clientId);
    },

    create(reportData: Omit<Report, 'id' | 'generatedAt'>): Report {
      const newItem: Report = {
        ...reportData,
        id: `rep-${generateUUID()}`,
        generatedAt: new Date().toISOString()
      };

      const validated = ReportSchema.parse(newItem);
      const all = this.getAll();
      const adapter = storageFactory.getAdapter('reports');
      adapter.setCollection(KEYS.REPORTS, [validated, ...all]);
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(r => r.id !== id);
      if (filtered.length === all.length) return false;

      const adapter = storageFactory.getAdapter('reports');
      adapter.setCollection(KEYS.REPORTS, filtered);
      return true;
    }
  },

  // SYNC LOGS (Audit & Provenance)
  syncLogs: {
    getAll(): SyncLog[] {
      const adapter = storageFactory.getAdapter('sync_logs');
      return adapter.getCollection<SyncLog>(KEYS.SYNC_LOGS);
    },

    getByClient(clientId: string): SyncLog[] {
      return this.getAll()
        .filter(l => l.clientId === clientId)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    },

    create(logData: Omit<SyncLog, 'id'>): SyncLog {
      const newItem: SyncLog = {
        ...logData,
        id: `sync-${generateUUID()}`
      };
      const validated = SyncLogSchema.parse(newItem);
      const all = this.getAll();
      const adapter = storageFactory.getAdapter('sync_logs');
      adapter.setCollection(KEYS.SYNC_LOGS, [validated, ...all]);
      return validated;
    }
  },

  // AI ANALYSES AUDIT
  aiAnalyses: {
    getAll(): AIAnalysis[] {
      const adapter = storageFactory.getAdapter('ai_analysis');
      return adapter.getCollection<AIAnalysis>(KEYS.AI_ANALYSES);
    },

    getByClient(clientId: string): AIAnalysis[] {
      return this.getAll()
        .filter(a => a.clientId === clientId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    create(analysisData: Omit<AIAnalysis, 'id' | 'createdAt'>): AIAnalysis {
      const newItem: AIAnalysis = {
        ...analysisData,
        id: `ai-audit-${generateUUID()}`,
        createdAt: new Date().toISOString()
      };
      const validated = AIAnalysisRecordSchema.parse(newItem);
      const all = this.getAll();
      const adapter = storageFactory.getAdapter('ai_analysis');
      adapter.setCollection(KEYS.AI_ANALYSES, [validated, ...all]);
      return validated as AIAnalysis;
    }
  },

  // RESEARCH INSIGHTS & RUNS
  research: {
    getInsights(clientId: string): ResearchInsight[] {
      const adapter = storageFactory.getAdapter('research_insights');
      return adapter.getCollection<ResearchInsight>(KEYS.RESEARCH_INSIGHTS).filter(r => r.clientId === clientId);
    },

    saveInsight(insightData: Omit<ResearchInsight, 'id' | 'retrievedAt'>): ResearchInsight {
      const newItem: ResearchInsight = {
        ...insightData,
        id: `res-${generateUUID()}`,
        retrievedAt: new Date().toISOString()
      };
      const validated = ResearchInsightSchema.parse(newItem);
      const all = storageFactory.getAdapter('research_insights').getCollection<ResearchInsight>(KEYS.RESEARCH_INSIGHTS);
      storageFactory.getAdapter('research_insights').setCollection(KEYS.RESEARCH_INSIGHTS, [validated, ...all]);
      return validated;
    }
  },

  // APP SETTINGS
  settings: {
    get(): AppSettings {
      return defaultStorageAdapter.get<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
    },

    update(updates: Partial<AppSettings>): AppSettings {
      const current = this.get();
      const updated = { ...current, ...updates };
      defaultStorageAdapter.set(KEYS.SETTINGS, updated);
      return updated;
    }
  },

  // CRM DE ENTREGAS (Minhas tarefas)
  tasks: {
    getAll(): DeliveryTask[] {
      return storageFactory
        .getAdapter('tasks')
        .getCollection<DeliveryTask>(KEYS.TASKS)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    },

    save(data: Omit<DeliveryTask, 'id' | 'createdAt' | 'updatedAt' | 'orderIndex' | 'checklist'> & Partial<Pick<DeliveryTask, 'id' | 'createdAt' | 'orderIndex' | 'checklist'>>): DeliveryTask {
      const all = this.getAll();
      const now = new Date().toISOString();
      const existing = data.id ? all.find((t) => t.id === data.id) : undefined;
      const status = data.status ?? 'todo';
      const task = DeliveryTaskSchema.parse({
        ...existing,
        ...data,
        id: existing?.id ?? `task-${generateUUID()}`,
        clientId: data.clientId || undefined,
        dueDate: data.dueDate || undefined,
        checklist: data.checklist ?? existing?.checklist ?? [],
        orderIndex: data.orderIndex ?? existing?.orderIndex ?? all.filter((t) => t.status === status).length,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        completedAt: status === 'done' ? existing?.completedAt ?? now : undefined
      }) as DeliveryTask;
      const next = existing ? all.map((t) => (t.id === task.id ? task : t)) : [...all, task];
      storageFactory.getAdapter('tasks').setCollection(KEYS.TASKS, next);
      return task;
    },

    /** Move a tarefa para outra etapa (posição no fim da coluna ou antes de `beforeId`). */
    move(id: string, status: TaskStatus, beforeId?: string): void {
      const all = this.getAll();
      const task = all.find((t) => t.id === id);
      if (!task) return;
      const column = all.filter((t) => t.status === status && t.id !== id);
      const index = beforeId ? Math.max(0, column.findIndex((t) => t.id === beforeId)) : column.length;
      column.splice(index, 0, task);
      const now = new Date().toISOString();
      const reordered = new Map(column.map((t, i) => [t.id, i]));
      const next = all.map((t) => {
        if (t.id === id) {
          return { ...t, status, orderIndex: reordered.get(id) ?? 0, updatedAt: now, completedAt: status === 'done' ? t.completedAt ?? now : undefined };
        }
        return reordered.has(t.id) ? { ...t, orderIndex: reordered.get(t.id) ?? t.orderIndex } : t;
      });
      storageFactory.getAdapter('tasks').setCollection(KEYS.TASKS, next);
    },

    delete(id: string): void {
      storageFactory.getAdapter('tasks').setCollection(KEYS.TASKS, this.getAll().filter((t) => t.id !== id));
    }
  },

  // CASCADE DELETE GUARANTEE (FASE 17)
  deleteClientCascade(clientId: string): boolean {
    logger.warn(`Executing complete cascade delete for client ${clientId}...`);

    // 1. Delete Client
    const clients = this.clients.getAll().filter(c => c.id !== clientId);
    storageFactory.getAdapter('clients').setCollection(KEYS.CLIENTS, clients);

    // 2. Delete Instagram account
    this.instagram.remove(clientId);

    // 3. Delete Snapshots
    const snapshots = this.history.getAll().filter(s => s.clientId !== clientId);
    storageFactory.getAdapter('account_snapshots').setCollection(KEYS.SNAPSHOTS, snapshots);

    // 4. Delete Contents and their metric snapshots
    const clientContents = this.contents.getByClient(clientId);
    clientContents.forEach(c => this.contentMetrics.deleteByContentId(c.id));
    const contents = this.contents.getAll().filter(c => c.clientId !== clientId);
    storageFactory.getAdapter('contents').setCollection(KEYS.CONTENTS, contents);

    // 5. Delete Competitors
    const competitors = this.competitors.getAll().filter(c => c.clientId !== clientId);
    storageFactory.getAdapter('competitors').setCollection(KEYS.COMPETITORS, competitors);

    // 6. Delete Audience Insights
    const audience = this.audience.getAll().filter(a => a.clientId !== clientId);
    storageFactory.getAdapter('audience_insights').setCollection(KEYS.AUDIENCE, audience);

    // 7. Delete Ideas
    const ideas = this.ideas.getAll().filter(i => i.clientId !== clientId);
    storageFactory.getAdapter('content_ideas').setCollection(KEYS.IDEAS, ideas);

    // 8. Delete Calendar
    const calendar = this.calendar.getAll().filter(c => c.clientId !== clientId);
    storageFactory.getAdapter('calendar_items').setCollection(KEYS.CALENDAR, calendar);

    // 9. Delete Alerts
    const alerts = this.alerts.getAll().filter(a => a.clientId !== clientId);
    storageFactory.getAdapter('alerts').setCollection(KEYS.ALERTS, alerts);

    // 10. Delete Reports
    const reports = this.reports.getAll().filter(r => r.clientId !== clientId);
    storageFactory.getAdapter('reports').setCollection(KEYS.REPORTS, reports);

    // 11. Delete Sync Logs
    const syncLogs = this.syncLogs.getAll().filter(l => l.clientId !== clientId);
    storageFactory.getAdapter('sync_logs').setCollection(KEYS.SYNC_LOGS, syncLogs);

    // 12. Delete AI Analyses
    const aiAnalyses = this.aiAnalyses.getAll().filter(a => a.clientId !== clientId);
    storageFactory.getAdapter('ai_analysis').setCollection(KEYS.AI_ANALYSES, aiAnalyses);

    // 13. Delete Research
    const research = storageFactory.getAdapter('research_insights').getCollection<ResearchInsight>(KEYS.RESEARCH_INSIGHTS).filter(r => r.clientId !== clientId);
    storageFactory.getAdapter('research_insights').setCollection(KEYS.RESEARCH_INSIGHTS, research);

    // 14. Delete Tasks (CRM de entregas)
    storageFactory.getAdapter('tasks').setCollection(KEYS.TASKS, this.tasks.getAll().filter(t => t.clientId !== clientId));

    logger.info(`Cascade delete completed cleanly for client ${clientId}.`);
    return true;
  },

  // DEMO DATA SEEDING / CLEARING (Only via DemoProvider)
  isDemoLoaded(): boolean {
    return DemoProvider.isDemoActive();
  },

  seedDemoData(): void {
    logger.info('Activating DEMO mode and seeding mock data via DemoProvider...');
    DemoProvider.enableDemoMode();

    const existing = this.clients.getById(DemoProvider.getDemoClientId());
    if (!existing) {
      this.clients.create(DemoProvider.getDemoClient());
    }

    this.instagram.saveAccount(DemoProvider.getDemoInstagram());

    const snapshots = DemoProvider.getDemoSnapshots();
    snapshots.forEach(s => this.history.saveSnapshot(s));

    const contents = DemoProvider.getDemoContents();
    contents.forEach(c => {
      if (!this.contents.getAll().some(item => item.id === c.id)) {
        this.contents.create(c);
      }
    });

    const competitors = DemoProvider.getDemoCompetitors();
    competitors.forEach(comp => {
      if (!this.competitors.getAll().some(c => c.id === comp.id)) {
        this.competitors.create(comp);
      }
    });

    const audience = DemoProvider.getDemoAudience();
    audience.forEach(aud => {
      if (!this.audience.getAll().some(a => a.id === aud.id)) {
        this.audience.create(aud);
      }
    });

    const ideas = DemoProvider.getDemoIdeas();
    ideas.forEach(i => {
      if (!this.ideas.getAll().some(item => item.id === i.id)) {
        this.ideas.create(i);
      }
    });

    const calendar = DemoProvider.getDemoCalendar();
    calendar.forEach(cal => {
      this.calendar.saveItem(cal);
    });

    const alerts = DemoProvider.getDemoAlerts();
    alerts.forEach(al => {
      if (!this.alerts.getAll().some(a => a.id === al.id)) {
        this.alerts.create(al);
      }
    });

    this.settings.update({ appMode: 'DEMO' });
  },

  clearDemoData(): void {
    logger.info('Deactivating DEMO mode and isolating production state...');
    const demoId = DemoProvider.getDemoClientId();
    this.deleteClientCascade(demoId);
    DemoProvider.disableDemoMode();
    this.settings.update({ appMode: 'PRODUCTION' });
  },

  clearAllData(): void {
    logger.warn('Explicit reset requested: wiping all records.');
    storageFactory.getAdapter('clients').clear();
    storageFactory.getAdapter('contents').clear();
    defaultStorageAdapter.clear();
  }
};
