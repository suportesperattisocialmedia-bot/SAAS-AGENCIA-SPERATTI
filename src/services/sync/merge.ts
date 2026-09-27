/**
 * Mesclagem de três vias de uma coleção (local x nuvem), por id.
 * "base" = ids que existiam na última sincronização bem-sucedida. Com ela dá para
 * distinguir "apagado aqui" de "criado lá" e nada apagado volta sozinho.
 */

type Item = Record<string, unknown>;

const idOf = (item: Item): string | null => (typeof item.id === 'string' ? item.id : null);

function stamp(item: Item): number {
  const v = item.updatedAt ?? item.createdAt ?? item.generatedAt ?? item.startedAt;
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

export function mergeCollections(local: Item[], remote: Item[], base: Set<string> | null): Item[] {
  const localById = new Map<string, Item>();
  local.forEach((i) => {
    const id = idOf(i);
    if (id) localById.set(id, i);
  });
  const remoteById = new Map<string, Item>();
  remote.forEach((i) => {
    const id = idOf(i);
    if (id) remoteById.set(id, i);
  });

  const out: Item[] = [];
  const seen = new Set<string>();
  // A ordem local manda (ordem do kanban, calendário etc.); novidades da nuvem entram no fim.
  for (const item of local) {
    const id = idOf(item);
    if (!id) {
      out.push(item);
      continue;
    }
    seen.add(id);
    const theirs = remoteById.get(id);
    if (!theirs) {
      // Sumiu da nuvem: se já tinha sido sincronizado, foi apagado em outro lugar.
      if (base?.has(id)) continue;
      out.push(item);
    } else {
      out.push(stamp(theirs) > stamp(item) ? theirs : item);
    }
  }
  for (const item of remote) {
    const id = idOf(item);
    if (!id || seen.has(id)) continue;
    // Existe só na nuvem: se já existia na base, foi apagado aqui.
    if (base?.has(id)) continue;
    out.push(item);
  }
  return out;
}

export function idsOf(items: Item[]): string[] {
  return items.map(idOf).filter((id): id is string => id !== null);
}
