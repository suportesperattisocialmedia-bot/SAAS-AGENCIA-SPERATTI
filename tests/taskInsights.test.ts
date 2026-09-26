import { describe, expect, it } from 'vitest';
import { dueLabel, dueState, filterTasks, summarizeTasks, upcomingTasks } from '../src/services/taskInsights';
import type { DeliveryTask } from '../src/types';

const NOW = new Date('2026-09-26T15:00:00.000Z'); // sábado 12h em Brasília
const t = (id: string, patch: Partial<DeliveryTask> = {}): DeliveryTask => ({
  id, title: id, type: 'Post', status: 'todo', priority: 'normal', checklist: [], orderIndex: 0,
  createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), ...patch
});

describe('CRM de entregas', () => {
  it('situação e rótulo do prazo', () => {
    expect(dueState(t('a', { dueDate: '2026-09-24' }), NOW)).toBe('overdue');
    expect(dueLabel(t('a', { dueDate: '2026-09-24' }), NOW)).toBe('24/09 · 2 dias atrasada');
    expect(dueState(t('b', { dueDate: '2026-09-26' }), NOW)).toBe('today');
    expect(dueLabel(t('c', { dueDate: '2026-09-27' }), NOW)).toBe('Amanhã');
    expect(dueState(t('d', { dueDate: '2026-09-24', status: 'done' }), NOW)).toBe('done');
    expect(dueState(t('e'), NOW)).toBe('none');
  });

  it('prazo usa a data de Brasília (23h de sábado ainda é sábado)', () => {
    expect(dueState(t('x', { dueDate: '2026-09-26' }), new Date('2026-09-27T02:00:00Z'))).toBe('today');
  });

  it('filtra por cliente, tarefas gerais, busca e atalhos', () => {
    const list = [
      t('Roteiro reels', { clientId: 'c1', dueDate: '2026-09-25', priority: 'high' }),
      t('Relatório mensal', { clientId: 'c2', dueDate: '2026-09-26' }),
      t('Proposta nova', { dueDate: '2026-10-20' })
    ];
    const names = new Map([['c1', 'Lumen'], ['c2', 'Vértice']]);
    expect(filterTasks(list, { clientId: 'c1' }, names, NOW).map((x) => x.id)).toEqual(['Roteiro reels']);
    expect(filterTasks(list, { clientId: 'general' }, names, NOW).map((x) => x.id)).toEqual(['Proposta nova']);
    expect(filterTasks(list, { clientId: 'all', search: 'vértice' }, names, NOW).map((x) => x.id)).toEqual(['Relatório mensal']);
    expect(filterTasks(list, { clientId: 'all', quick: 'overdue' }, names, NOW)).toHaveLength(1);
    expect(filterTasks(list, { clientId: 'all', quick: 'week' }, names, NOW)).toHaveLength(2);
    expect(filterTasks(list, { clientId: 'all', quick: 'high' }, names, NOW)).toHaveLength(1);
  });

  it('resumo e próximas entregas (atrasadas primeiro, sem prazo por último)', () => {
    const list = [
      t('sem prazo'),
      t('amanha', { dueDate: '2026-09-27' }),
      t('atrasada', { dueDate: '2026-09-20' }),
      t('entregue', { status: 'done', completedAt: NOW.toISOString() })
    ];
    const s = summarizeTasks(list, NOW);
    expect(s).toMatchObject({ open: 3, overdue: 1, doneThisWeek: 1 });
    expect(upcomingTasks(list, 5, NOW).map((x) => x.id)).toEqual(['atrasada', 'amanha', 'sem prazo']);
  });
});
