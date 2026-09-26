import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarPlus, Check, Clock, Film, Rocket, TrendingUp } from 'lucide-react';
import type { Client } from '../../types';
import { Modal } from '../common/Modal';
import { ManualAiModal } from '../common/ManualAiModal';
import { storageService } from '../../services/storageService';
import { computeWinningPatterns, type WinningPatterns } from '../../services/winningPatterns';
import { applyWeeklyPlan, addDays, buildWeeklyPlanPrompt, nextMonday, parseWeeklyPlan, weekdayOfDate, PRODUCTION_CHECKLIST, type PlannedPost } from '../../ai/weeklyPilot';
import { formatCompact, formatMetric, isMetric } from '../../utils/metrics';
import { weekDayLabel } from '../../services/storage/migration';

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const FIELD = 'w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20';

/** Cartões com os padrões vencedores (também usados no dashboard). */
export const PatternCards: React.FC<{ p: WinningPatterns; compact?: boolean }> = ({ p, compact }) => {
  const cards = [
    {
      icon: TrendingUp,
      label: 'Melhor dia',
      value: p.bestWeekday?.label ?? 'Sem dado',
      sub: p.bestWeekday ? `${formatCompact(p.bestWeekday.avgViews)} views em média · ${p.bestWeekday.posts} posts` : 'Importe mais posts'
    },
    {
      icon: Clock,
      label: 'Melhor horário',
      value: p.bestHourBand?.label.split(' (')[0] ?? 'Sem dado',
      sub: p.hourBands === null ? 'O CSV não trouxe horários' : p.bestHourBand ? `${p.bestHourBand.label.match(/\((.*)\)/)?.[1]} · ${formatCompact(p.bestHourBand.avgViews)} views` : 'Importe mais posts'
    },
    {
      icon: Film,
      label: 'Formato campeão',
      value: p.bestFormat?.label ?? 'Sem dado',
      sub: p.bestFormat ? `${formatCompact(p.bestFormat.avgViews)} views · eng. ${formatMetric(p.bestFormat.avgEngagement, { suffix: '%' })}` : 'Importe mais posts'
    },
    {
      icon: CalendarPlus,
      label: 'Ritmo atual',
      value: p.cadencePerWeek === null ? 'Sem dado' : `${p.cadencePerWeek.toLocaleString('pt-BR')} / semana`,
      sub: 'Média das últimas 4 semanas'
    }
  ];
  const max = Math.max(0, ...p.weekdays.map((d) => d.avgViews ?? 0));
  return (
    <div className="space-y-3">
      <div className={`grid gap-2 ${compact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white/[0.04] p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              <c.icon className="h-3.5 w-3.5 text-amber-400" />
              {c.label}
            </p>
            <p className={`mt-1 text-lg font-semibold ${c.value === 'Sem dado' ? 'text-neutral-600' : 'text-neutral-50'}`}>{c.value}</p>
            <p className="text-[11px] text-neutral-500">{c.sub}</p>
          </div>
        ))}
      </div>
      {max > 0 && (
        <div className="rounded-2xl bg-white/[0.04] p-3.5">
          <p className="mb-2 text-[11px] text-neutral-400">Visualizações médias por dia da semana</p>
          <div className="flex h-20 items-end gap-1.5">
            {p.weekdays.map((d) => {
              const pct = isMetric(d.avgViews) ? Math.max(6, (d.avgViews / max) * 100) : 0;
              const isBest = p.bestWeekday?.key === d.key;
              return (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${d.posts ? `${formatMetric(d.avgViews)} (${d.posts} posts)` : 'sem posts'}`}>
                  <div className="flex h-16 w-full items-end">
                    {d.posts ? (
                      <div className={`w-full rounded-md ${isBest ? 'bg-amber-400' : 'bg-white/[0.14]'}`} style={{ height: `${pct}%` }} />
                    ) : (
                      <div className="h-1 w-full rounded-full bg-white/[0.06]" />
                    )}
                  </div>
                  <span className={`text-[10px] ${isBest ? 'font-semibold text-amber-400' : 'text-neutral-500'}`}>{d.label.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {p.lowSample && p.sample > 0 && (
        <p className="flex items-start gap-2 text-[11px] text-amber-300/90">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          Amostra pequena ({p.sample} posts com visualizações). Use como indício e importe mais semanas para confirmar.
        </p>
      )}
    </div>
  );
};

export const WeeklyPilotModal: React.FC<{
  open: boolean;
  onClose: () => void;
  clients: Client[];
  initialClientId?: string;
  onApplied: (client: Client, count: number) => void;
}> = ({ open, onClose, clients, initialClientId, onApplied }) => {
  const [stage, setStage] = useState<'setup' | 'ai' | 'review'>('setup');
  const [clientId, setClientId] = useState(initialClientId ?? clients[0]?.id ?? '');
  const [weekStart, setWeekStart] = useState(() => nextMonday());
  const [postsCount, setPostsCount] = useState(4);
  const [plan, setPlan] = useState<PlannedPost[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const client = clients.find((c) => c.id === clientId);
  const contents = useMemo(() => (client ? storageService.contents.getByClient(client.id) : []), [client, open]); // eslint-disable-line react-hooks/exhaustive-deps
  const patterns = useMemo(() => computeWinningPatterns(contents), [contents]);

  useEffect(() => {
    if (!open) return;
    setStage('setup');
    setPlan([]);
    setWeekStart(nextMonday());
    setClientId(initialClientId && clients.some((c) => c.id === initialClientId) ? initialClientId : clients[0]?.id ?? '');
  }, [open, initialClientId, clients]);

  useEffect(() => {
    const c = patterns.cadencePerWeek;
    setPostsCount(c === null ? 4 : Math.min(7, Math.max(3, Math.round(c))));
  }, [patterns]);

  const prompt = useMemo(
    () =>
      client
        ? buildWeeklyPlanPrompt({
            client,
            patterns,
            contents,
            ideas: storageService.ideas.getByClient(client.id),
            audienceInsights: storageService.audience.getByClient(client.id),
            weekStart,
            postsCount
          })
        : '',
    [client, patterns, contents, weekStart, postsCount]
  );

  const create = () => {
    if (!client) return;
    const chosen = plan.filter((p) => selected.has(p.key));
    if (chosen.length === 0) return;
    applyWeeklyPlan(client, chosen);
    onApplied(client, chosen.length);
    onClose();
  };

  if (!open) return null;

  if (stage === 'ai' && client) {
    return (
      <ManualAiModal
        isOpen
        onClose={() => setStage('setup')}
        title={`Piloto da semana: ${client.name}`}
        prompt={prompt}
        importLabel="Revisar plano"
        onImport={(response) => {
          const parsed = parseWeeklyPlan(response);
          setPlan(parsed);
          setSelected(new Set(parsed.map((p) => p.key)));
          setStage('review');
        }}
      />
    );
  }

  if (stage === 'review' && client) {
    const count = selected.size;
    return (
      <Modal isOpen onClose={onClose} title="Revise o plano da semana" subtitle={`${client.name} · ${ddmm(weekStart)} a ${ddmm(addDays(weekStart, 6))}`} maxWidth="2xl">
        <div className="space-y-4">
          <ul className="space-y-2">
            {plan.map((p) => {
              const on = selected.has(p.key);
              return (
                <li key={p.key}>
                  <label className={`flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition-colors ${on ? 'border-amber-500/40 bg-amber-500/[0.06]' : 'border-white/[0.06] bg-white/[0.02] opacity-60'}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setSelected((s) => {
                          const n = new Set(s);
                          if (n.has(p.key)) n.delete(p.key);
                          else n.add(p.key);
                          return n;
                        })
                      }
                      className="mt-1 h-4 w-4 accent-amber-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="rounded-full bg-neutral-50 px-2 py-0.5 font-semibold text-neutral-950">
                          {weekDayLabel(weekdayOfDate(p.date)).slice(0, 3)} {ddmm(p.date)}
                          {p.time ? ` · ${p.time}` : ''}
                        </span>
                        <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-neutral-200">{p.format}</span>
                        <span className="text-neutral-500">{p.pillar}</span>
                      </span>
                      <span className="mt-1.5 block text-sm font-semibold text-neutral-100">{p.title}</span>
                      {p.hook && <span className="mt-0.5 block text-sm text-neutral-300">"{p.hook}"</span>}
                      {p.why && <span className="mt-1 block text-xs text-neutral-500">{p.why}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="rounded-2xl bg-white/[0.04] p-3.5 text-xs text-neutral-400">
            Cada post selecionado vira um item no <span className="text-neutral-200">Calendário</span> e uma tarefa de produção em{' '}
            <span className="text-neutral-200">Minhas tarefas</span>, com prazo na véspera e checklist do formato (ex.: Reels: {PRODUCTION_CHECKLIST.Reels.join(', ')}). Roteiro e legenda ficam nas notas da tarefa.
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => setStage('ai')} className="rounded-full px-4 py-2 text-sm text-neutral-300 hover:bg-white/[0.06]">
              Voltar
            </button>
            <button
              type="button"
              onClick={create}
              disabled={count === 0}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-40 active:scale-[0.98]"
            >
              <Check className="h-4 w-4" />
              Criar {count} {count === 1 ? 'post e tarefa' : 'posts e tarefas'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Piloto da semana" subtitle="Dados reais, padrões vencedores e a semana inteira planejada em um clique" maxWidth="2xl">
      {clients.length === 0 ? (
        <p className="text-sm text-neutral-400">Cadastre um cliente primeiro.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="pilot-client" className="mb-1.5 block text-xs font-medium text-neutral-300">Cliente</label>
              <select id="pilot-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={FIELD}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pilot-week" className="mb-1.5 block text-xs font-medium text-neutral-300">Semana começando em</label>
              <input id="pilot-week" type="date" value={weekStart} onChange={(e) => e.target.value && setWeekStart(e.target.value)} className={`${FIELD} [color-scheme:dark]`} />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-neutral-300">Posts na semana</span>
              <div className="grid grid-cols-5 gap-1 rounded-2xl bg-white/[0.04] p-1" role="group" aria-label="Posts na semana">
                {[3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={postsCount === n}
                    onClick={() => setPostsCount(n)}
                    className={`rounded-xl py-1.5 text-sm font-semibold tabular-nums transition-colors ${postsCount === n ? 'bg-neutral-50 text-neutral-950' : 'text-neutral-400 hover:text-neutral-100'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-neutral-100">Padrões vencedores de {client?.name}</h4>
            {patterns.sample === 0 ? (
              <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-neutral-400">
                Ainda não há posts com visualizações nos últimos 90 dias. O piloto vai propor uma semana de teste. Importe o CSV do Meta Business Suite na aba Métricas para planos baseados em dados.
              </p>
            ) : (
              <PatternCards p={patterns} />
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-neutral-300 hover:bg-white/[0.06]">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => setStage('ai')}
              disabled={!client}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400 active:scale-[0.98]"
            >
              <Rocket className="h-4 w-4" />
              Gerar prompt da semana
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
