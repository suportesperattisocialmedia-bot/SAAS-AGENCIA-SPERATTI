/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Notification Service - Notificações internas da agência e toasts
 */

import { AppNotification, NotificationType } from '../types';
import { generateUUID } from '../utils/uuid';

type NotificationListener = (notifications: AppNotification[]) => void;
export interface ToastAction {
  label: string;
  onClick: () => void;
}
export interface ToastPayload {
  message: string;
  type: NotificationType;
  action?: ToastAction;
}
type ToastListener = (toast: ToastPayload) => void;

class NotificationService {
  private notifications: AppNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private toastListeners: Set<ToastListener> = new Set();

  getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  addNotification(title: string, message: string, type: NotificationType = 'info', actionUrl?: string): AppNotification {
    const newNotif: AppNotification = {
      id: `notif-${generateUUID()}`,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl
    };
    this.notifications = [newNotif, ...this.notifications];
    this.notifyListeners();
    this.showToast(message, type);
    return newNotif;
  }

  markAsRead(id: string): void {
    this.notifications = this.notifications.map(n => n.id === id ? { ...n, read: true } : n);
    this.notifyListeners();
  }

  markAllAsRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    this.notifyListeners();
  }

  showToast(message: string, type: NotificationType = 'info', action?: ToastAction): void {
    this.toastListeners.forEach(listener => listener({ message, type, action }));
  }

  /** Aviso com botão "Desfazer" (padrão para exclusões: rápido e reversível). */
  undoable(message: string, undo: () => void): void {
    this.showToast(message, 'info', { label: 'Desfazer', onClick: undo });
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener(this.notifications);
    return () => this.listeners.delete(listener);
  }

  subscribeToast(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    return () => this.toastListeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.notifications));
  }
}

export const notificationService = new NotificationService();
