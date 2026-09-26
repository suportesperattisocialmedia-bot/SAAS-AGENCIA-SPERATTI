import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Content, Metric } from '../../types';
import { engagementFrom, formatMetric, sortValue } from '../../utils/metrics';
import { formatDateBR } from '../../utils/dates';

type SortKey = 'publishedAt' | 'views' | 'reach' | 'likes' | 'comments' | 'saves' | 'shares' | 'engagement';

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'views', label: 'Views' },
  { key: 'reach', label: 'Alcance' },
  { key: 'likes', label: 'Curtidas' },
  { key: 'comments', label: 'Coment.' },
  { key: 'saves', label: 'Salvos' },
  { key: 'shares', label: 'Compart.' },
  { key: 'engagement', label: 'Eng. %' }
];

function metricOf(c: Content, key: SortKey): Metric {
  if (key === 'engagement') return c.metrics.engagementRate ?? engagementFrom(c.metrics);
  if (key === 'publishedAt') return Date.parse(c.publishedAt);
  return c.metrics[key];
}

/** Tabela de todos os posts, ordenável por qualquer métrica (n/d sempre vai para o fim). */
export const PostsTable: React.FC<{ contents: Content[]; limit: number; onOpen: (c: Content) => void }> = ({ contents, limit, onOpen }) => {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'desc' | 'asc' }>({ key: 'publishedAt', dir: 'desc' });

  const sorted = useMemo(() => {
    const factor = sort.dir === 'desc' ? -1 : 1;
    return [...contents].sort((a, b) => {
      const va = metricOf(a, sort.key);
      const vb = metricOf(b, sort.key);
      // Métrica indisponível fica sempre no fim, em qualquer direção.
      if (va === null && vb !== null) return 1;
      if (vb === null && va !== null) return -1;
      return factor * (sortValue(va) - sortValue(vb));
    });
  }, [contents, sort]);

  const header = (key: SortKey, label: string, align = 'text-right') => {
    const active = sort.key === key;
    const Icon = sort.dir === 'desc' ? ArrowDown : ArrowUp;
    return (
      <th className={`px-3 py-3 font-medium ${align}`} aria-sort={active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
        <button
          type="button"
          onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))}
          className={`inline-flex items-center gap-1 transition-colors hover:text-neutral-200 ${active ? 'text-amber-400' : ''}`}
        >
          {label}
          {active && <Icon className="h-3 w-3" />}
        </button>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto rounded-[24px] border border-white/[0.06] bg-[#161618]">
      <table className="w-full min-w-[860px] text-xs">
        <thead>
          <tr className="text-left text-[11px] text-neutral-500">
            {header('publishedAt', 'Data', 'text-left')}
            <th className="px-3 py-3 font-medium">Publicação</th>
            <th className="px-3 py-3 font-medium">Formato</th>
            {COLUMNS.map((c) => header(c.key, c.label))}
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, limit).map((c) => (
            <tr key={c.id} onClick={() => onOpen(c)} className="cursor-pointer border-t border-white/[0.04] transition-colors hover:bg-white/[0.03]">
              <td className="whitespace-nowrap px-3 py-2.5 text-neutral-400 tabular-nums">{formatDateBR(c.publishedAt)}</td>
              <td className="max-w-[280px] truncate px-3 py-2.5 text-neutral-100">{c.title}</td>
              <td className="px-3 py-2.5">
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-neutral-300">{c.format}</span>
              </td>
              {COLUMNS.map((col) => (
                <td key={col.key} className={`px-3 py-2.5 text-right tabular-nums ${sort.key === col.key ? 'font-semibold text-neutral-50' : 'text-neutral-300'}`}>
                  {formatMetric(metricOf(c, col.key), col.key === 'engagement' ? { suffix: '%', digits: 1 } : {})}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
