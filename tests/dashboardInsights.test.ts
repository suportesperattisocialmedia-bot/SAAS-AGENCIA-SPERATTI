import { describe, expect, it } from 'vitest';
import { clientFreshness, formatBreakdown, percentChange, topPosts, weekDayOf, weeklyViews } from '../src/services/dashboardInsights';
import type { Client, Content } from '../src/types';

const NOW = new Date('2026-09-26T15:00:00.000Z'); // sábado, 12h em Brasília
const post = (id: string, publishedAt: string, views: number | null, format: Content['format'] = 'Reels', clientId = 'c1') =>
  ({ id, clientId, title: id, publishedAt, format, updatedAt: publishedAt, metrics: { views, reach: views, likes: 10, comments: 0, shares: 0, saves: 0 } }) as unknown as Content;

describe('painel da agência', () => {
  it('semanas sem publicação ficam null (não zero) e a última semana termina hoje', () => {
    const weeks = weeklyViews([post('a', '2026-09-25T15:00:00Z', 100), post('b', '2026-09-24T15:00:00Z', null)], 8, NOW);
    expect(weeks).toHaveLength(8);
    expect(weeks[7]).toMatchObject({ end: '2026-09-26', posts: 2, views: 100 });
    expect(weeks[0]).toMatchObject({ posts: 0, views: null });
  });

  it('formatos ordenados por média de visualizações; top posts ignora métrica ausente', () => {
    const list = [post('r', '2026-09-20T15:00:00Z', 900), post('f', '2026-09-20T15:00:00Z', 300, 'Foto'), post('n', '2026-09-20T15:00:00Z', null, 'Carrossel')];
    expect(formatBreakdown(list, 30, NOW).map((r) => r.format)).toEqual(['Reels', 'Foto', 'Carrossel']);
    expect(topPosts(list, 5, 30, NOW).map((p) => p.id)).toEqual(['r', 'f']);
  });

  it('rotina: sem importação primeiro, depois atrasados, depois em dia', () => {
    const clients = [{ id: 'ok', name: 'A' }, { id: 'late', name: 'B' }, { id: 'none', name: 'C' }] as Client[];
    const rows = clientFreshness(clients, [post('x', '2026-09-25T15:00:00Z', 1, 'Reels', 'ok'), post('y', '2026-09-10T15:00:00Z', 1, 'Reels', 'late')], [], NOW);
    expect(rows.map((r) => [r.client.id, r.status])).toEqual([['none', 'never'], ['late', 'late'], ['ok', 'ok']]);
  });

  it('variação só com base anterior real e dia da semana em Brasília', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(150, null)).toBeNull();
    expect(percentChange(150, 0)).toBeNull();
    expect(weekDayOf(NOW)).toBe('sabado');
    expect(weekDayOf(new Date('2026-09-27T02:00:00Z'))).toBe('sabado'); // 23h de sábado em Brasília
  });
});
