import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowUp, ArrowUpRight, CalendarDays, Eye, Heart, LayoutGrid, Radar, Trophy, Upload } from 'lucide-react';
import type { CalendarItem, Client, Content, ContentFormat, Metric } from '../../types';
import { engagementFrom, formatCompact, formatMetric, isMetric } from '../../utils/metrics';
import { weekDayLabel } from '../../services/storage/migration';
import type { ClientFreshness, FormatRow, WeekPoint } from '../../services/dashboardInsights';

/*
 * Painel da agência no estilo "cards escuros arredondados + um card claro em destaque".
 * Raio único: cards 28px, controles em pílula. Acento: âmbar da marca.
 */

const CARD = 'rounded-[28px] bg-[#161618] border border-white/[0.04]';

/** Card com entrada suave (desligada com prefers-reduced-motion). */
export const Card: React.FC<{ className?: string; delay?: number; children: React.ReactNode }> = ({ className = '', delay = 0, children }) => {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`${CARD} ${className}`}
    >
      {children}
    </motion.section>
  );
};

/** Botão circular (ação real) no canto dos cards. */
export const RoundAction: React.FC<{ onClick: () => void; label: string; light?: boolean }> = ({ onClick, label, light }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform hover:scale-105 active:scale-95 ${
      light ? 'bg-neutral-50 text-neutral-950' : 'bg-white/[0.07] text-neutral-200 hover:bg-white/[0.12]'
    }`}
  >
    <ArrowUpRight className="h-4 w-4" />
  </button>
);

/** Pílula de variação: verde para cima, vermelha para baixo. */
export const DeltaPill: React.FC<{ value: number | null; suffix?: string }> = ({ value, suffix = '%' }) => {
  if (value === null) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
        up ? 'bg-emerald-400/90 text-emerald-950' : 'bg-rose-400/90 text-rose-950'
      }`}
    >
      <Icon className="h-3 w-3" strokeWidth={3} />
      {Math.abs(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
      {suffix}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* KPIs                                                                 */
/* ------------------------------------------------------------------ */

export const KpiCard: React.FC<{
  label: string;
  value: string;
  delta: number | null;
  icon: React.ElementType;
  highlight?: boolean;
  delay?: number;
}> = ({ label, value, delta, icon: Icon, highlight, delay }) => {
  const empty = value === 'Sem dados';
  return (
    <Card delay={delay} className={`flex min-h-[140px] flex-col justify-between p-4 sm:min-h-[168px] sm:p-5 ${highlight ? '!bg-neutral-50 !border-transparent' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium ${highlight ? 'text-neutral-700' : 'text-neutral-300'}`}>{label}</p>
        <span className={`grid h-10 w-10 place-items-center rounded-full ${highlight ? 'bg-amber-500 text-neutral-950' : 'bg-white/[0.07] text-neutral-300'}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`text-2xl sm:text-[32px] font-semibold leading-none tracking-tight tabular-nums ${
              empty ? (highlight ? 'text-neutral-400' : 'text-neutral-600') : highlight ? 'text-neutral-950' : 'text-neutral-50'
            }`}
          >
            {value}
          </p>
          <DeltaPill value={delta} />
        </div>
        <p className="hidden text-[11px] text-neutral-500 sm:block">
          {delta === null ? 'Últimos 30 dias' : 'Últimos 30 dias vs anteriores'}
        </p>
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Barras semanais                                                      */
/* ------------------------------------------------------------------ */

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => n <= s) ?? 10;
  return step * pow;
}

export const WeeklyViewsChart: React.FC<{ weeks: WeekPoint[]; delay?: number; onOpen?: () => void }> = ({ weeks, delay, onOpen }) => {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const rawMax = Math.max(0, ...weeks.map((w) => w.views ?? 0));
  const max = niceMax(rawMax);
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((r) => r * max);
  const current = weeks[weeks.length - 1];
  const previous = weeks[weeks.length - 2];
  const wow =
    current && previous && isMetric(current.views) && isMetric(previous.views) && previous.views > 0
      ? Number((((current.views - previous.views) / previous.views) * 100).toFixed(1))
      : null;

  return (
    <Card delay={delay} className="flex flex-col p-5 lg:col-span-3 lg:row-span-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h3 className="text-lg font-semibold text-neutral-50">Visualizações</h3>
          <span className="text-xs text-neutral-500">Por semana de publicação</span>
          <DeltaPill value={wow} />
        </div>
        {onOpen && <RoundAction onClick={onOpen} label="Abrir performance" light />}
      </div>

      {rawMax === 0 ? (
        <p className="mt-10 max-w-[44ch] text-sm text-neutral-500">
          Importe o CSV do Meta Business Suite na aba Métricas de um cliente para ver a evolução semanal.
        </p>
      ) : (
        <div className="mt-6 grid flex-1 grid-cols-[auto_1fr] gap-3">
          <div className="flex h-[220px] flex-col justify-between text-right text-[11px] tabular-nums text-neutral-500">
            {ticks.map((t) => (
              <span key={t} className="leading-none">{formatCompact(t)}</span>
            ))}
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[220px] flex-col justify-between">
              {ticks.map((t) => (
                <span key={t} className="block border-t border-dashed border-white/[0.06]" />
              ))}
            </div>
            <div className="relative flex h-[220px] items-end gap-2 sm:gap-3" onMouseLeave={() => setHover(null)}>
              {weeks.map((w, i) => {
                const pct = isMetric(w.views) ? Math.max(3, (w.views / max) * 100) : 0;
                const active = hover === i;
                return (
                  <button
                    key={w.start}
                    type="button"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    aria-label={`Semana de ${ddmm(w.start)} a ${ddmm(w.end)}: ${w.posts === 0 ? 'sem publicação' : `${formatMetric(w.views)} visualizações em ${w.posts} posts`}`}
                    className="relative flex h-full flex-1 items-end focus:outline-none"
                  >
                    {active && (
                      <span className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-50 px-2 py-1 text-[11px] font-semibold text-neutral-950 shadow-lg"
                        style={{ bottom: `calc(${pct}% + 8px)` }}
                      >
                        {w.posts === 0 ? 'Sem posts' : `${formatMetric(w.views)} · ${w.posts} post${w.posts > 1 ? 's' : ''}`}
                      </span>
                    )}
                    {w.posts === 0 ? (
                      <span className="block h-1.5 w-full rounded-full bg-white/[0.06]" />
                    ) : (
                      <motion.span
                        initial={reduce ? false : { scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: `${pct}%`, transformOrigin: 'bottom' }}
                        className={`block w-full rounded-[10px] transition-colors ${
                          active ? 'bg-amber-300' : i === weeks.length - 1 ? 'bg-amber-400' : 'bg-amber-500'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2 sm:gap-3">
              {weeks.map((w, i) => (
                <span key={w.start} className="flex-1 text-center text-[10px] tabular-nums text-neutral-500">
                  {i === weeks.length - 1 ? 'Esta sem.' : ddmm(w.start)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Números grandes (par unido pelo botão central)                       */
/* ------------------------------------------------------------------ */

export const BigNumberPair: React.FC<{
  left: { value: number; unit: string; text: React.ReactNode; icon: React.ElementType };
  right: { value: number; unit: string; text: React.ReactNode; icon: React.ElementType };
  onCenter: () => void;
  centerLabel: string;
  delay?: number;
}> = ({ left, right, onCenter, centerLabel, delay }) => {
  const Side: React.FC<{ d: typeof left; className?: string }> = ({ d, className = '' }) => {
    const Icon = d.icon;
    return (
      <div className={`${CARD} relative flex min-h-[150px] flex-col justify-between gap-6 overflow-hidden p-5 sm:min-h-[200px] ${className}`}>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.07] text-neutral-300">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="flex items-baseline gap-2 text-neutral-50">
            <span className="text-5xl font-semibold tracking-tight tabular-nums">{d.value}</span>
            <span className="text-xl text-neutral-300">{d.unit}</span>
          </p>
          <p className="mt-2 text-xs text-neutral-400">{d.text}</p>
        </div>
      </div>
    );
  };
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-2"
    >
      <Side d={left} />
      <Side d={right} className="bg-[radial-gradient(120%_90%_at_100%_0%,rgba(245,158,11,0.14),transparent_60%),#161618]" />
      <span className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-950 p-1.5 sm:block">
        <RoundAction onClick={onCenter} label={centerLabel} light />
      </span>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/* Donut de formatos                                                    */
/* ------------------------------------------------------------------ */

const FORMAT_COLORS: Record<ContentFormat, string> = {
  Reels: '#f59e0b',
  Carrossel: '#38bdf8',
  Foto: '#34d399',
  Stories: '#fb7185',
  Live: '#a3a3a3'
};

export const FormatDonut: React.FC<{ rows: FormatRow[]; delay?: number }> = ({ rows, delay }) => {
  const withViews = rows.filter((r) => isMetric(r.totalViews) && r.totalViews > 0);
  const total = withViews.reduce((acc, r) => acc + (r.totalViews ?? 0), 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <Card delay={delay} className="p-5 lg:col-span-2">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold text-neutral-50">Formatos</h3>
        <span className="text-xs text-neutral-500">Participação nas visualizações, 30 dias</span>
      </div>
      {total === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">Sem visualizações registradas nos últimos 30 dias.</p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
          <svg viewBox="0 0 120 120" className="h-40 w-40 shrink-0 -rotate-90" role="img" aria-label="Participação de cada formato nas visualizações">
            {withViews.map((r) => {
              const share = (r.totalViews ?? 0) / total;
              const len = Math.max(0, share * C - 2);
              const el = (
                <circle
                  key={r.format}
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke={FORMAT_COLORS[r.format]}
                  strokeWidth="22"
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += share * C;
              return el;
            })}
          </svg>
          <ul className="w-full space-y-2.5">
            {withViews.map((r) => (
              <li key={r.format} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-neutral-200">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: FORMAT_COLORS[r.format] }} />
                  {r.format}
                  <span className="text-xs text-neutral-500">{r.posts} post{r.posts > 1 ? 's' : ''}</span>
                </span>
                <span className="text-right tabular-nums">
                  <span className="text-neutral-100">{Math.round(((r.totalViews ?? 0) / total) * 100)}%</span>
                  <span className="ml-2 text-xs text-neutral-500">méd. {formatCompact(r.avgViews)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Top publicações                                                      */
/* ------------------------------------------------------------------ */

export const TopPostsPanel: React.FC<{ posts: Content[]; clientsById: Map<string, Client>; onOpen: (client: Client) => void; delay?: number }> = ({
  posts,
  clientsById,
  onOpen,
  delay
}) => (
  <Card delay={delay} className="p-5 lg:col-span-3">
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-500 text-neutral-950">
        <Trophy className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-lg font-semibold text-neutral-50">Publicações em destaque</h3>
        <p className="text-xs text-neutral-500">Mais visualizadas nos últimos 30 dias</p>
      </div>
    </div>
    {posts.length === 0 ? (
      <p className="mt-6 text-sm text-neutral-500">Nenhuma publicação com visualizações nos últimos 30 dias.</p>
    ) : (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-[11px] text-neutral-500">
              <th className="pb-2 pl-3 font-medium">Publicação</th>
              <th className="pb-2 font-medium">Cliente</th>
              <th className="pb-2 font-medium">Formato</th>
              <th className="pb-2 text-right font-medium">Views</th>
              <th className="pb-2 pr-3 text-right font-medium">Eng.</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, i) => {
              const client = clientsById.get(post.clientId);
              return (
                <tr
                  key={post.id}
                  onClick={() => client && onOpen(client)}
                  className="cursor-pointer transition-colors hover:bg-white/[0.04] [&>td]:py-2.5 [&>td:first-child]:rounded-l-2xl [&>td:last-child]:rounded-r-2xl"
                >
                  <td className="max-w-[280px] pl-3">
                    <span className="flex items-center gap-3">
                      <span className={`w-4 text-xs font-semibold tabular-nums ${i === 0 ? 'text-amber-400' : 'text-neutral-500'}`}>{i + 1}</span>
                      <span className="truncate text-neutral-100">{post.title}</span>
                    </span>
                  </td>
                  <td className="text-neutral-400">{client?.name ?? 'Cliente removido'}</td>
                  <td>
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-neutral-300">{post.format}</span>
                  </td>
                  <td className="text-right font-semibold tabular-nums text-neutral-50">{formatCompact(post.metrics.views)}</td>
                  <td className="pr-3 text-right tabular-nums text-neutral-400">{formatMetric(engagementFrom(post.metrics), { suffix: '%', digits: 1 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </Card>
);

/* ------------------------------------------------------------------ */
/* Rotina semanal                                                       */
/* ------------------------------------------------------------------ */

const STATUS = {
  ok: { label: 'Em dia', cls: 'bg-emerald-400/15 text-emerald-300' },
  late: { label: 'Atualizar', cls: 'bg-amber-500 text-neutral-950 hover:bg-amber-400' },
  never: { label: 'Importar', cls: 'bg-neutral-50 text-neutral-950 hover:bg-white' }
} as const;

export const RoutinePanel: React.FC<{ rows: ClientFreshness[]; onImport: (client: Client) => void; delay?: number }> = ({ rows, onImport, delay }) => {
  const pending = rows.filter((r) => r.status !== 'ok').length;
  return (
    <Card delay={delay} className="p-5 lg:col-span-2">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.07] text-neutral-300">
          <Upload className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-neutral-50">Rotina semanal</h3>
          <p className="text-xs text-neutral-500">
            {pending === 0 ? 'Todos os clientes atualizados na última semana' : `${pending} cliente${pending > 1 ? 's' : ''} aguardando métricas`}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-1">
        {rows.map((r) => {
          const s = STATUS[r.status];
          return (
            <li key={r.client.id} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/[0.03]">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.07] text-xs font-semibold text-neutral-200">
                  {r.client.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-neutral-100">{r.client.name}</span>
                  <span className="block text-[11px] text-neutral-500">
                    {r.daysAgo === null ? 'Nenhuma importação ainda' : r.daysAgo === 0 ? 'Atualizado hoje' : `Atualizado há ${r.daysAgo} dia${r.daysAgo > 1 ? 's' : ''}`}
                  </span>
                </span>
              </span>
              {r.status === 'ok' ? (
                <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onImport(r.client)}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors active:scale-[0.97] ${s.cls}`}
                >
                  {s.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Semana no calendário                                                 */
/* ------------------------------------------------------------------ */

export const WeekPanel: React.FC<{
  plan: Array<{ day: string; items: CalendarItem[] }>;
  today: string;
  clientsById: Map<string, Client>;
  onOpen: (client: Client) => void;
  delay?: number;
}> = ({ plan, today, clientsById, onOpen, delay }) => {
  const [selected, setSelected] = useState(today);
  const total = plan.reduce((acc, d) => acc + d.items.length, 0);
  const dayItems = plan.find((d) => d.day === selected)?.items ?? [];
  return (
    <Card delay={delay} className="p-5 lg:col-span-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.07] text-neutral-300">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-neutral-50">Planejamento da semana</h3>
            <p className="text-xs text-neutral-500">
              {total === 0 ? 'Nada agendado no calendário dos clientes' : `${total} ${total === 1 ? 'publicação planejada' : 'publicações planejadas'}`}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-2">
        {plan.map((d) => {
          const isSel = d.day === selected;
          const isToday = d.day === today;
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => setSelected(d.day)}
              className={`flex flex-col items-center gap-1 rounded-2xl py-3 transition-colors ${
                isSel ? 'bg-neutral-50 text-neutral-950' : 'bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]'
              }`}
            >
              <span className={`text-[11px] font-medium ${isSel ? 'text-neutral-600' : isToday ? 'text-amber-400' : 'text-neutral-500'}`}>
                {isToday ? 'Hoje' : weekDayLabel(d.day).slice(0, 3)}
              </span>
              <span className={`text-xl font-semibold tabular-nums ${!isSel && d.items.length === 0 ? 'text-neutral-600' : ''}`}>{d.items.length}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        {dayItems.length === 0 ? (
          <p className="text-xs text-neutral-500">{weekDayLabel(selected)}: nenhuma publicação planejada.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {dayItems.map((item) => {
              const client = clientsById.get(item.clientId);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => client && onOpen(client)}
                    className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-left transition-colors hover:bg-white/[0.08]"
                  >
                    <span className="block truncate text-sm text-neutral-100">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-neutral-500">
                      {client?.name ?? 'Cliente removido'} · {item.format}
                      {item.timeSlot ? ` · ${item.timeSlot}` : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
};

export const KPI_ICONS = { views: Eye, reach: Radar, engagement: Heart, posts: LayoutGrid };
export type { Metric };
