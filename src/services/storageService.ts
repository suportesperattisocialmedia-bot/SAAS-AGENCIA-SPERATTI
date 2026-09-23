/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Storage Service - Desacoplado para persistência Local e futura migração para Supabase/PostgreSQL
 */

import {
  Client,
  InstagramAccount,
  MetricSnapshot,
  Content,
  Competitor,
  AudienceInsight,
  ContentIdea,
  CalendarItem,
  Alert,
  Report,
  AppSettings
} from '../types';
import {
  DEMO_CLIENT_RAVI,
  DEMO_INSTAGRAM_ACCOUNT,
  generateDemoSnapshots,
  DEMO_CONTENTS,
  DEMO_COMPETITORS,
  DEMO_AUDIENCE_INSIGHTS,
  DEMO_IDEAS,
  DEMO_CALENDAR_ITEMS,
  DEMO_ALERTS
} from '../data/mockData';

const KEYS = {
  CLIENTS: 'gs_intel_clients',
  INSTAGRAM: 'gs_intel_instagram',
  SNAPSHOTS: 'gs_intel_snapshots',
  CONTENTS: 'gs_intel_contents',
  COMPETITORS: 'gs_intel_competitors',
  AUDIENCE: 'gs_intel_audience',
  IDEAS: 'gs_intel_ideas',
  CALENDAR: 'gs_intel_calendar',
  ALERTS: 'gs_intel_alerts',
  REPORTS: 'gs_intel_reports',
  SETTINGS: 'gs_intel_settings',
  DEMO_FLAG: 'gs_intel_demo_seeded'
};

function readItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[StorageService] Error reading key ${key}:`, err);
    return fallback;
  }
}

function writeItem<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`[StorageService] Error writing key ${key}:`, err);
  }
}

export const storageService = {
  // CLIENTS REPOSITORY
  clients: {
    getAll(): Client[] {
      return readItem<Client[]>(KEYS.CLIENTS, []);
    },
    getById(id: string): Client | undefined {
      const all = storageService.clients.getAll();
      return all.find(c => c.id === id);
    },
    create(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Client {
      const all = storageService.clients.getAll();
      const newClient: Client = {
        ...data,
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      writeItem(KEYS.CLIENTS, [newClient, ...all]);
      return newClient;
    },
    update(id: string, updates: Partial<Client>): Client | null {
      const all = storageService.clients.getAll();
      const idx = all.findIndex(c => c.id === id);
      if (idx === -1) return null;
      const updated: Client = {
        ...all[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      all[idx] = updated;
      writeItem(KEYS.CLIENTS, all);
      return updated;
    },
    duplicate(id: string): Client | null {
      const client = storageService.clients.getById(id);
      if (!client) return null;
      const duplicated: Client = {
        ...client,
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: `${client.name} (Cópia)`,
        company: `${client.company} (Cópia)`,
        instagram: `${client.instagram}_copia`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const all = storageService.clients.getAll();
      writeItem(KEYS.CLIENTS, [duplicated, ...all]);
      return duplicated;
    },
    delete(id: string): boolean {
      const all = storageService.clients.getAll();
      const filtered = all.filter(c => c.id !== id);
      writeItem(KEYS.CLIENTS, filtered);
      // Clean up linked data
      const contents = storageService.contents.getAll().filter(c => c.clientId !== id);
      writeItem(KEYS.CONTENTS, contents);
      const competitors = storageService.competitors.getAll().filter(c => c.clientId !== id);
      writeItem(KEYS.COMPETITORS, competitors);
      const ideas = storageService.ideas.getAll().filter(i => i.clientId !== id);
      writeItem(KEYS.IDEAS, ideas);
      const calendar = storageService.calendar.getAll().filter(i => i.clientId !== id);
      writeItem(KEYS.CALENDAR, calendar);
      const snapshots = storageService.history.getAll().filter(s => s.clientId !== id);
      writeItem(KEYS.SNAPSHOTS, snapshots);
      const audience = storageService.audience.getAll().filter(a => a.clientId !== id);
      writeItem(KEYS.AUDIENCE, audience);
      return true;
    }
  },

  // INSTAGRAM ACCOUNTS
  instagram: {
    getByClient(clientId: string): InstagramAccount | null {
      const all = readItem<Record<string, InstagramAccount>>(KEYS.INSTAGRAM, {});
      return all[clientId] || null;
    },
    save(account: InstagramAccount): void {
      const all = readItem<Record<string, InstagramAccount>>(KEYS.INSTAGRAM, {});
      all[account.clientId] = account;
      writeItem(KEYS.INSTAGRAM, all);
    },
    disconnect(clientId: string): void {
      const all = readItem<Record<string, InstagramAccount>>(KEYS.INSTAGRAM, {});
      if (all[clientId]) {
        all[clientId] = {
          ...all[clientId],
          isConnected: false,
          errorStatus: null
        };
        writeItem(KEYS.INSTAGRAM, all);
      }
    }
  },

  // METRICS SNAPSHOTS (HISTÓRICO DIÁRIO NÃO-SOBREESCRITO)
  history: {
    getAll(): MetricSnapshot[] {
      return readItem<MetricSnapshot[]>(KEYS.SNAPSHOTS, []);
    },
    getByClient(clientId: string): MetricSnapshot[] {
      const all = storageService.history.getAll();
      return all
        .filter(s => s.clientId === clientId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    },
    addSnapshot(snapshot: Omit<MetricSnapshot, 'id'>): MetricSnapshot {
      const all = storageService.history.getAll();
      // Check if a snapshot for this client and date already exists
      const existingIdx = all.findIndex(s => s.clientId === snapshot.clientId && s.timestamp === snapshot.timestamp);
      const newSnapshot: MetricSnapshot = {
        ...snapshot,
        id: `snap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      };
      if (existingIdx >= 0) {
        // Update snapshot of today with latest sync values without erasing historical dates
        all[existingIdx] = newSnapshot;
      } else {
        all.push(newSnapshot);
      }
      writeItem(KEYS.SNAPSHOTS, all);
      return newSnapshot;
    }
  },

  // CONTENTS
  contents: {
    getAll(): Content[] {
      return readItem<Content[]>(KEYS.CONTENTS, []);
    },
    getByClient(clientId: string): Content[] {
      const all = storageService.contents.getAll();
      return all
        .filter(c => c.clientId === clientId)
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    },
    create(data: Omit<Content, 'id'>): Content {
      const all = storageService.contents.getAll();
      const newContent: Content = {
        ...data,
        id: `cnt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      };
      writeItem(KEYS.CONTENTS, [newContent, ...all]);
      return newContent;
    },
    update(id: string, updates: Partial<Content>): Content | null {
      const all = storageService.contents.getAll();
      const idx = all.findIndex(c => c.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...updates };
      writeItem(KEYS.CONTENTS, all);
      return all[idx];
    },
    delete(id: string): boolean {
      const all = storageService.contents.getAll();
      writeItem(KEYS.CONTENTS, all.filter(c => c.id !== id));
      return true;
    }
  },

  // COMPETITORS
  competitors: {
    getAll(): Competitor[] {
      return readItem<Competitor[]>(KEYS.COMPETITORS, []);
    },
    getByClient(clientId: string): Competitor[] {
      return storageService.competitors.getAll().filter(c => c.clientId === clientId);
    },
    create(data: Omit<Competitor, 'id' | 'createdAt' | 'updatedAt'>): Competitor {
      const all = storageService.competitors.getAll();
      const newComp: Competitor = {
        ...data,
        id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      writeItem(KEYS.COMPETITORS, [newComp, ...all]);
      return newComp;
    },
    update(id: string, updates: Partial<Competitor>): Competitor | null {
      const all = storageService.competitors.getAll();
      const idx = all.findIndex(c => c.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
      writeItem(KEYS.COMPETITORS, all);
      return all[idx];
    },
    delete(id: string): boolean {
      const all = storageService.competitors.getAll();
      writeItem(KEYS.COMPETITORS, all.filter(c => c.id !== id));
      return true;
    }
  },

  // AUDIENCE INTELLIGENCE
  audience: {
    getAll(): AudienceInsight[] {
      return readItem<AudienceInsight[]>(KEYS.AUDIENCE, []);
    },
    getByClient(clientId: string): AudienceInsight[] {
      return storageService.audience.getAll().filter(a => a.clientId === clientId);
    },
    create(data: Omit<AudienceInsight, 'id' | 'createdAt'>): AudienceInsight {
      const all = storageService.audience.getAll();
      const newInsight: AudienceInsight = {
        ...data,
        id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString()
      };
      writeItem(KEYS.AUDIENCE, [newInsight, ...all]);
      return newInsight;
    },
    delete(id: string): boolean {
      const all = storageService.audience.getAll();
      writeItem(KEYS.AUDIENCE, all.filter(a => a.id !== id));
      return true;
    }
  },

  // CONTENT IDEAS BANK
  ideas: {
    getAll(): ContentIdea[] {
      return readItem<ContentIdea[]>(KEYS.IDEAS, []);
    },
    getByClient(clientId: string): ContentIdea[] {
      return storageService.ideas.getAll().filter(i => i.clientId === clientId);
    },
    create(data: Omit<ContentIdea, 'id' | 'createdAt' | 'updatedAt'>): ContentIdea {
      const all = storageService.ideas.getAll();
      const newIdea: ContentIdea = {
        ...data,
        id: `idea-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      writeItem(KEYS.IDEAS, [newIdea, ...all]);
      return newIdea;
    },
    update(id: string, updates: Partial<ContentIdea>): ContentIdea | null {
      const all = storageService.ideas.getAll();
      const idx = all.findIndex(i => i.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
      writeItem(KEYS.IDEAS, all);
      return all[idx];
    },
    delete(id: string): boolean {
      const all = storageService.ideas.getAll();
      writeItem(KEYS.IDEAS, all.filter(i => i.id !== id));
      return true;
    }
  },

  // WEEKLY CALENDAR
  calendar: {
    getAll(): CalendarItem[] {
      return readItem<CalendarItem[]>(KEYS.CALENDAR, []);
    },
    getByClient(clientId: string): CalendarItem[] {
      return storageService.calendar.getAll().filter(c => c.clientId === clientId);
    },
    saveAll(clientId: string, items: CalendarItem[]): void {
      const others = storageService.calendar.getAll().filter(c => c.clientId !== clientId);
      writeItem(KEYS.CALENDAR, [...others, ...items]);
    },
    addItem(data: Omit<CalendarItem, 'id'>): CalendarItem {
      const all = storageService.calendar.getAll();
      const newItem: CalendarItem = {
        ...data,
        id: `cal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      };
      writeItem(KEYS.CALENDAR, [...all, newItem]);
      return newItem;
    },
    updateItem(id: string, updates: Partial<CalendarItem>): CalendarItem | null {
      const all = storageService.calendar.getAll();
      const idx = all.findIndex(c => c.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...updates };
      writeItem(KEYS.CALENDAR, all);
      return all[idx];
    },
    deleteItem(id: string): boolean {
      const all = storageService.calendar.getAll();
      writeItem(KEYS.CALENDAR, all.filter(c => c.id !== id));
      return true;
    }
  },

  // ALERTS
  alerts: {
    getAll(): Alert[] {
      return readItem<Alert[]>(KEYS.ALERTS, []);
    },
    getByClient(clientId?: string): Alert[] {
      const all = storageService.alerts.getAll();
      if (!clientId) return all;
      return all.filter(a => a.clientId === clientId);
    },
    create(data: Omit<Alert, 'id' | 'createdAt'>): Alert {
      const all = storageService.alerts.getAll();
      const newAlert: Alert = {
        ...data,
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString()
      };
      writeItem(KEYS.ALERTS, [newAlert, ...all]);
      return newAlert;
    },
    updateStatus(id: string, status: Alert['status']): void {
      const all = storageService.alerts.getAll();
      const idx = all.findIndex(a => a.id === id);
      if (idx >= 0) {
        all[idx].status = status;
        writeItem(KEYS.ALERTS, all);
      }
    },
    delete(id: string): boolean {
      const all = storageService.alerts.getAll();
      writeItem(KEYS.ALERTS, all.filter(a => a.id !== id));
      return true;
    }
  },

  // REPORTS
  reports: {
    getAll(): Report[] {
      return readItem<Report[]>(KEYS.REPORTS, []);
    },
    getByClient(clientId: string): Report[] {
      return storageService.reports.getAll().filter(r => r.clientId === clientId);
    },
    create(report: Omit<Report, 'id' | 'generatedAt'>): Report {
      const all = storageService.reports.getAll();
      const newReport: Report = {
        ...report,
        id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        generatedAt: new Date().toISOString()
      };
      writeItem(KEYS.REPORTS, [newReport, ...all]);
      return newReport;
    }
  },

  // SETTINGS
  settings: {
    get(): AppSettings {
      return readItem<AppSettings>(KEYS.SETTINGS, {
        instagramApiConfigured: false,
        aiApiConfigured: true,
        storageType: 'localStorage',
        agencyName: 'Gabriel Speratti',
        ownerName: 'Gabriel Speratti'
      });
    },
    update(updates: Partial<AppSettings>): AppSettings {
      const current = storageService.settings.get();
      const updated = { ...current, ...updates };
      writeItem(KEYS.SETTINGS, updated);
      return updated;
    }
  },

  // DEMO DATA SEED & RESET
  isDemoLoaded(): boolean {
    return localStorage.getItem(KEYS.DEMO_FLAG) === 'true';
  },

  seedDemoData(): void {
    console.info('[StorageService] Seeding demo mock data for client RAVI...');
    // Add client
    const existingClients = storageService.clients.getAll().filter(c => c.id !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.CLIENTS, [DEMO_CLIENT_RAVI, ...existingClients]);

    // Add instagram account
    storageService.instagram.save(DEMO_INSTAGRAM_ACCOUNT);

    // Add metric snapshots
    const snapshots = generateDemoSnapshots();
    const existingSnapshots = storageService.history.getAll().filter(s => s.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.SNAPSHOTS, [...existingSnapshots, ...snapshots]);

    // Add contents
    const existingContents = storageService.contents.getAll().filter(c => c.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.CONTENTS, [...DEMO_CONTENTS, ...existingContents]);

    // Add competitors
    const existingCompetitors = storageService.competitors.getAll().filter(c => c.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.COMPETITORS, [...DEMO_COMPETITORS, ...existingCompetitors]);

    // Add audience insights
    const existingAudience = storageService.audience.getAll().filter(a => a.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.AUDIENCE, [...DEMO_AUDIENCE_INSIGHTS, ...existingAudience]);

    // Add ideas
    const existingIdeas = storageService.ideas.getAll().filter(i => i.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.IDEAS, [...DEMO_IDEAS, ...existingIdeas]);

    // Add calendar
    const existingCalendar = storageService.calendar.getAll().filter(c => c.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.CALENDAR, [...DEMO_CALENDAR_ITEMS, ...existingCalendar]);

    // Add alerts
    const existingAlerts = storageService.alerts.getAll().filter(a => a.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.ALERTS, [...DEMO_ALERTS, ...existingAlerts]);

    localStorage.setItem(KEYS.DEMO_FLAG, 'true');
  },

  clearDemoData(): void {
    console.info('[StorageService] Clearing demo mock data...');
    const clients = storageService.clients.getAll().filter(c => c.id !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.CLIENTS, clients);

    const snapshots = storageService.history.getAll().filter(s => s.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.SNAPSHOTS, snapshots);

    const contents = storageService.contents.getAll().filter(c => c.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.CONTENTS, contents);

    const competitors = storageService.competitors.getAll().filter(c => c.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.COMPETITORS, competitors);

    const audience = storageService.audience.getAll().filter(a => a.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.AUDIENCE, audience);

    const ideas = storageService.ideas.getAll().filter(i => i.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.IDEAS, ideas);

    const calendar = storageService.calendar.getAll().filter(c => c.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.CALENDAR, calendar);

    const alerts = storageService.alerts.getAll().filter(a => a.clientId !== DEMO_CLIENT_RAVI.id);
    writeItem(KEYS.ALERTS, alerts);

    localStorage.removeItem(KEYS.DEMO_FLAG);
  },

  clearAllData(): void {
    console.info('[StorageService] Clearing all application data...');
    writeItem(KEYS.CLIENTS, []);
    writeItem(KEYS.INSTAGRAM, []);
    writeItem(KEYS.SNAPSHOTS, []);
    writeItem(KEYS.CONTENTS, []);
    writeItem(KEYS.COMPETITORS, []);
    writeItem(KEYS.AUDIENCE, []);
    writeItem(KEYS.IDEAS, []);
    writeItem(KEYS.CALENDAR, []);
    writeItem(KEYS.ALERTS, []);
    writeItem(KEYS.REPORTS, []);
    localStorage.removeItem(KEYS.DEMO_FLAG);
    localStorage.setItem('gs_intel_initialized_clean', 'true');
  }
};
