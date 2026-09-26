/**
 * Regras do CRM de entregas: prazo, filtros e contagens. Datas no fuso de Brasília.
 */

import type { DeliveryTask, TaskStatus } from '../types';
import { brasiliaDay } from './dashboardInsights';

export const TASK_STATUSES: Array<{ id: TaskStatus; label: string }> = [
  { id: 'todo', label: 'A fazer' },
  { id: 'doing', label: 'Em produção' },
  { id: 'review', label: 'Aprovação do cliente' },
  { id: 'approved', label: 'Aprovado' },
  { id: 'done', label: 'Entregue' }
];

export type DueState = 'overdue' | 'today' | 'soon' | 'later' | 'none' | 'done';

const DAY_MS = 24 * 3600 * 1000;

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Situação do prazo. "soon" = vence nos próximos 3 dias. */
export function dueState(task: Pick<DeliveryTask, 'dueDate' | 'status'>, now = new Date()): DueState {
  if (task.status === 'done') return 'done';
  if (!task.dueDate) return 'none';
  const today = brasiliaDay(now);
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate === today) return 'today';
  if (task.dueDate <= addDays(today, 3)) return 'soon';
  return 'later';
}

export function dueLabel(task: Pick<DeliveryTask, 'dueDate' | 'status'>, now = new Date()): string | null {
  if (!task.dueDate) return null;
  const state = dueState(task, now);
  const today = brasiliaDay(now);
  if (state === 'today') return 'Hoje';
  if (task.dueDate === addDays(today, 1) && state !== 'done') return 'Amanhã';
  const [, m, d] = task.dueDate.split('-');
  const base = `${d}/${m}`;
  if (state === 'overdue') {
    const days = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${task.dueDate}T12:00:00Z`)) / DAY_MS);
    return `${base} · ${days} dia${days > 1 ? 's' : ''} atrasada`;
  }
  return base;
}

export type QuickFilter = 'all' | 'overdue' | 'today' | 'week' | 'high';

export interface TaskFilter {
  /** 'all' = todos os clientes; 'general' = só tarefas sem cliente. */
  clientId: string;
  search?: string;
  quick?: QuickFilter;
}

export function filterTasks(tasks: DeliveryTask[], f: TaskFilter, clientNames: Map<string, string> = new Map(), now = new Date()): DeliveryTask[] {
  const q = (f.search ?? '').trim().toLowerCase();
  const today = brasiliaDay(now);
  const weekEnd = addDays(today, 6);
  return tasks.filter((t) => {
    if (f.clientId === 'general' && t.clientId) return false;
    if (f.clientId !== 'all' && f.clientId !== 'general' && t.clientId !== f.clientId) return false;
    if (q) {
      const hay = `${t.title} ${t.notes ?? ''} ${t.type} ${t.clientId ? clientNames.get(t.clientId) ?? '' : 'geral'}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    switch (f.quick ?? 'all') {
      case 'overdue':
        return dueState(t, now) === 'overdue';
      case 'today':
        return dueState(t, now) === 'today';
      case 'week':
        return t.status !== 'done' && !!t.dueDate && t.dueDate <= weekEnd;
      case 'high':
        return t.priority === 'high' && t.status !== 'done';
      default:
        return true;
    }
  });
}

export interface TaskSummary {
  byStatus: Record<TaskStatus, number>;
  open: number;
  overdue: number;
  today: number;
  /** Entregues nos últimos 7 dias. */
  doneThisWeek: number;
}

export function summarizeTasks(tasks: DeliveryTask[], now = new Date()): TaskSummary {
  const byStatus: Record<TaskStatus, number> = { todo: 0, doing: 0, review: 0, approved: 0, done: 0 };
  let overdue = 0;
  let today = 0;
  let doneThisWeek = 0;
  const weekAgo = now.getTime() - 7 * DAY_MS;
  tasks.forEach((t) => {
    byStatus[t.status] += 1;
    const s = dueState(t, now);
    if (s === 'overdue') overdue += 1;
    if (s === 'today') today += 1;
    if (t.status === 'done' && t.completedAt && Date.parse(t.completedAt) >= weekAgo) doneThisWeek += 1;
  });
  return { byStatus, open: tasks.length - byStatus.done, overdue, today, doneThisWeek };
}

/** Próximas entregas (abertas), atrasadas primeiro, depois por prazo; sem prazo por último. */
export function upcomingTasks(tasks: DeliveryTask[], limit = 5, now = new Date()): DeliveryTask[] {
  const rank: Record<DueState, number> = { overdue: 0, today: 1, soon: 2, later: 3, none: 4, done: 5 };
  return tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => rank[dueState(a, now)] - rank[dueState(b, now)] || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || (a.priority === 'high' ? -1 : 0) - (b.priority === 'high' ? -1 : 0))
    .slice(0, limit);
}
