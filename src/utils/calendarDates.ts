/**
 * Datas do calendário editorial (YYYY-MM-DD, semana começando na segunda).
 * Tudo em meio-dia UTC para não escorregar de dia por fuso.
 */

import type { WeekDay } from '../types';

const DAY_MS = 24 * 3600 * 1000;
const NAMES: WeekDay[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const at = (day: string) => new Date(`${day}T12:00:00Z`);

export function addDays(day: string, n: number): string {
  return new Date(at(day).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

export function weekDayOfDate(day: string): WeekDay {
  return NAMES[at(day).getUTCDay()];
}

/** Segunda-feira da semana da data. */
export function mondayOf(day: string): string {
  const dow = at(day).getUTCDay();
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

export function weekDates(day: string): string[] {
  const mon = mondayOf(day);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

/** Semanas (seg..dom) que cobrem o mês de `month` (YYYY-MM). */
export function monthWeeks(month: string): string[][] {
  const first = `${month}-01`;
  const weeks: string[][] = [];
  let cursor = mondayOf(first);
  do {
    weeks.push(weekDates(cursor));
    cursor = addDays(cursor, 7);
  } while (cursor.slice(0, 7) === month);
  return weeks;
}

export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(month: string): string {
  const s = at(`${month}-01`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dayLabel(day: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'long' }): string {
  return at(day).toLocaleDateString('pt-BR', { ...opts, timeZone: 'UTC' });
}

export const isIsoDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Próxima data (a partir de `from`, inclusive) que cai no dia da semana pedido. */
export function nextDateForWeekDay(day: WeekDay, from: string): string {
  for (let i = 0; i < 7; i++) {
    const d = addDays(from, i);
    if (weekDayOfDate(d) === day) return d;
  }
  return from;
}
