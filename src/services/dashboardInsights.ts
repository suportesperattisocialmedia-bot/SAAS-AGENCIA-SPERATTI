/**
 * Cálculos do painel da agência. Tudo derivado dos dados reais do workspace
 * (posts importados, snapshots, calendário). Métrica ausente continua null.
 */

import type { AccountSnapshot, CalendarItem, Client, Content, ContentFormat, Metric } from '../types';
import { avgMetric, engagementFrom, isMetric, sortValue, sumMetric } from '../utils/metrics';
import { normalizeWeekDay } from './storage/migration';

const DAY_MS = 24 * 3600 * 1000;

/** Data (YYYY-MM-DD) no fuso de Brasília (UTC-3). */
export function brasiliaDay(iso: string | number | Date): string {
  const t = new Date(iso).getTime();
  return new Date(t - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function inWindow(c: Content, days: number, now: Date, offsetDays = 0): boolean {
  const end = brasiliaDay(now.getTime() - offsetDays * DAY_MS);
  const start = brasiliaDay(now.getTime() - (offsetDays + days - 1) * DAY_MS);
  const d = brasiliaDay(c.publishedAt);
  return d >= start && d <= end;
}

export interface DailyPoint {
  date: string;
  /** null = nenhum post publicado nesse dia (não é zero). */
  views: Metric;
  posts: number;
}

/** Visualizações por dia de publicação, últimos `days` dias. */
export function dailyViews(contents: Content[], days = 30, now = new Date()): DailyPoint[] {
  const byDay = new Map<string, Content[]>();
  contents.forEach((c) => {
    const d = brasiliaDay(c.publishedAt);
    byDay.set(d, [...(byDay.get(d) ?? []), c]);
  });
  return Array.from({ length: days }, (_, i) => {
    const date = brasiliaDay(now.getTime() - (days - 1 - i) * DAY_MS);
    const list = byDay.get(date) ?? [];
    return { date, posts: list.length, views: list.length ? sumMetric(list.map((c) => c.metrics.views)) : null };
  });
}

export interface WeekPoint {
  /** Início da semana (YYYY-MM-DD). */
  start: string;
  end: string;
  views: Metric;
  posts: number;
}

/** Visualizações somadas por semana (blocos de 7 dias terminando hoje), da mais antiga à mais recente. */
export function weeklyViews(contents: Content[], weeks = 8, now = new Date()): WeekPoint[] {
  const days = dailyViews(contents, weeks * 7, now);
  return Array.from({ length: weeks }, (_, w) => {
    const chunk = days.slice(w * 7, w * 7 + 7);
    const posts = chunk.reduce((acc, d) => acc + d.posts, 0);
    return { start: chunk[0].date, end: chunk[6].date, posts, views: posts ? sumMetric(chunk.map((d) => d.views)) : null };
  });
}

export interface WindowTotals {
  views: Metric;
  reach: Metric;
  posts: number;
  engagement: Metric;
}

function totals(list: Content[]): WindowTotals {
  const withReach = list.filter((c) => isMetric(c.metrics.reach) && c.metrics.reach > 0);
  const reach = sumMetric(withReach.map((c) => c.metrics.reach));
  const interactions = sumMetric(withReach.flatMap((c) => [c.metrics.likes, c.metrics.comments, c.metrics.shares, c.metrics.saves]));
  return {
    views: sumMetric(list.map((c) => c.metrics.views)),
    reach: sumMetric(list.map((c) => c.metrics.reach)),
    posts: list.length,
    engagement: isMetric(reach) && reach > 0 && isMetric(interactions) ? Number(((interactions / reach) * 100).toFixed(2)) : null
  };
}

/** Totais dos posts nos últimos `days` dias e na janela anterior de mesmo tamanho. */
export function windowTotals(contents: Content[], days = 30, now = new Date()): { current: WindowTotals; previous: WindowTotals | null } {
  const current = totals(contents.filter((c) => inWindow(c, days, now)));
  const prevList = contents.filter((c) => inWindow(c, days, now, days));
  return { current, previous: prevList.length ? totals(prevList) : null };
}

export function percentChange(current: Metric, previous: Metric | undefined): number | null {
  if (!isMetric(current) || !isMetric(previous) || previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export interface FormatRow {
  format: ContentFormat;
  posts: number;
  totalViews: Metric;
  avgViews: Metric;
  avgEngagement: Metric;
}

/** Desempenho médio por formato nos últimos `days` dias (ordenado por visualizações médias). */
export function formatBreakdown(contents: Content[], days = 30, now = new Date()): FormatRow[] {
  const recent = contents.filter((c) => inWindow(c, days, now));
  const groups = new Map<ContentFormat, Content[]>();
  recent.forEach((c) => groups.set(c.format, [...(groups.get(c.format) ?? []), c]));
  return [...groups.entries()]
    .map(([format, list]) => ({
      format,
      posts: list.length,
      totalViews: sumMetric(list.map((c) => c.metrics.views)),
      avgViews: avgMetric(list.map((c) => c.metrics.views)),
      avgEngagement: avgMetric(list.map((c) => engagementFrom(c.metrics)), 1)
    }))
    .sort((a, b) => sortValue(b.avgViews) - sortValue(a.avgViews) || b.posts - a.posts);
}

/** Posts com mais visualizações nos últimos `days` dias (somente com métrica real). */
export function topPosts(contents: Content[], limit = 5, days = 30, now = new Date()): Content[] {
  return contents
    .filter((c) => inWindow(c, days, now) && isMetric(c.metrics.views))
    .sort((a, b) => sortValue(b.metrics.views) - sortValue(a.metrics.views))
    .slice(0, limit);
}

export type FreshnessStatus = 'ok' | 'late' | 'never';

export interface ClientFreshness {
  client: Client;
  lastUpdate: string | null;
  daysAgo: number | null;
  status: FreshnessStatus;
}

/** Última atualização de métricas de cada cliente (importação de posts ou registro de seguidores). */
export function clientFreshness(clients: Client[], contents: Content[], snapshots: AccountSnapshot[], now = new Date(), lateAfterDays = 7): ClientFreshness[] {
  return clients
    .map((client) => {
      const stamps = [
        ...contents.filter((c) => c.clientId === client.id).map((c) => c.updatedAt ?? c.createdAt),
        ...snapshots.filter((s) => s.clientId === client.id).map((s) => s.sourceTimestamp)
      ].filter((s): s is string => Boolean(s) && !Number.isNaN(Date.parse(s as string)));
      const lastUpdate = stamps.length ? stamps.reduce((a, b) => (Date.parse(a) > Date.parse(b) ? a : b)) : null;
      const daysAgo = lastUpdate ? Math.max(0, Math.floor((now.getTime() - Date.parse(lastUpdate)) / DAY_MS)) : null;
      const status: FreshnessStatus = daysAgo === null ? 'never' : daysAgo > lateAfterDays ? 'late' : 'ok';
      return { client, lastUpdate, daysAgo, status };
    })
    .sort((a, b) => {
      const rank = { never: 0, late: 1, ok: 2 } as const;
      return rank[a.status] - rank[b.status] || (b.daysAgo ?? 0) - (a.daysAgo ?? 0);
    });
}

const WEEK_ORDER = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const;

/** Dia da semana (normalizado) de uma data, no fuso de Brasília. */
export function weekDayOf(now = new Date()): (typeof WEEK_ORDER)[number] {
  const dow = new Date(`${brasiliaDay(now)}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return WEEK_ORDER[(dow + 6) % 7];
}

/** Itens do calendário por dia da semana (segunda a domingo). */
export function weekPlan(items: CalendarItem[]): Array<{ day: (typeof WEEK_ORDER)[number]; items: CalendarItem[] }> {
  return WEEK_ORDER.map((day) => ({
    day,
    items: items
      .filter((i) => normalizeWeekDay(i.dayOfWeek) === day)
      .sort((a, b) => (a.timeSlot ?? '').localeCompare(b.timeSlot ?? '') || a.orderIndex - b.orderIndex)
  }));
}
