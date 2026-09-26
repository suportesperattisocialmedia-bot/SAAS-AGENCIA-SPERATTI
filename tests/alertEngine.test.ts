import { describe, expect, it, beforeEach, vi } from 'vitest';

// Armazenamento em memória para o motor de alertas (roda fora do navegador).
const mem = new Map<string, unknown>();
vi.mock('../src/services/storage/LocalStorageAdapter', () => ({
  defaultStorageAdapter: {
    getCollection: (k: string) => (mem.get(k) as unknown[]) ?? [],
    setCollection: (k: string, v: unknown[]) => void mem.set(k, v)
  }
}));

import { alertEngine } from '../src/services/alerts/alertEngine';
import type { Client, Content } from '../src/types';

const client = { id: 'c1', name: 'Lumen' } as Client;
const day = (daysAgo: number) => new Date(Date.now() - daysAgo * 864e5).toISOString();
const post = (daysAgo: number, views: number, saves = 10): Content =>
  ({ id: `p${daysAgo}-${views}`, clientId: 'c1', title: `Post ${daysAgo}`, publishedAt: day(daysAgo), format: 'Reels', metrics: { views, reach: views, likes: 1, comments: 0, shares: 0, saves } }) as unknown as Content;

describe('alertas no fluxo por CSV', () => {
  beforeEach(() => mem.clear());

  it('detecta queda semanal com base mínima de posts', () => {
    const list = [post(1, 100), post(2, 100), post(9, 1000), post(10, 1000)];
    const out = alertEngine.evaluateClientRules(client, [], list);
    expect(out.some((a) => a.type === 'QUEDA DE PERFORMANCE')).toBe(true);
  });

  it('não alarma queda quando a semana tem só 1 post', () => {
    const out = alertEngine.evaluateClientRules(client, [], [post(1, 100), post(9, 1000), post(10, 1000)]);
    expect(out.some((a) => a.type === 'QUEDA DE PERFORMANCE')).toBe(false);
  });

  it('limita destaques a 3, só dos últimos 30 dias, e resolvido não volta', () => {
    const list = [...Array.from({ length: 20 }, (_, i) => post(i + 1, 100, 5)), ...[2, 3, 4, 5, 6].map((d) => post(d, 100, 400)), post(60, 100, 900)];
    const first = alertEngine.evaluateClientRules(client, [], list).filter((a) => a.type === 'CONTEÚDO ACIMA DA MÉDIA');
    expect(first).toHaveLength(3);
    expect(first.some((a) => a.title.includes('Post 60'))).toBe(false);
    first.forEach((a) => alertEngine.updateStatus(a.id, 'RESOLVED'));
    const again = alertEngine.evaluateClientRules(client, [], list).filter((a) => a.type === 'CONTEÚDO ACIMA DA MÉDIA');
    expect(again.map((a) => a.title)).not.toContain(first[0].title);
  });
});
