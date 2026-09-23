/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Analytics Service - Mathematical and Deterministic Calculations
 * 
 * Strict rule: REAL_DATA and CALCULATED_DATA must be mathematically exact.
 * Never fabricate previous periods, never use array slice as days, never invent numbers.
 */

import { AccountSnapshot, Content, ContentFormat, PeriodComparison, PeriodAnalytics } from '../types';

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

function getDayDiff(d1: Date, d2: Date): number {
  return Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export const analyticsService = {
  /**
   * Helper to build a comparison between current and previous numbers.
   * If previous is null or zero with no data, comparison is honest.
   */
  createComparison(current: number, previous: number | null): PeriodComparison {
    if (previous === null || isNaN(previous)) {
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
  calculatePeriod(
    snapshots: AccountSnapshot[],
    periodDaysOrCustom: 7 | 14 | 30 | 90 | 'custom',
    customRange?: DateRange
  ): PeriodAnalytics {
    if (!snapshots || snapshots.length === 0) {
      return this.getEmptyPeriodAnalytics(typeof periodDaysOrCustom === 'number' ? periodDaysOrCustom : 30);
    }

    // Determine actual start and end date
    const sortedAll = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const latestAvailableDate = sortedAll[sortedAll.length - 1].date;

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

    // 1. Followers: VALOR FINAL do período atual vs VALOR FINAL do período anterior
    const curFollowerFinal = currentSnaps.length > 0 ? currentSnaps[currentSnaps.length - 1].followers : 0;
    const prevFollowerFinal = hasPrevious ? previousSnaps[previousSnaps.length - 1].followers : null;
    const followersGrowth = this.createComparison(curFollowerFinal, prevFollowerFinal);

    // 2. Totais do período
    const curViews = currentSnaps.reduce((acc, s) => acc + s.views, 0);
    const prevViews = hasPrevious ? previousSnaps.reduce((acc, s) => acc + s.views, 0) : null;
    const totalViews = this.createComparison(curViews, prevViews);

    const curReach = currentSnaps.reduce((acc, s) => acc + s.reach, 0);
    const prevReach = hasPrevious ? previousSnaps.reduce((acc, s) => acc + s.reach, 0) : null;
    const totalReach = this.createComparison(curReach, prevReach);

    const curLikes = currentSnaps.reduce((acc, s) => acc + s.likes, 0);
    const prevLikes = hasPrevious ? previousSnaps.reduce((acc, s) => acc + s.likes, 0) : null;
    const totalLikes = this.createComparison(curLikes, prevLikes);

    const curComments = currentSnaps.reduce((acc, s) => acc + s.comments, 0);
    const prevComments = hasPrevious ? previousSnaps.reduce((acc, s) => acc + s.comments, 0) : null;
    const totalComments = this.createComparison(curComments, prevComments);

    const curShares = currentSnaps.reduce((acc, s) => acc + s.shares, 0);
    const prevShares = hasPrevious ? previousSnaps.reduce((acc, s) => acc + s.shares, 0) : null;
    const totalShares = this.createComparison(curShares, prevShares);

    const curSaves = currentSnaps.reduce((acc, s) => acc + s.saves, 0);
    const prevSaves = hasPrevious ? previousSnaps.reduce((acc, s) => acc + s.saves, 0) : null;
    const totalSaves = this.createComparison(curSaves, prevSaves);

    const curPosts = currentSnaps.reduce((acc, s) => acc + s.postsPublished, 0);
    const prevPosts = hasPrevious ? previousSnaps.reduce((acc, s) => acc + s.postsPublished, 0) : null;
    const postsPublished = this.createComparison(curPosts, prevPosts);

    // 3. Taxa média de engajamento: MÉDIA ponderada por alcance
    let curAvgEng = 0;
    if (curReach > 0) {
      const curInteractions = curLikes + curComments + curShares + curSaves;
      curAvgEng = Number(((curInteractions / curReach) * 100).toFixed(2));
    } else if (currentSnaps.length > 0) {
      curAvgEng = Number((currentSnaps.reduce((acc, s) => acc + s.engagementRate, 0) / currentSnaps.length).toFixed(2));
    }

    let prevAvgEng: number | null = null;
    if (hasPrevious && prevReach !== null) {
      if (prevReach > 0 && prevLikes !== null && prevComments !== null && prevShares !== null && prevSaves !== null) {
        const prevInteractions = prevLikes + prevComments + prevShares + prevSaves;
        prevAvgEng = Number(((prevInteractions / prevReach) * 100).toFixed(2));
      } else if (previousSnaps.length > 0) {
        prevAvgEng = Number((previousSnaps.reduce((acc, s) => acc + s.engagementRate, 0) / previousSnaps.length).toFixed(2));
      }
    }

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
      hasPreviousPeriod: hasPrevious
    };
  },

  getEmptyPeriodAnalytics(periodDays: number): PeriodAnalytics {
    const today = formatISODate(new Date());
    return {
      periodDays,
      startDate: today,
      endDate: today,
      followersGrowth: this.createComparison(0, null),
      totalViews: this.createComparison(0, null),
      totalReach: this.createComparison(0, null),
      avgEngagementRate: this.createComparison(0, null),
      totalLikes: this.createComparison(0, null),
      totalComments: this.createComparison(0, null),
      totalShares: this.createComparison(0, null),
      totalSaves: this.createComparison(0, null),
      postsPublished: this.createComparison(0, null),
      hasPreviousPeriod: false
    };
  },

  /**
   * Strategic content score calculation with weighted parameters
   */
  calculateContentScore(content: Content): number {
    const m = content.metrics;
    if (!m) return 0;

    // Weights: Saves (35%), Shares (25%), Comments (20%), Reach (10%), Views (10%)
    const savesScore = m.saves * 3.5;
    const sharesScore = m.shares * 2.5;
    const commentsScore = m.comments * 2.0;
    const reachScore = (m.reach / 100) * 1.0;
    const viewsScore = (m.views / 200) * 1.0;

    return Math.round(savesScore + sharesScore + commentsScore + reachScore + viewsScore);
  },

  /**
   * Sort contents by actual ranking criteria
   */
  rankContents(contents: Content[], sortBy: 'score' | 'views' | 'reach' | 'saves' | 'engagement' = 'score', ascending = false): Content[] {
    if (!contents || contents.length === 0) return [];
    const list = [...contents];

    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortBy === 'score') {
        valA = this.calculateContentScore(a);
        valB = this.calculateContentScore(b);
      } else if (sortBy === 'views') {
        valA = a.metrics.views;
        valB = b.metrics.views;
      } else if (sortBy === 'reach') {
        valA = a.metrics.reach;
        valB = b.metrics.reach;
      } else if (sortBy === 'saves') {
        valA = a.metrics.saves;
        valB = b.metrics.saves;
      } else if (sortBy === 'engagement') {
        valA = a.metrics.engagementRate;
        valB = b.metrics.engagementRate;
      }

      return ascending ? valA - valB : valB - valA;
    });

    return list;
  },

  /**
   * Breakdown metrics by format
   */
  breakdownByFormat(contents: Content[]): Record<ContentFormat, { count: number; avgViews: number; avgEngagement: number; totalSaves: number }> {
    const formats: ContentFormat[] = ['Reels', 'Carrossel', 'Foto', 'Stories', 'Live'];
    const result: Record<ContentFormat, { count: number; avgViews: number; avgEngagement: number; totalSaves: number }> = {
      Reels: { count: 0, avgViews: 0, avgEngagement: 0, totalSaves: 0 },
      Carrossel: { count: 0, avgViews: 0, avgEngagement: 0, totalSaves: 0 },
      Foto: { count: 0, avgViews: 0, avgEngagement: 0, totalSaves: 0 },
      Stories: { count: 0, avgViews: 0, avgEngagement: 0, totalSaves: 0 },
      Live: { count: 0, avgViews: 0, avgEngagement: 0, totalSaves: 0 }
    };

    formats.forEach(fmt => {
      const items = (contents || []).filter(c => c.format === fmt);
      if (items.length > 0) {
        const totalViews = items.reduce((acc, c) => acc + c.metrics.views, 0);
        const totalEng = items.reduce((acc, c) => acc + c.metrics.engagementRate, 0);
        const totalSaves = items.reduce((acc, c) => acc + c.metrics.saves, 0);

        result[fmt] = {
          count: items.length,
          avgViews: Math.round(totalViews / items.length),
          avgEngagement: Number((totalEng / items.length).toFixed(2)),
          totalSaves
        };
      }
    });

    return result;
  }
};
