/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Storage Factory - Routes entities to optimal storage adapter (IndexedDB vs LocalStorage)
 */

import { StorageAdapter } from './StorageAdapter';
import { defaultStorageAdapter } from './LocalStorageAdapter';
import { indexedDBAdapter } from './IndexedDBAdapter';

export type EntityStorageType =
  | 'clients'
  | 'instagram_accounts'
  | 'account_snapshots'
  | 'contents'
  | 'content_metric_snapshots'
  | 'competitors'
  | 'competitor_snapshots'
  | 'audience_insights'
  | 'content_ideas'
  | 'calendar_items'
  | 'alerts'
  | 'reports'
  | 'sync_logs'
  | 'ai_analysis'
  | 'research_insights'
  | 'research_runs'
  | 'settings'
  | 'notifications';

export const storageFactory = {
  getAdapter(entityType: EntityStorageType): StorageAdapter {
    // Heavy collections go to IndexedDB with automatic memory caching
    const heavyEntities: EntityStorageType[] = [
      'contents',
      'content_metric_snapshots',
      'account_snapshots',
      'competitor_snapshots',
      'sync_logs',
      'ai_analysis',
      'research_insights'
    ];

    if (heavyEntities.includes(entityType)) {
      return indexedDBAdapter;
    }

    // Settings, clients, calendar and alerts can use default localStorage adapter
    return defaultStorageAdapter;
  }
};
