/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Storage Service - Decoupled Persistence Layer
 * 
 * Strict rule: All data operations route through StorageAdapter.
 * Zod schemas validate data integrity.
 * Snapshots are immutable per date (updates same date, never overwrites past days).
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
  AppSettings
} from '../types';
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
  ReportSchema
} from '../schemas';
import { logger } from '../utils/logger';

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
  SETTINGS: 'gs_intel_settings'
};

const DEFAULT_SETTINGS: AppSettings = {
  instagramApiConfigured: false,
  aiApiConfigured: true,
  storageType: 'localStorage',
  agencyName: 'Gabriel Speratti | Social Intelligence',
  ownerName: 'Gabriel Speratti',
  appMode: 'PRODUCTION'
};

export const storageService = {
  // CLIENTS
  clients: {
    getAll(): Client[] {
      return defaultStorageAdapter.getCollection<Client>(KEYS.CLIENTS);
    },

    getById(id: string): Client | undefined {
      return this.getAll().find(c => c.id === id);
    },

    create(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Client {
      const now = new Date().toISOString();
      const newClient: Client = {
        ...clientData,
        id: clientData.id || `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        status: clientData.status || 'active',
        onboardingStep: clientData.onboardingStep || 1,
        healthStatus: clientData.healthStatus || 'not_connected',
        createdAt: now,
        updatedAt: now
      };

      const validated = ClientSchema.parse(newClient);
      const all = this.getAll();
      defaultStorageAdapter.setCollection(KEYS.CLIENTS, [validated, ...all]);
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
      defaultStorageAdapter.setCollection(KEYS.CLIENTS, all);
      logger.info(`Client updated: ${validated.name}`, { id });
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(c => c.id !== id);
      if (filtered.length === all.length) return false;

      defaultStorageAdapter.setCollection(KEYS.CLIENTS, filtered);
      logger.info(`Client deleted`, { id });
      return true;
    }
  },

  // INSTAGRAM ACCOUNTS
  instagram: {
    getAll(): InstagramAccount[] {
      return defaultStorageAdapter.getCollection<InstagramAccount>(KEYS.INSTAGRAM);
    },

    getAccount(clientId: string): InstagramAccount | null {
      const accounts = this.getAll();
      return accounts.find(a => a.clientId === clientId) || null;
    },

    saveAccount(account: InstagramAccount): void {
      const validated = InstagramAccountSchema.parse(account);
      const accounts = this.getAll();
      const index = accounts.findIndex(a => a.clientId === account.clientId);

      if (index >= 0) {
        accounts[index] = validated;
      } else {
        accounts.push(validated);
      }

      defaultStorageAdapter.setCollection(KEYS.INSTAGRAM, accounts);
      logger.info(`Instagram account saved for client ${account.clientId}`, { status: account.status });
    }
  },

  // SNAPSHOTS (ACCOUNT METRICS OVER TIME)
  history: {
    getAll(): AccountSnapshot[] {
      return defaultStorageAdapter.getCollection<AccountSnapshot>(KEYS.SNAPSHOTS);
    },

    getByClient(clientId: string): AccountSnapshot[] {
      return this.getAll()
        .filter(s => s.clientId === clientId)
        .sort((a, b) => a.date.localeCompare(b.date));
    },

    /**
     * Prevents duplicate snapshots for the same clientId + date.
     * If snapshot exists for this day, update it. Never overwrite past days.
     */
    saveSnapshot(snapshotData: Omit<AccountSnapshot, 'id'> & { id?: string }): AccountSnapshot {
      const all = this.getAll();
      const existingIndex = all.findIndex(
        s => s.clientId === snapshotData.clientId && s.date === snapshotData.date
      );

      let finalSnapshot: AccountSnapshot;

      if (existingIndex >= 0) {
        // Update snapshot for today
        finalSnapshot = {
          ...all[existingIndex],
          ...snapshotData,
          sourceTimestamp: new Date().toISOString()
        };
        const validated = AccountSnapshotSchema.parse(finalSnapshot);
        all[existingIndex] = validated;
        defaultStorageAdapter.setCollection(KEYS.SNAPSHOTS, all);
        logger.info(`Updated existing snapshot for ${snapshotData.clientId} on date ${snapshotData.date}`);
        return validated;
      } else {
        // Create new snapshot
        finalSnapshot = {
          ...snapshotData,
          id: snapshotData.id || `snap-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          sourceTimestamp: new Date().toISOString()
        };
        const validated = AccountSnapshotSchema.parse(finalSnapshot);
        defaultStorageAdapter.setCollection(KEYS.SNAPSHOTS, [...all, validated]);
        logger.info(`Recorded new snapshot for ${snapshotData.clientId} on date ${snapshotData.date}`);
        return validated;
      }
    }
  },

  // CONTENTS & CONTENT METRICS
  contents: {
    getAll(): Content[] {
      return defaultStorageAdapter.getCollection<Content>(KEYS.CONTENTS);
    },

    getByClient(clientId: string): Content[] {
      return this.getAll()
        .filter(c => c.clientId === clientId)
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    },

    create(contentData: Omit<Content, 'id'> & { id?: string }): Content {
      const newItem: Content = {
        ...contentData,
        id: contentData.id || `content-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
      };

      const validated = ContentSchema.parse(newItem);
      const all = this.getAll();
      defaultStorageAdapter.setCollection(KEYS.CONTENTS, [validated, ...all]);
      return validated;
    },

    update(id: string, updates: Partial<Content>): Content | null {
      const all = this.getAll();
      const index = all.findIndex(c => c.id === id);
      if (index === -1) return null;

      const merged = { ...all[index], ...updates };
      const validated = ContentSchema.parse(merged);
      all[index] = validated;
      defaultStorageAdapter.setCollection(KEYS.CONTENTS, all);
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(c => c.id !== id);
      if (filtered.length === all.length) return false;

      defaultStorageAdapter.setCollection(KEYS.CONTENTS, filtered);
      return true;
    },

    recordMetricSnapshot(contentId: string, metrics: Content['metrics'], source: AccountSnapshot['source']): void {
      const snapshot: ContentMetricSnapshot = {
        id: `cms-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        contentId,
        timestamp: new Date().toISOString(),
        views: metrics.views,
        reach: metrics.reach,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves,
        profileActivity: 0,
        engagementRate: metrics.engagementRate,
        source
      };

      const all = defaultStorageAdapter.getCollection<ContentMetricSnapshot>(KEYS.CONTENT_METRIC_SNAPSHOTS);
      defaultStorageAdapter.setCollection(KEYS.CONTENT_METRIC_SNAPSHOTS, [snapshot, ...all]);
    }
  },

  // COMPETITORS
  competitors: {
    getAll(): Competitor[] {
      return defaultStorageAdapter.getCollection<Competitor>(KEYS.COMPETITORS);
    },

    getByClient(clientId: string): Competitor[] {
      return this.getAll().filter(c => c.clientId === clientId);
    },

    create(compData: Omit<Competitor, 'id' | 'createdAt' | 'updatedAt'>): Competitor {
      const now = new Date().toISOString();
      const newItem: Competitor = {
        ...compData,
        id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: now,
        updatedAt: now
      };

      const validated = CompetitorSchema.parse(newItem);
      const all = this.getAll();
      defaultStorageAdapter.setCollection(KEYS.COMPETITORS, [validated, ...all]);
      return validated;
    },

    update(id: string, updates: Partial<Competitor>): Competitor | null {
      const all = this.getAll();
      const index = all.findIndex(c => c.id === id);
      if (index === -1) return null;

      const merged = { ...all[index], ...updates, updatedAt: new Date().toISOString() };
      const validated = CompetitorSchema.parse(merged);
      all[index] = validated;
      defaultStorageAdapter.setCollection(KEYS.COMPETITORS, all);
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(c => c.id !== id);
      if (filtered.length === all.length) return false;

      defaultStorageAdapter.setCollection(KEYS.COMPETITORS, filtered);
      return true;
    }
  },

  // AUDIENCE RESEARCH
  audience: {
    getAll(): AudienceInsight[] {
      return defaultStorageAdapter.getCollection<AudienceInsight>(KEYS.AUDIENCE);
    },

    getByClient(clientId: string): AudienceInsight[] {
      return this.getAll().filter(a => a.clientId === clientId);
    },

    create(insightData: Omit<AudienceInsight, 'id' | 'createdAt'>): AudienceInsight {
      const newItem: AudienceInsight = {
        ...insightData,
        id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: new Date().toISOString()
      };

      const validated = AudienceInsightSchema.parse(newItem);
      const all = this.getAll();
      defaultStorageAdapter.setCollection(KEYS.AUDIENCE, [validated, ...all]);
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(a => a.id !== id);
      if (filtered.length === all.length) return false;

      defaultStorageAdapter.setCollection(KEYS.AUDIENCE, filtered);
      return true;
    }
  },

  // IDEAS
  ideas: {
    getAll(): ContentIdea[] {
      return defaultStorageAdapter.getCollection<ContentIdea>(KEYS.IDEAS);
    },

    getByClient(clientId: string): ContentIdea[] {
      return this.getAll().filter(i => i.clientId === clientId);
    },

    create(ideaData: Omit<ContentIdea, 'id' | 'createdAt' | 'updatedAt'>): ContentIdea {
      const now = new Date().toISOString();
      const newItem: ContentIdea = {
        ...ideaData,
        id: `idea-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: now,
        updatedAt: now
      };

      const validated = ContentIdeaSchema.parse(newItem);
      const all = this.getAll();
      defaultStorageAdapter.setCollection(KEYS.IDEAS, [validated, ...all]);
      return validated;
    },

    update(id: string, updates: Partial<ContentIdea>): ContentIdea | null {
      const all = this.getAll();
      const index = all.findIndex(i => i.id === id);
      if (index === -1) return null;

      const merged = { ...all[index], ...updates, updatedAt: new Date().toISOString() };
      const validated = ContentIdeaSchema.parse(merged);
      all[index] = validated;
      defaultStorageAdapter.setCollection(KEYS.IDEAS, all);
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(i => i.id !== id);
      if (filtered.length === all.length) return false;

      defaultStorageAdapter.setCollection(KEYS.IDEAS, filtered);
      return true;
    }
  },

  // CALENDAR
  calendar: {
    getAll(): CalendarItem[] {
      return defaultStorageAdapter.getCollection<CalendarItem>(KEYS.CALENDAR);
    },

    getByClient(clientId: string): CalendarItem[] {
      return this.getAll()
        .filter(c => c.clientId === clientId)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    },

    saveItem(itemData: Omit<CalendarItem, 'id' | 'orderIndex'> & { id?: string; orderIndex?: number }): CalendarItem {
      const all = this.getAll();
      const id = itemData.id || `cal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const existingIndex = all.findIndex(c => c.id === id);

      const item: CalendarItem = {
        ...itemData,
        id,
        orderIndex: itemData.orderIndex ?? (existingIndex >= 0 ? all[existingIndex].orderIndex : all.length)
      };

      const validated = CalendarItemSchema.parse(item);

      if (existingIndex >= 0) {
        all[existingIndex] = validated;
      } else {
        all.push(validated);
      }

      defaultStorageAdapter.setCollection(KEYS.CALENDAR, all);
      return validated;
    },

    deleteItem(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(c => c.id !== id);
      if (filtered.length === all.length) return false;

      defaultStorageAdapter.setCollection(KEYS.CALENDAR, filtered);
      return true;
    },

    reorderItems(clientId: string, items: CalendarItem[]): void {
      const otherItems = this.getAll().filter(c => c.clientId !== clientId);
      const reindexed = items.map((item, idx) => ({
        ...item,
        orderIndex: idx
      }));

      defaultStorageAdapter.setCollection(KEYS.CALENDAR, [...otherItems, ...reindexed]);
    }
  },

  // ALERTS
  alerts: {
    getAll(): Alert[] {
      return defaultStorageAdapter.getCollection<Alert>(KEYS.ALERTS);
    },

    getByClient(clientId: string): Alert[] {
      return this.getAll().filter(a => a.clientId === clientId);
    },

    create(alertData: Omit<Alert, 'id' | 'createdAt'>): Alert {
      const newItem: Alert = {
        ...alertData,
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        status: alertData.status || 'NEW',
        createdAt: new Date().toISOString()
      };

      const validated = AlertSchema.parse(newItem);
      const all = this.getAll();
      defaultStorageAdapter.setCollection(KEYS.ALERTS, [validated, ...all]);
      return validated;
    },

    update(id: string, updates: Partial<Alert>): Alert | null {
      const all = this.getAll();
      const index = all.findIndex(a => a.id === id);
      if (index === -1) return null;

      const merged = { ...all[index], ...updates };
      const validated = AlertSchema.parse(merged);
      all[index] = validated;
      defaultStorageAdapter.setCollection(KEYS.ALERTS, all);
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(a => a.id !== id);
      if (filtered.length === all.length) return false;

      defaultStorageAdapter.setCollection(KEYS.ALERTS, filtered);
      return true;
    }
  },

  // REPORTS
  reports: {
    getAll(): Report[] {
      return defaultStorageAdapter.getCollection<Report>(KEYS.REPORTS);
    },

    getByClient(clientId: string): Report[] {
      return this.getAll().filter(r => r.clientId === clientId);
    },

    create(reportData: Omit<Report, 'id' | 'generatedAt'>): Report {
      const newItem: Report = {
        ...reportData,
        id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        generatedAt: new Date().toISOString()
      };

      const validated = ReportSchema.parse(newItem);
      const all = this.getAll();
      defaultStorageAdapter.setCollection(KEYS.REPORTS, [validated, ...all]);
      return validated;
    },

    delete(id: string): boolean {
      const all = this.getAll();
      const filtered = all.filter(r => r.id !== id);
      if (filtered.length === all.length) return false;

      defaultStorageAdapter.setCollection(KEYS.REPORTS, filtered);
      return true;
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

  // DEMO DATA SEEDING / CLEARING (Only via DemoProvider)
  isDemoLoaded(): boolean {
    return DemoProvider.isDemoActive();
  },

  seedDemoData(): void {
    logger.info('Activating DEMO mode and seeding mock data via DemoProvider...');
    DemoProvider.enableDemoMode();

    // Check if demo client already exists
    const existing = this.clients.getById(DemoProvider.getDemoClientId());
    if (!existing) {
      this.clients.create(DemoProvider.getDemoClient());
    }

    this.instagram.saveAccount(DemoProvider.getDemoInstagram());

    // Seed snapshots
    const snapshots = DemoProvider.getDemoSnapshots();
    snapshots.forEach(s => this.history.saveSnapshot(s));

    // Seed contents
    const contents = DemoProvider.getDemoContents();
    contents.forEach(c => {
      if (!this.contents.getAll().some(item => item.id === c.id)) {
        this.contents.create(c);
      }
    });

    // Seed competitors
    const competitors = DemoProvider.getDemoCompetitors();
    competitors.forEach(comp => {
      if (!this.competitors.getAll().some(c => c.id === comp.id)) {
        this.competitors.create(comp);
      }
    });

    // Seed audience
    const audience = DemoProvider.getDemoAudience();
    audience.forEach(aud => {
      if (!this.audience.getAll().some(a => a.id === aud.id)) {
        this.audience.create(aud);
      }
    });

    // Seed ideas
    const ideas = DemoProvider.getDemoIdeas();
    ideas.forEach(i => {
      if (!this.ideas.getAll().some(item => item.id === i.id)) {
        this.ideas.create(i);
      }
    });

    // Seed calendar
    const calendar = DemoProvider.getDemoCalendar();
    calendar.forEach(cal => {
      this.calendar.saveItem(cal);
    });

    // Seed alerts
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

    defaultStorageAdapter.setCollection(KEYS.CLIENTS, this.clients.getAll().filter(c => c.id !== demoId));
    defaultStorageAdapter.setCollection(KEYS.SNAPSHOTS, this.history.getAll().filter(s => s.clientId !== demoId));
    defaultStorageAdapter.setCollection(KEYS.CONTENTS, this.contents.getAll().filter(c => c.clientId !== demoId));
    defaultStorageAdapter.setCollection(KEYS.COMPETITORS, this.competitors.getAll().filter(c => c.clientId !== demoId));
    defaultStorageAdapter.setCollection(KEYS.AUDIENCE, this.audience.getAll().filter(a => a.clientId !== demoId));
    defaultStorageAdapter.setCollection(KEYS.IDEAS, this.ideas.getAll().filter(i => i.clientId !== demoId));
    defaultStorageAdapter.setCollection(KEYS.CALENDAR, this.calendar.getAll().filter(c => c.clientId !== demoId));
    defaultStorageAdapter.setCollection(KEYS.ALERTS, this.alerts.getAll().filter(a => a.clientId !== demoId));

    DemoProvider.disableDemoMode();
    this.settings.update({ appMode: 'PRODUCTION' });
  },

  clearAllData(): void {
    logger.warn('Explicit reset requested by user: wiping all local storage records.');
    defaultStorageAdapter.clear();
  }
};
