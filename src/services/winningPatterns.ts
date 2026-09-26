/**
 * Padrões vencedores de um cliente, calculados só com os posts importados:
 * dia da semana, faixa de horário e formato com mais visualizações médias,
 * ritmo de publicação e posts de melhor desempenho. Amostra pequena é sinalizada.
 */

import type { Content, Metric } from '../types';
import { avgMetric, engagementFrom, isMetric, sortValue } from '../utils/metrics';
import { brasiliaDay } from './dashboardInsights';
import { weekDayLabel } from './storage/migration';

const DAY_MS = 24 * 3600 * 1000;
const WEEKDAYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;

export interface Bucket {
  key: string;
  label: string;
  posts: number;
  avgViews: Metric;
  avgEngagement: Metric;
}

export interface WinningPatterns {
  periodDays: number;
  sample: number;
  weekdays: Bucket[];
  /** null quando o CSV não trouxe horários confiáveis. */
  hourBands: Bucket[] | null;
  formats: Bucket[];
  bestWeekday: Bucket | null;
  bestHourBand: Bucket | null;
  bestFormat: Bucket | null;
  /** Posts por semana nas últimas 4 semanas (null sem dados). */
  cadencePerWeek: number | null;
  topPosts: Content[];
  /** Menos de 6 posts com visualizações: tratar como indício, não conclusão. */
  lowSample: boolean;
}

export const HOUR_BANDS = [
  { key: 'madrugada', label: 'Madrugada (0h-6h)', from: 0, to: 6 },
  { key: 'manha', label: 'Manhã (6h-12h)', from: 6, to: 12 },
  { key: 'tarde', label: 'Tarde (12h-18h)', from: 12, to: 18 },
  { key: 'noite', label: 'Noite (18h-24h)', from: 18, to: 24 }
] as const;

/** Hora e minuto no fuso de Brasília (UTC-3). */
function brasiliaTime(iso: string): { h: number; m: number } {
  const d = new Date(Date.parse(iso) - 3 * 3600 * 1000);
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
}

function bucket(key: string, label: string, list: Content[]): Bucket {
  return {
    key,
    label,
    posts: list.length,
    avgViews: avgMetric(list.map((c) => c.metrics.views)),
    avgEngagement: avgMetric(list.map((c) => engagementFrom(c.metrics)), 1)
  };
}

/** Melhor grupo por visualizações médias, preferindo grupos com pelo menos 2 posts. */
function best(list: Bucket[]): Bucket | null {
  const withData = list.filter((b) => isMetric(b.avgViews));
  const solid = withData.filter((b) => b.posts >= 2);
  const pool = solid.length ? solid : withData;
  if (pool.length === 0) return null;
  return pool.reduce((a, b) => (sortValue(b.avgViews) > sortValue(a.avgViews) ? b : a));
}

export function computeWinningPatterns(contents: Content[], now = new Date(), periodDays = 90): WinningPatterns {
  const start = brasiliaDay(now.getTime() - (periodDays - 1) * DAY_MS);
  const recent = contents.filter((c) => brasiliaDay(c.publishedAt) >= start);
  const withViews = recent.filter((c) => isMetric(c.metrics.views));

  const weekdays = WEEKDAYS.map((d, i) => {
    const list = withViews.filter((c) => new Date(`${brasiliaDay(c.publishedAt)}T12:00:00Z`).getUTCDay() === i);
    return bucket(d, weekDayLabel(d), list);
  });
  // Segunda a domingo na exibição.
  const weekdaysOrdered = [...weekdays.slice(1), weekdays[0]];

  // Exportações sem horário entram às 12:00 exatas; se for a maioria, não há horário confiável.
  const noon = withViews.filter((c) => {
    const t = brasiliaTime(c.publishedAt);
    return t.h === 12 && t.m === 0;
  }).length;
  const hoursReliable = withViews.length > 0 && noon / withViews.length <= 0.5;
  const hourBands = hoursReliable
    ? HOUR_BANDS.map((b) =>
        bucket(
          b.key,
          b.label,
          withViews.filter((c) => {
            const { h } = brasiliaTime(c.publishedAt);
            return h >= b.from && h < b.to;
          })
        )
      )
    : null;

  const formatsMap = new Map<string, Content[]>();
  withViews.forEach((c) => formatsMap.set(c.format, [...(formatsMap.get(c.format) ?? []), c]));
  const formats = [...formatsMap.entries()]
    .map(([f, list]) => bucket(f, f, list))
    .sort((a, b) => sortValue(b.avgViews) - sortValue(a.avgViews));

  const fourWeeksAgo = brasiliaDay(now.getTime() - 27 * DAY_MS);
  const last4 = recent.filter((c) => brasiliaDay(c.publishedAt) >= fourWeeksAgo).length;

  return {
    periodDays,
    sample: withViews.length,
    weekdays: weekdaysOrdered,
    hourBands,
    formats,
    bestWeekday: best(weekdays),
    bestHourBand: hourBands ? best(hourBands) : null,
    bestFormat: best(formats),
    cadencePerWeek: recent.length ? Math.round((last4 / 4) * 10) / 10 : null,
    topPosts: [...withViews].sort((a, b) => sortValue(b.metrics.views) - sortValue(a.metrics.views)).slice(0, 5),
    lowSample: withViews.length < 6
  };
}
