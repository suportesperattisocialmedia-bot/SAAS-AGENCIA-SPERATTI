/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * DemoProvider - The ONLY authorized gateway to access demonstration mock data.
 * Guarantees zero contamination of production workloads.
 */

import {
  DEMO_CLIENT_ID,
  DEMO_CLIENT_RAVI,
  DEMO_INSTAGRAM_ACCOUNT,
  generateDemoSnapshots,
  DEMO_CONTENTS,
  DEMO_COMPETITORS,
  DEMO_AUDIENCE_INSIGHTS,
  DEMO_IDEAS,
  DEMO_CALENDAR_ITEMS,
  DEMO_ALERTS
} from '../../data/demo/demoData';
import {
  Client,
  InstagramAccount,
  AccountSnapshot,
  Content,
  Competitor,
  AudienceInsight,
  ContentIdea,
  CalendarItem,
  Alert
} from '../../types';
import { defaultStorageAdapter } from '../storage/LocalStorageAdapter';

const DEMO_MODE_KEY = 'gs_intel_demo_mode_active';

export const DemoProvider = {
  isDemoActive(): boolean {
    return defaultStorageAdapter.get<boolean>(DEMO_MODE_KEY, false);
  },

  enableDemoMode(): void {
    defaultStorageAdapter.set(DEMO_MODE_KEY, true);
  },

  disableDemoMode(): void {
    defaultStorageAdapter.set(DEMO_MODE_KEY, false);
  },

  getDemoClientId(): string {
    return DEMO_CLIENT_ID;
  },

  getDemoClient(): Client {
    return { ...DEMO_CLIENT_RAVI };
  },

  getDemoInstagram(): InstagramAccount {
    return { ...DEMO_INSTAGRAM_ACCOUNT };
  },

  getDemoSnapshots(): AccountSnapshot[] {
    return generateDemoSnapshots();
  },

  getDemoContents(): Content[] {
    return [...DEMO_CONTENTS];
  },

  getDemoCompetitors(): Competitor[] {
    return [...DEMO_COMPETITORS];
  },

  getDemoAudience(): AudienceInsight[] {
    return [...DEMO_AUDIENCE_INSIGHTS];
  },

  getDemoIdeas(): ContentIdea[] {
    return [...DEMO_IDEAS];
  },

  getDemoCalendar(): CalendarItem[] {
    return [...DEMO_CALENDAR_ITEMS];
  },

  getDemoAlerts(): Alert[] {
    return [...DEMO_ALERTS];
  }
};
