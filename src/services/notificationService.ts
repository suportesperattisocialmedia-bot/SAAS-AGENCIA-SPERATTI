/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Notification Service - Notificações internas da agência e toasts
 */

import { AppNotification, NotificationType } from '../types';

type NotificationListener = (notifications: AppNotification[]) => void;
type ToastListener = (toast: { message: string; type: NotificationType }) => void;

class NotificationService {
  private notifications: AppNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private toastListeners: Set<ToastListener> = new Set();

  constructor() {
    // Initial sample notification
    this.notifications = [
      {
        id: 'notif-01',
        title: 'Central de Inteligência Pronta',
        message: 'Sistema Gabriel Speratti Social Intelligence inicializado com sucesso.',
        type: 'info',
        timestamp: new Date().toISOString(),
        read: false
      }
    ];
  }

  getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  addNotification(title: string, message: string, type: NotificationType = 'info', actionUrl?: string): AppNotification {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
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

  showToast(message: string, type: NotificationType = 'info'): void {
    this.toastListeners.forEach(listener => listener({ message, type }));
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
