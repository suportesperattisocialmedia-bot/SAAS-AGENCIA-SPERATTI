import { describe, expect, it } from 'vitest';
import { analyticsService } from '../src/services/analyticsService';
import { avgMetric, engagementFrom, formatMetric, sumMetric } from '../src/utils/metrics';
import type { AccountSnapshot, Content } from '../src/types';
import { ReportSchema } from '../src/schemas';
import { normalizeWeekDay, weekDayLabel } from '../src/services/storage/migration';

function snap(date: string, patch: Partial<AccountSnapshot> = {}): AccountSnapshot {
  return {
    id: `s-${date}`,
    clientId: 'c1',
    date,
    followers: null,
    reach: null,
    views: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    profileVisits: null,
    websiteClicks: null,
    postsPublished: null,
    engagementRate: null,
    source: 'META_API',
    sourceTimestamp: `${date}T12:00:00.000Z`,
    ...patch
  };
}

describe('métricas indisponíveis', () => {
  it('agregados ignoram null e retornam null quando não há nenhum dado', () => {
    expect(sumMetric([null, null])).toBeNull();
    expect(sumMetric([1, null, 2])).toBe(3);
    expect(avgMetric([null])).toBeNull();
    expect(avgMetric([2, null, 4])).toBe(3);
    expect(formatMetric(null)).toBe('n/d');
    expect(formatMetric(1234)).toBe('1.234');
  });

  it('engajamento só é calculado com alcance real', () => {
    expect(engagementFrom({ likes: 10, comments: 0, shares: null, saves: null, reach: null })).toBeNull();
    expect(engagementFrom({ likes: null, comments: null, shares: null, saves: null, reach: 100 })).toBeNull();
    expect(engagementFrom({ likes: 8, comments: 2, shares: null, saves: null, reach: 200 })).toBe(5);
  });
});

describe('analyticsService', () => {
  it('não inventa período anterior quando não há histórico', () => {
    const res = analyticsService.calculatePeriod([snap('2026-09-20', { followers: 1000, views: 500 })], 7);
    expect(res.hasPreviousPeriod).toBe(false);
    expect(res.followersGrowth.previous).toBeNull();
    expect(res.followersGrowth.percentDiff).toBeNull();
    expect(res.totalViews.current).toBe(500);
    expect(res.totalReach.current).toBeNull(); // sem alcance => null, não 0
  });

  it('compara com o período anterior apenas usando snapshots reais', () => {
    const data = [snap('2026-09-01', { followers: 900, views: 100 }), snap('2026-09-10', { followers: 1000, views: 300 })];
    const res = analyticsService.calculatePeriod(data, 7);
    expect(res.hasPreviousPeriod).toBe(true);
    expect(res.followersGrowth).toMatchObject({ current: 1000, previous: 900, percentDiff: 11.1 });
    expect(res.totalViews).toMatchObject({ current: 300, previous: 100 });
  });

  it('sem snapshots retorna tudo null', () => {
    const res = analyticsService.calculatePeriod([], 30);
    expect(res.followersGrowth.current).toBeNull();
    expect(res.avgEngagementRate.current).toBeNull();
  });
});

describe('período calculado a partir dos posts importados (sem snapshots da conta)', () => {
  const post = (publishedAt: string, views: number | null, reach: number | null) =>
    ({ publishedAt, metrics: { views, reach, likes: 10, comments: 2, shares: 1, saves: 7 } }) as unknown as Content;

  it('soma visualizações/alcance dos posts do período e conta as publicações', () => {
    const today = new Date().toISOString().slice(0, 10);
    const recent = `${today}T15:00:00.000Z`;
    const period = analyticsService.calculatePeriod([], 30, undefined, [post(recent, 1000, 800), post(recent, null, 200)]);
    expect(period.totalViews.current).toBe(1000);
    expect(period.totalReach.current).toBe(1000);
    expect(period.postsPublished.current).toBe(2);
    expect(period.avgEngagementRate.current).toBe(4); // (20+4+2+14)/1000
    expect(period.hasPreviousPeriod).toBe(false);
  });

  it('seguidores registrados continuam vindo do snapshot; visualizações dos posts', () => {
    const today = new Date().toISOString().slice(0, 10);
    const period = analyticsService.calculatePeriod([snap(today, { followers: 8500, source: 'MANUAL' })], 30, undefined, [post(`${today}T15:00:00.000Z`, 500, 400)]);
    expect(period.followersGrowth.current).toBe(8500);
    expect(period.totalViews.current).toBe(500);
  });
});

describe('regressões encontradas no QA do navegador', () => {
  it('relatório aceita KPIs indisponíveis (null) em vez de quebrar', () => {
    const kpis = ReportSchema.shape.kpis.parse({ followers: null, views: null, reach: null, engagementRate: null, postsCount: 0 });
    expect(kpis.views).toBeNull();
  });

  it('dia da semana salvo normalizado tem rótulo legível', () => {
    expect(weekDayLabel('terca')).toBe('Terça-feira');
    expect(weekDayLabel(normalizeWeekDay('Sábado'))).toBe('Sábado');
  });
});
