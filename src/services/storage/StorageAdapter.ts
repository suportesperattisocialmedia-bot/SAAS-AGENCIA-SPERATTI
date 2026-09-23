/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * StorageAdapter Interface - Universal persistence abstraction
 */

export interface StorageAdapter {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
  transaction<T>(operation: () => T): T;
  getCollection<T>(collectionName: string): T[];
  setCollection<T>(collectionName: string, items: T[]): void;
}
