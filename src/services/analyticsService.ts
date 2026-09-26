/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Analytics Service - Mathematical and Deterministic Calculations
 * 
 * Strict rule: REAL_DATA and CALCULATED_DATA must be mathematically exact.
 * Never fabricate previous periods, never use array slice as days, never invent numbers.
 */

import { AccountSnapshot, Content, ContentFormat, Metric, PeriodComparison, PeriodAnalytics } from '../types';
import { avgMetric, isMetric, sortValue, sumMetric } from '../utils/metrics';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function formatISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Data (YYYY-MM-DD) de publicação no fuso de Brasília (UTC-3). */
function brasiliaDate(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? iso.slice(0, 10) : new Date(t - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function getDayDiff(d1: Date, d2: Date): number {
  return Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export const analyticsService = {
  /**
   * Helper to build a comparison between current and previous numbers.
   * If previous is null or zero with no data, comparison is honest.
   */
  createComparison(current: Metric, previous: Metric): PeriodComparison {
    if (current === null || previous === null || isNaN(previous)) {
      return {
        current,
        previous: null,
        absoluteDiff: null,
        percentDiff: null,
        hasSufficientData: false,
        provenance: 'REAL_DATA'
      };
    }

    const absoluteDiff = Number((current - previous).toFixed(2));
    let percentDiff: number | null = null;

    if (previous !== 0) {
      percentDiff = Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
    } else if (current > 0) {
      percentDiff = 100.0;
    } else {
      percentDiff = 0.0;
    }

    return {
      current,
      previous,
      absoluteDiff,
      percentDiff,
      hasSufficientData: true,
      provenance: 'CALCULATED_DATA'
    };
  },

  /**
   * Filter snapshots by actual calendar date range
   */
  filterSnapshotsByDate(snapshots: AccountSnapshot[], startDate: string, endDate: string): AccountSnapshot[] {
    if (!snapshots || snapshots.length === 0) return [];
    return snapshots
      .filter(s => {
        const d = s.date;
        return d >= startDate && d <= endDate;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Calculate deterministic analytics for a defined period (7, 14, 30, 90 or custom)
   */
  /**
   * Métricas do período. Quando os snapshots da conta não trazem um total (ex.: métricas
   * importadas do Meta Business Suite por post), usa a soma dos posts publicados no período.
   */
  calculatePeriod(
    snapshots: AccountSnapshot[],
    periodDaysOrCustom: 7 | 14 | 30 | 90 | 'custom',
    customRange?: DateRange,
    contents: Content[] = []
  ): PeriodAnalytics {
    if ((!snapshots || snapshots.length === 0) && contents.length === 0) {
      return this.getEmptyPeriodAnalytics(typeof periodDaysOrCustom === 'number' ? periodDaysOrCustom : 30);
    }
    snapshots = snapshots ?? [];

    // Fim do período: último snapshot disponível; sem snapshots, hoje.
    const sortedAll = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const latestAvailableDate = sortedAll.length > 0 ? sortedAll[sortedAll.length - 1].date : formatISODate(new Date());

    let startDate: string;
    let endDate: string;
    let durationDays: number;

    if (periodDaysOrCustom === 'custom' && customRange) {
      startDate = customRange.startDate;
      endDate = customRange.endDate;
      durationDays = Math.max(1, getDayDiff(parseISODate(startDate), parseISODate(endDate)));
    } else {
      durationDays = typeof periodDaysOrCustom === 'number' ? periodDaysOrCustom : 30;
      endDate = latestAvailableDate;
      const endD = parseISODate(endDate);
      const startD = new Date(endD);
      startD.setUTCDate(endD.getUTCDate() - (durationDays - 1));
      startDate = formatISODate(startD);
    }

    // Previous period range
    const curStartD = parseISODate(startDate);
    const prevEndD = new Date(curStartD);
    prevEndD.setUTCDate(curStartD.getUTCDate() - 1);
    const prevStartD = new Date(prevEndD);
    prevStartD.setUTCDate(prevEndD.getUTCDate() - (durationDays - 1));

    const prevStartDateStr = formatISODate(prevStartD);
    const prevEndDateStr = formatISODate(prevEndD);

    // Filter current and previous snapshots strictly by date
    const currentSnaps = this.filterSnapshotsByDate(snapshots, startDate, endDate);
    const previousSnaps = this.filterSnapshotsByDate(snapshots, prevStartDateStr, prevEndDateStr);

    const hasPrevious = previousSnaps.length > 0;

    // 1. Seguidores: valor final real de cada período (null se não houver dado).
    const lastFollowers = (list: AccountSnapshot[]): Metric => {
      for (let i = list.length - 1; i >= 0; i--) if (isMetric(list[i].followers)) return list[i].followers;
      return null;
    };
    const followersGrowth = this.createComparison(lastFollowers(currentSnaps), hasPrevious ? lastFollowers(previousSnaps) : null);

    // 2. Totais do período: soma apenas de valores disponíveis; null se nenhum.
    type TotalKey = 'views' | 'reach' | 'likes' | 'comments' | 'shares' | 'saves' | 'postsPublished';
    const total = (list: AccountSnapshot[], key: TotalKey): Metric =>
      sumMetric(list.map((snap) => snap[key]));

    // Posts publicados em cada janela (fallback quando a conta não tem o total).
    const postsIn = (from: string, to: string) =>
      contents.filter((c) => {
        const d = brasiliaDate(c.publishedAt);
        return d >= from && d <= to;
      });
    const currentPosts = postsIn(startDate, endDate);
    const previousPosts = postsIn(prevStartDateStr, prevEndDateStr);
    const hasPreviousPosts = contents.some((c) => brasiliaDate(c.publishedAt) < startDate);
    const postsTotal = (list: Content[], key: TotalKey): Metric =>
      key === 'postsPublished' ? list.length : sumMetric(list.map((c) => c.metrics[key]));

    const compare = (key: TotalKey) => {
      const fromSnaps = total(currentSnaps, key);
      if (isMetric(fromSnaps) || contents.length === 0) {
        return this.createComparison(fromSnaps, hasPrevious ? total(previousSnaps, key) : null);
      }
      return this.createComparison(postsTotal(currentPosts, key), hasPreviousPosts ? postsTotal(previousPosts, key) : null);
    };

    const totalViews = compare('views');
    const totalReach = compare('reach');
    const totalLikes = compare('likes');
    const totalComments = compare('comments');
    const totalShares = compare('shares');
    const totalSaves = compare('saves');
    const postsPublished = compare('postsPublished');

    // 3. Engajamento médio: interações / alcance (ponderado); senão média das taxas reais.
    const engagementOf = (list: AccountSnapshot[]): Metric => {
      const reach = total(list, 'reach');
      const interactions = sumMetric([total(list, 'likes'), total(list, 'comments'), total(list, 'shares'), total(list, 'saves')]);
      if (isMetric(reach) && reach > 0 && isMetric(interactions)) return Number(((interactions / reach) * 100).toFixed(2));
      return avgMetric(list.map((snap) => snap.engagementRate), 2);
    };
    const engagementOfPosts = (list: Content[]): Metric => {
      const withReach = list.filter((c) => isMetric(c.metrics.reach) && c.metrics.reach > 0);
      const reach = sumMetric(withReach.map((c) => c.metrics.reach));
      const interactions = sumMetric(withReach.flatMap((c) => [c.metrics.likes, c.metrics.comments, c.metrics.shares, c.metrics.saves]));
      return isMetric(reach) && reach > 0 && isMetric(interactions) ? Number(((interactions / reach) * 100).toFixed(2)) : null;
    };
    const snapEng = engagementOf(currentSnaps);
    const usePostsEng = !isMetric(snapEng) && contents.length > 0;
    const curAvgEng = usePostsEng ? engagementOfPosts(currentPosts) : snapEng;
    const prevAvgEng = usePostsEng
      ? (hasPreviousPosts ? engagementOfPosts(previousPosts) : null)
      : (hasPrevious ? engagementOf(previousSnaps) : null);

    const avgEngagementRate = this.createComparison(curAvgEng, prevAvgEng);

    return {
      periodDays: durationDays,
      startDate,
      endDate,
      followersGrowth,
      totalViews,
      totalReach,
      avgEngagementRate,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      postsPublished,
      hasPreviousPeriod: hasPrevious || hasPreviousPosts
    };
  },

  getEmptyPeriodAnalytics(periodDays: number): PeriodAnalytics {
    const today = formatISODate(new Date());
    return {
      periodDays,
      startDate: today,
      endDate: today,
      followersGrowth: this.createComparison(null, null),
      totalViews: this.createComparison(null, null),
      totalReach: this.createComparison(null, null),
      avgEngagementRate: this.createComparison(null, null),
      totalLikes: this.createComparison(null, null),
      totalComments: this.createComparison(null, null),
      totalShares: this.createComparison(null, null),
      totalSaves: this.createComparison(null, null),
      postsPublished: this.createComparison(null, null),
      hasPreviousPeriod: false
    };
  },

  /**
   * Strategic content score calculation with weighted parameters
   */
  calculateContentScore(content: Content): Metric {
    const m = content.metrics;
    if (!m) return null;
    const parts: Array<[Metric, number]> = [
      [m.saves, 3.5],
      [m.shares, 2.5],
      [m.comments, 2.0],
      [isMetric(m.reach) ? m.reach / 100 : null, 1.0],
      [isMetric(m.views) ? m.views / 200 : null, 1.0]
    ];
    const available = parts.filter((p): p is [number, number] => isMetric(p[0]));
    if (available.length === 0) return null;
    // Score calculado apenas com as métricas disponíveis (fórmula determinística).
    return Math.round(available.reduce((acc, [value, weight]) => acc + value * weight, 0));
  },

  /**
   * Ordena conteúdos; métricas indisponíveis ficam por último.
   */
  rankContents(contents: Content[], sortBy: 'score' | 'views' | 'reach' | 'saves' | 'engagement' = 'score', ascending = false): Content[] {
    if (!contents || contents.length === 0) return [];
    const pick = (c: Content): Metric => {
      if (sortBy === 'score') return this.calculateContentScore(c);
      if (sortBy === 'views') return c.metrics.views;
      if (sortBy === 'reach') return c.metrics.reach;
      if (sortBy === 'saves') return c.metrics.saves;
      return c.metrics.engagementRate;
    };
    return [...contents].sort((a, b) => {
      const va = sortValue(pick(a));
      const vb = sortValue(pick(b));
      if (va === vb) return 0;
      return ascending ? va - vb : vb - va;
    });
  },

  /**
   * Breakdown metrics by format
   */
  breakdownByFormat(contents: Content[]): Record<ContentFormat, { count: number; avgViews: Metric; avgEngagement: Metric; totalSaves: Metric }> {
    const formats: ContentFormat[] = ['Reels', 'Carrossel', 'Foto', 'Stories', 'Live'];
    const result = {} as Record<ContentFormat, { count: number; avgViews: Metric; avgEngagement: Metric; totalSaves: Metric }>;
    formats.forEach((fmt) => {
      const items = (contents || []).filter((c) => c.format === fmt);
      result[fmt] = {
        count: items.length,
        avgViews: avgMetric(items.map((c) => c.metrics.views)),
        avgEngagement: avgMetric(items.map((c) => c.metrics.engagementRate), 2),
        totalSaves: sumMetric(items.map((c) => c.metrics.saves))
      };
    });
    return result;
  }
};
