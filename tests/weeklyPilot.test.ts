import { describe, expect, it } from 'vitest';
import { computeWinningPatterns } from '../src/services/winningPatterns';
import { buildWeeklyPlanPrompt, nextMonday, parseWeeklyPlan, weekdayOfDate } from '../src/ai/weeklyPilot';
import type { Client, Content } from '../src/types';

const NOW = new Date('2026-09-26T15:00:00.000Z'); // sábado
const post = (publishedAt: string, views: number | null, format: Content['format'] = 'Reels') =>
  ({ id: publishedAt, clientId: 'c1', title: 't', caption: 'c', pillar: 'Geral', publishedAt, format, metrics: { views, reach: views, likes: 5, comments: 1, shares: 1, saves: 3 } }) as unknown as Content;

describe('padrões vencedores', () => {
  it('encontra melhor dia, faixa de horário e formato com amostra real', () => {
    const list = [
      post('2026-09-22T22:00:00Z', 5000), // terça 19h
      post('2026-09-15T22:30:00Z', 4000), // terça 19h30
      post('2026-09-17T13:00:00Z', 900, 'Carrossel'), // quinta 10h
      post('2026-09-10T13:00:00Z', 700, 'Carrossel'), // quinta 10h
      post('2026-09-24T13:00:00Z', null, 'Foto')
    ];
    const p = computeWinningPatterns(list, NOW);
    expect(p.sample).toBe(4);
    expect(p.lowSample).toBe(true);
    expect(p.bestWeekday?.key).toBe('terca');
    expect(p.bestHourBand?.key).toBe('noite');
    expect(p.bestFormat?.key).toBe('Reels');
    expect(p.topPosts[0].metrics.views).toBe(5000);
  });

  it('não inventa horário quando o CSV veio sem hora (tudo às 12:00)', () => {
    const p = computeWinningPatterns([post('2026-09-22T15:00:00Z', 10), post('2026-09-23T15:00:00Z', 20)], NOW);
    expect(p.hourBands).toBeNull();
    expect(p.bestHourBand).toBeNull();
  });

  it('sem posts: nada de melhor dia ou formato', () => {
    const p = computeWinningPatterns([], NOW);
    expect(p).toMatchObject({ sample: 0, bestWeekday: null, bestFormat: null, cadencePerWeek: null });
  });
});

describe('piloto da semana', () => {
  it('semana começa na próxima segunda; dia da semana por data', () => {
    expect(nextMonday(NOW)).toBe('2026-09-28');
    expect(nextMonday(new Date('2026-09-28T15:00:00Z'))).toBe('2026-10-05');
    expect(weekdayOfDate('2026-09-30')).toBe('quarta');
  });

  it('prompt leva padrões, período e quantidade', () => {
    const client = { name: 'Lumen', instagram: '@lumen', objectives: [], pillars: ['Obra'], formats: ['Reels'] } as unknown as Client;
    const patterns = computeWinningPatterns([post('2026-09-22T22:00:00Z', 5000), post('2026-09-15T22:30:00Z', 4000)], NOW);
    const text = buildWeeklyPlanPrompt({ client, patterns, contents: [], ideas: [], audienceInsights: [], weekStart: '2026-09-28', postsCount: 4 });
    expect(text).toContain('exatamente 4 publicações');
    expect(text).toContain('Melhor dia da semana: Terça-feira');
    expect(text).toContain('entre 2026-09-28 e 2026-10-04');
  });

  it('lê a resposta com variações de escrita e ordena por data', () => {
    const plan = parseWeeklyPlan('```json\n{"posts":[{"date":"2026-10-01","time":"19h","format":"reel","title":"B"},{"date":"2026-09-29","time":"18:30","format":"carousel","title":"A"}]}\n```');
    expect(plan.map((p) => [p.title, p.format, p.time])).toEqual([['A', 'Carrossel', '18:30'], ['B', 'Reels', '19:00']]);
  });

  it('recusa resposta sem posts ou com data inválida', () => {
    expect(() => parseWeeklyPlan('{"posts":[]}')).toThrow('posts');
    expect(() => parseWeeklyPlan('{"posts":[{"date":"29/09","format":"Reels","title":"x"}]}')).toThrow('date');
  });
});
