/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Persistent NotificationStore & Notification Service
 */

import { notificationService as toastService } from '../notificationService';
import { AppNotification, NotificationType } from '../../types';
import { defaultStorageAdapter } from '../storage/LocalStorageAdapter';
import { generateUUID } from '../../utils/uuid';

const NOTIFICATIONS_STORAGE_KEY = 'gs_intel_notifications';

type Listener = () => void;

class NotificationStore {
  private listeners: Set<Listener> = new Set();

  getAll(): AppNotification[] {
    return defaultStorageAdapter.getCollection<AppNotification>(NOTIFICATIONS_STORAGE_KEY);
  }

  getUnreadCount(): number {
    return this.getAll().filter(n => !n.read).length;
  }

  notify(title: string, message: string, type: NotificationType = 'info', actionUrl?: string): AppNotification {
    const item: AppNotification = {
      id: `notif-${generateUUID()}`,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl
    };

    const all = this.getAll();
    defaultStorageAdapter.setCollection(NOTIFICATIONS_STORAGE_KEY, [item, ...all.slice(0, 99)]);
    this.broadcast();
    toastService.showToast(message, type);
    return item;
  }

  markRead(id: string): void {
    const all = this.getAll();
    const updated = all.map(n => n.id === id ? { ...n, read: true } : n);
    defaultStorageAdapter.setCollection(NOTIFICATIONS_STORAGE_KEY, updated);
    this.broadcast();
  }

  markAllRead(): void {
    const all = this.getAll();
    const updated = all.map(n => ({ ...n, read: true }));
    defaultStorageAdapter.setCollection(NOTIFICATIONS_STORAGE_KEY, updated);
    this.broadcast();
  }

  delete(id: string): void {
    const all = this.getAll();
    const filtered = all.filter(n => n.id !== id);
    defaultStorageAdapter.setCollection(NOTIFICATIONS_STORAGE_KEY, filtered);
    this.broadcast();
  }

  clearAll(): void {
    defaultStorageAdapter.setCollection(NOTIFICATIONS_STORAGE_KEY, []);
    this.broadcast();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private broadcast(): void {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error('Error in notification listener', e);
      }
    });
  }
}

export const notificationStore = new NotificationStore();

// Toasts visuais: delega ao serviço único consumido pelo ToastContainer.
export { notificationService } from '../notificationService';
