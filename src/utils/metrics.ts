/**
 * Utilitários para métricas possivelmente indisponíveis (null).
 * Regra: ausência de dado nunca vira 0. Agregados usam apenas valores reais e
 * retornam null quando nenhum valor está disponível.
 */

import type { Metric } from '../types';

export const NOT_AVAILABLE = 'n/d';

export function isMetric(value: Metric | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function sumMetric(values: Array<Metric | undefined>): Metric {
  const real = values.filter(isMetric);
  return real.length === 0 ? null : real.reduce((acc, v) => acc + v, 0);
}

export function avgMetric(values: Array<Metric | undefined>, digits = 0): Metric {
  const real = values.filter(isMetric);
  if (real.length === 0) return null;
  const factor = 10 ** digits;
  return Math.round((real.reduce((acc, v) => acc + v, 0) / real.length) * factor) / factor;
}

export function medianMetric(values: Array<Metric | undefined>): Metric {
  const real = values.filter(isMetric).sort((a, b) => a - b);
  if (real.length === 0) return null;
  const mid = Math.floor(real.length / 2);
  return real.length % 2 ? real[mid] : (real[mid - 1] + real[mid]) / 2;
}

/** Valor para ordenação: indisponível vai para o fim (-Infinity). */
export function sortValue(value: Metric | undefined): number {
  return isMetric(value) ? value : Number.NEGATIVE_INFINITY;
}

/** Taxa de engajamento calculada = interações / alcance * 100; null se não houver base real. */
export function engagementFrom(m: { likes: Metric; comments: Metric; shares: Metric; saves: Metric; reach: Metric }): Metric {
  if (!isMetric(m.reach) || m.reach <= 0) return null;
  const interactions = sumMetric([m.likes, m.comments, m.shares, m.saves]);
  if (interactions === null) return null;
  return Number(((interactions / m.reach) * 100).toFixed(2));
}

export function formatMetric(value: Metric | undefined, options: { suffix?: string; digits?: number; fallback?: string } = {}): string {
  if (!isMetric(value)) return options.fallback ?? NOT_AVAILABLE;
  const text = options.digits !== undefined
    ? value.toLocaleString('pt-BR', { minimumFractionDigits: options.digits, maximumFractionDigits: options.digits })
    : value.toLocaleString('pt-BR');
  return `${text}${options.suffix ?? ''}`;
}

export function formatCompact(value: Metric | undefined, fallback = NOT_AVAILABLE): string {
  if (!isMetric(value)) return fallback;
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
