import { describe, expect, it } from 'vitest';
import { mergeCollections } from '../src/services/sync/merge';

describe('mergeCollections', () => {
  it('primeira sincronização (sem base) une os dois lados', () => {
    const out = mergeCollections([{ id: 'a' }], [{ id: 'b' }], null);
    expect(out.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('mesmo item: fica a versão mais recente', () => {
    const out = mergeCollections(
      [{ id: 'a', status: 'doing', updatedAt: '2026-09-01T10:00:00Z' }],
      [{ id: 'a', status: 'approved', updatedAt: '2026-09-01T11:00:00Z' }],
      new Set(['a'])
    );
    expect(out).toEqual([{ id: 'a', status: 'approved', updatedAt: '2026-09-01T11:00:00Z' }]);
  });

  it('apagado aqui não volta; apagado lá também some aqui', () => {
    const base = new Set(['a', 'b']);
    const local = [{ id: 'b' }, { id: 'c' }]; // apaguei "a", criei "c"
    const remote = [{ id: 'a' }, { id: 'd' }]; // outro aparelho apagou "b", criou "d"
    expect(mergeCollections(local, remote, base).map((i) => i.id)).toEqual(['c', 'd']);
  });

  it('mantém a ordem local e itens sem id', () => {
    const out = mergeCollections([{ id: 'b' }, { x: 1 }, { id: 'a' }], [{ id: 'a' }, { id: 'b' }], new Set(['a', 'b']));
    expect(out).toEqual([{ id: 'b' }, { x: 1 }, { id: 'a' }]);
  });
});
