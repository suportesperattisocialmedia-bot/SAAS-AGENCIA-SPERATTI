/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * LocalStorageAdapter - Implementation of StorageAdapter with schema validation and migrations
 */

import { StorageAdapter } from './StorageAdapter';
import { runMigrations, STORAGE_SCHEMA_VERSION } from './migration';
import { logger } from '../../utils/logger';

export class LocalStorageAdapter implements StorageAdapter {
  private initialized = false;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        runMigrations({
          getRaw: (k: string) => localStorage.getItem(k),
          setRaw: (k: string, v: string) => localStorage.setItem(k, v)
        });
      }
      this.initialized = true;
    } catch (err) {
      logger.error('Failed to initialize LocalStorageAdapter', { error: String(err) });
    }
  }

  get<T>(key: string, fallback: T): T {
    this.ensureInitialized();
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.warn(`Error parsing item '${key}' from storage`, { error: String(err) });
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    this.ensureInitialized();
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      logger.error(`Error writing item '${key}' to storage`, { error: String(err) });
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      logger.error(`Error removing item '${key}' from storage`, { error: String(err) });
    }
  }

  clear(): void {
    try {
      localStorage.clear();
      localStorage.setItem('gs_intel_schema_version', STORAGE_SCHEMA_VERSION.toString());
    } catch (err) {
      logger.error('Error clearing storage', { error: String(err) });
    }
  }

  transaction<T>(operation: () => T): T {
    // In local storage, operations are synchronous
    return operation();
  }

  getCollection<T>(collectionName: string): T[] {
    return this.get<T[]>(collectionName, []);
  }

  setCollection<T>(collectionName: string, items: T[]): void {
    this.set<T[]>(collectionName, items);
  }
}

export const defaultStorageAdapter = new LocalStorageAdapter();
