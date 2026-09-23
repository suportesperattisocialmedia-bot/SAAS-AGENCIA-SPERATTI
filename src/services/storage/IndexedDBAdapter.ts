/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * IndexedDBAdapter - High-capacity browser storage for heavy analytics, snapshots & logs
 * Implements transparent cache-through mechanism with asynchronous background persistence.
 */

import { StorageAdapter } from './StorageAdapter';
import { logger } from '../../utils/logger';

const DB_NAME = 'gs_social_intelligence_db';
const DB_VERSION = 1;
const OBJECT_STORE_NAME = 'entities_store';

export class IndexedDBAdapter implements StorageAdapter {
  private cache = new Map<string, any>();
  private db: IDBDatabase | null = null;
  private isSupported = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
    if (this.isSupported) {
      this.initPromise = this.initDB();
    }
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
            db.createObjectStore(OBJECT_STORE_NAME);
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          // Hydrate memory cache from IndexedDB
          this.hydrateCache().then(() => resolve());
        };

        request.onerror = () => {
          logger.warn('IndexedDB unavailable or blocked. Operating in memory/localStorage fallback mode.');
          resolve();
        };
      } catch (err) {
        logger.warn('IndexedDB initialization failed', { error: String(err) });
        resolve();
      }
    });
  }

  private async hydrateCache(): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(OBJECT_STORE_NAME, 'readonly');
        const store = tx.objectStore(OBJECT_STORE_NAME);
        const cursorReq = store.openCursor();

        cursorReq.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result;
          if (cursor) {
            this.cache.set(cursor.key as string, cursor.value);
            cursor.continue();
          } else {
            resolve();
          }
        };

        cursorReq.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private persistAsync(key: string, value: any): void {
    if (!this.db) {
      // Fallback to localStorage if small
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      } catch {
        // quota exceeded, ignore
      }
      return;
    }

    try {
      const tx = this.db.transaction(OBJECT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OBJECT_STORE_NAME);
      store.put(value, key);
    } catch (err) {
      logger.error(`Failed to persist key '${key}' to IndexedDB`, { error: String(err) });
    }
  }

  private removeAsync(key: string): void {
    if (!this.db) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(key);
        }
      } catch {}
      return;
    }

    try {
      const tx = this.db.transaction(OBJECT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OBJECT_STORE_NAME);
      store.delete(key);
    } catch (err) {
      logger.error(`Failed to remove key '${key}' from IndexedDB`, { error: String(err) });
    }
  }

  get<T>(key: string, fallback: T): T {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // Try reading localStorage fallback
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as T;
          this.cache.set(key, parsed);
          return parsed;
        }
      }
    } catch {}

    return fallback;
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
    this.persistAsync(key, value);
  }

  remove(key: string): void {
    this.cache.delete(key);
    this.removeAsync(key);
  }

  clear(): void {
    this.cache.clear();
    if (this.db) {
      try {
        const tx = this.db.transaction(OBJECT_STORE_NAME, 'readwrite');
        const store = tx.objectStore(OBJECT_STORE_NAME);
        store.clear();
      } catch {}
    }
  }

  transaction<T>(operation: () => T): T {
    return operation();
  }

  getCollection<T>(collectionName: string): T[] {
    return this.get<T[]>(collectionName, []);
  }

  setCollection<T>(collectionName: string, items: T[]): void {
    this.set<T[]>(collectionName, items);
  }
}

export const indexedDBAdapter = new IndexedDBAdapter();
