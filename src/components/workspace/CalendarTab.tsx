import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { CalendarItem, Client, ContentFormat, WeekDay } from '../../types';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { brasiliaDay } from '../../services/dashboardInsights';
import { normalizeWeekDay, weekDayLabel } from '../../services/storage/migration';
import { addDays, dayLabel, monthLabel, monthWeeks, shiftMonth, weekDates } from '../../utils/calendarDates';
import { Modal } from '../common/Modal';

interface CalendarTabProps {
  client: Client;
  calendarItems: CalendarItem[];
  onRefresh: () => void;
}

type View = 'month' | 'week';

const WEEK: WeekDay[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
const FORMATS: ContentFormat[] = ['Reels', 'Carrossel', 'Foto', 'Stories', 'Live'];
const PILLARS = ['Educação', 'Autoridade', 'Prova social', 'Bastidores', 'Venda', 'Conexão'];

const FORMAT_DOT: Record<string, string> = {
  Reels: 'bg-amber-400',
  Carrossel: 'bg-sky-400',
  Foto: 'bg-emerald-400',
  Stories: 'bg-rose-400',
  Live: 'bg-neutral-300'
};

const DRAG_TYPE = 'text/x-calendar-item';

interface Draft {
  id?: string;
  title: string;
  date: string;
  dayOfWeek: WeekDay;
  timeSlot: string;
  format: ContentFormat;
  pillar: string;
  hook: string;
  notes: string;
}

const emptyDraft = (date: string): Draft => ({
  title: '',
  date,
  dayOfWeek: 'segunda',
  timeSlot: '',
  format: 'Reels',
  pillar: 'Educação',
  hook: '',
  notes: ''
});

function readView(): View {
  try {
    return localStorage.getItem('gs_cal_view') === 'week' ? 'week' : 'month';
  } catch {
    return 'month';
  }
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const byTime = (a: CalendarItem, b: CalendarItem) => (a.timeSlot ?? '99').localeCompare(b.timeSlot ?? '99') || a.orderIndex - b.orderIndex;

export const CalendarTab: React.FC<CalendarTabProps> = ({ client, calendarItems, onRefresh }) => {
  const reduceMotion = useReducedMotion();
  const today = brasiliaDay(new Date());
  const [view, setView] = useState<View>(readView);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    calendarItems.forEach((i) => {
      if (!i.date) return;
      map.set(i.date, [...(map.get(i.date) ?? []), i]);
    });
    map.forEach((list) => list.sort(byTime));
    return map;
  }, [calendarItems]);
  const undated = useMemo(() => calendarItems.filter((i) => !i.date).sort((a, b) => WEEK.indexOf(normalizeWeekDay(a.dayOfWeek)) - WEEK.indexOf(normalizeWeekDay(b.dayOfWeek)) || byTime(a, b)), [calendarItems]);

  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem('gs_cal_view', v);
    } catch {
      /* preferência opcional */
    }
  };

  const openNew = (date: string) => {
    setError(null);
    setDraft(emptyDraft(date));
  };

  const openEdit = (item: CalendarItem) => {
    setError(null);
    setDraft({
      id: item.id,
      title: item.title,
      date: item.date ?? '',
      dayOfWeek: normalizeWeekDay(item.dayOfWeek),
      timeSlot: item.timeSlot ?? '',
      format: item.format,
      pillar: item.pillar || 'Geral',
      hook: item.hook ?? '',
      notes: item.notes ?? ''
    });
  };

  const save = () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      setError('Dê um título ao conteúdo.');
      return;
    }
    if (draft.timeSlot && !/^\d{2}:\d{2}$/.test(draft.timeSlot)) {
      setError('Horário no formato 18:30.');
      return;
    }
    const existing = draft.id ? calendarItems.find((i) => i.id === draft.id) : undefined;
    storageService.calendar.saveItem({
      ...existing,
      id: draft.id,
      clientId: client.id,
      title: draft.title.trim(),
      date: draft.date || undefined,
      dayOfWeek: draft.dayOfWeek,
      timeSlot: draft.timeSlot || undefined,
      format: draft.format,
      pillar: draft.pillar,
      hook: draft.hook || undefined,
      notes: draft.notes || undefined,
      status: existing?.status ?? 'PLANEJADO',
      orderIndex: existing?.orderIndex
    });
    notificationService.showToast(
      draft.date ? `Agendado para ${dayLabel(draft.date, { weekday: 'short', day: '2-digit', month: 'short' })}.` : 'Salvo como modelo semanal (sem data).',
      'success'
    );
    setDraft(null);
    onRefresh();
  };

  const remove = (item: CalendarItem) => {
    storageService.calendar.delete(item.id);
    setDraft(null);
    notificationService.undoable(`"${item.title}" removido do calendário.`, () => {
      storageService.calendar.saveItem({ ...item });
      onRefresh();
    });
    onRefresh();
  };

  const moveTo = (id: string, date: string) => {
    const item = calendarItems.find((i) => i.id === id);
    if (!item || item.date === date) return;
    storageService.calendar.saveItem({ ...item, date, orderIndex: (byDate.get(date)?.length ?? 0) });
    notificationService.showToast(`"${item.title}" movido para ${dayLabel(date, { weekday: 'short', day: '2-digit', month: 'short' })}.`, 'info');
    onRefresh();
  };

  // Arrastar e soltar (o formulário de edição é a alternativa pelo teclado).
  const dropProps = (date: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOver !== date) setDragOver(date);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDragOver((d) => (d === date ? null : d));
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      const id = e.dataTransfer.getData(DRAG_TYPE);
      if (id) moveTo(id, date);
    }
  });

  // layoutId só onde o item aparece uma vez (a agenda do celular repete os itens escondida no desktop).
  const chip = (item: CalendarItem, large = false, animate = true) => (
    <motion.div key={item.id} layout={animate && !reduceMotion} layoutId={animate && !reduceMotion ? `cal-${item.id}` : undefined}>
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_TYPE, item.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onClick={(e) => {
          e.stopPropagation();
          openEdit(item);
        }}
        title={`${item.title} (arraste para outro dia)`}
        aria-label={`${item.format}${item.timeSlot ? ` às ${item.timeSlot}` : ''}: ${item.title}. Abrir para editar ou mudar a data.`}
        className={`flex w-full cursor-grab items-start gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.04] text-left transition-colors hover:border-white/[0.16] hover:bg-white/[0.07] active:cursor-grabbing ${
          large ? 'p-2.5' : 'px-2 py-1'
        }`}
      >
        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${FORMAT_DOT[item.format] ?? 'bg-neutral-400'}`} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate ${large ? 'text-xs font-semibold text-neutral-100' : 'text-[11px] text-neutral-200'}`}>
            {item.timeSlot && <span className="mr-1 tabular-nums text-neutral-500">{item.timeSlot}</span>}
            {item.title}
          </span>
          {large && (
            <span className="mt-1 block text-[10px] text-neutral-500">
              {item.format} · {item.pillar}
            </span>
          )}
          {large && item.hook && <span className="mt-1 line-clamp-2 block text-[11px] italic text-neutral-400">"{item.hook}"</span>}
        </span>
      </button>
    </motion.div>
  );

  const weeks = monthWeeks(month);
  const week = weekDates(weekAnchor);
  const monthCount = weeks.flat().filter((d) => d.startsWith(month)).reduce((acc, d) => acc + (byDate.get(d)?.length ?? 0), 0);
  const weekCount = week.reduce((acc, d) => acc + (byDate.get(d)?.length ?? 0), 0);
  const agendaDays = weeks.flat().filter((d) => d.startsWith(month) && (byDate.has(d) || d === today));

  const navLabel = view === 'month' ? monthLabel(month) : `${dayLabel(week[0], { day: '2-digit', month: 'short' })} – ${dayLabel(week[6], { day: '2-digit', month: 'short' })}`;
  const shift = (n: number) => (view === 'month' ? setMonth((m) => shiftMonth(m, n)) : setWeekAnchor((d) => addDays(d, 7 * n)));
  const goToday = () => {
    setMonth(today.slice(0, 7));
    setWeekAnchor(today);
  };

  return (
    <div className="space-y-5">
      {/* Barra de controle */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-50">Calendário editorial</h3>
          <p className="mt-1 text-sm text-neutral-400">
            {view === 'month' ? `${monthCount} post(s) em ${monthLabel(month).toLowerCase()}` : `${weekCount} post(s) nesta semana`} <span className="hidden md:inline">· arraste para reagendar</span>
            <span className="md:hidden">· toque para editar ou mudar a data</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-white/[0.06] bg-[#161618] p-1" role="group" aria-label="Visualização">
            {(['month', 'week'] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => changeView(v)}
                className={`relative rounded-full px-3.5 py-1.5 text-xs transition-colors ${view === v ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                {view === v && (
                  <motion.span layoutId="calendar-view-pill" className="absolute inset-0 rounded-full bg-white" transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }} />
                )}
                <span className="relative font-medium">{v === 'month' ? 'Mês' : 'Semana'}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-[#161618] p-1">
            <button type="button" onClick={() => shift(-1)} aria-label={view === 'month' ? 'Mês anterior' : 'Semana anterior'} className="grid h-7 w-7 place-items-center rounded-full text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span id="calendar-nav-label" className="min-w-[132px] text-center text-xs font-medium tabular-nums text-neutral-200" aria-live="polite">
              {navLabel}
            </span>
            <button type="button" onClick={() => shift(1)} aria-label={view === 'month' ? 'Próximo mês' : 'Próxima semana'} className="grid h-7 w-7 place-items-center rounded-full text-neutral-400 hover:bg-white/[0.06] hover:text-neutral-100">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button type="button" onClick={goToday} className="rounded-full bg-white/[0.05] px-3 py-2 text-xs text-neutral-300 hover:bg-white/[0.09]">
            Hoje
          </button>
          <button
            type="button"
            onClick={() => openNew(view === 'month' && !today.startsWith(month) ? `${month}-01` : today)}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400 active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" /> Agendar conteúdo
          </button>
        </div>
      </div>

      {/* Modelos sem data (planejamento antigo ou ideias sem dia marcado) */}
      {undated.length > 0 && (
        <div className="rounded-[24px] border border-white/[0.06] bg-[#161618] p-3">
          <p className="mb-2 flex items-center gap-2 px-1 text-[11px] text-neutral-500">
            <GripVertical className="h-3.5 w-3.5" /> Sem data ({undated.length}): arraste para um dia ou abra para escolher a data
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {undated.map((item) => (
              <div key={item.id} className="min-w-0">
                <span className="mb-0.5 block px-1 text-[10px] text-neutral-500">{weekDayLabel(item.dayOfWeek)}</span>
                {chip(item)}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'month' ? (
        <>
          {/* Grade do mês (tablet e desktop) */}
          <div className="hidden overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#161618] md:block">
            <div className="grid grid-cols-7" role="grid" aria-label={`Calendário de ${monthLabel(month)}`}>
              <div role="row" className="contents">
                {WEEK.map((d) => (
                  <div key={d} role="columnheader" aria-label={weekDayLabel(d)} className="border-b border-white/[0.06] px-3 py-2 text-[11px] text-neutral-500">
                    {weekDayLabel(d).slice(0, 3)}
                  </div>
                ))}
              </div>
              {weeks.map((week, w) => (
                <div key={week[0]} role="row" className="contents">
                  {week.map((d, j) => {
                    const idx = w * 7 + j;
                    const items = byDate.get(d) ?? [];
                    const inMonth = d.startsWith(month);
                    const isToday = d === today;
                    return (
                      <div
                        key={d}
                        role="gridcell"
                        aria-label={`${dayLabel(d)}: ${items.length} post(s)`}
                        data-date={d}
                        {...dropProps(d)}
                        onClick={() => openNew(d)}
                        className={`group relative min-h-[118px] cursor-pointer border-white/[0.05] p-1.5 transition-colors ${idx % 7 !== 6 ? 'border-r' : ''} ${idx < weeks.length * 7 - 7 ? 'border-b' : ''} ${
                          dragOver === d ? 'bg-amber-500/10' : 'hover:bg-white/[0.02]'
                        } ${inMonth ? '' : 'bg-black/20'}`}
                      >
                        <div className="mb-1 flex items-center justify-between px-1">
                          <span
                            className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[11px] tabular-nums ${
                              isToday ? 'bg-amber-500 font-semibold text-neutral-950' : inMonth ? 'text-neutral-300' : 'text-neutral-600'
                            }`}
                          >
                            {Number(d.slice(8))}
                          </span>
                          <Plus className="h-3.5 w-3.5 text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                        </div>
                        <div className="space-y-1">
                          {items.slice(0, 3).map((item) => chip(item))}
                          {items.length > 3 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWeekAnchor(d);
                                changeView('week');
                              }}
                              className="w-full rounded-lg px-2 py-0.5 text-left text-[10px] text-neutral-400 hover:bg-white/[0.05]"
                            >
                              +{items.length - 3} mais
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Agenda do mês (celular) */}
          <div className="space-y-2 md:hidden">
            {agendaDays.length === 0 && <p className="rounded-[24px] bg-[#161618] p-6 text-center text-sm text-neutral-500">Nada agendado neste mês.</p>}
            {agendaDays.map((d) => (
              <div key={d} className="rounded-[20px] border border-white/[0.06] bg-[#161618] p-3" data-date={d}>
                <div className="mb-2 flex items-center justify-between">
                  <span className={`text-xs font-medium ${d === today ? 'text-amber-400' : 'text-neutral-300'}`}>{cap(dayLabel(d, { weekday: 'long', day: '2-digit', month: 'short' }))}</span>
                  <button type="button" onClick={() => openNew(d)} aria-label={`Agendar em ${dayLabel(d)}`} className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.05] text-neutral-300">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(byDate.get(d) ?? []).map((item) => chip(item, true, false))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-7">
          {week.map((d) => {
            const items = byDate.get(d) ?? [];
            const isToday = d === today;
            return (
              <div
                key={d}
                data-date={d}
                {...dropProps(d)}
                className={`flex min-h-[320px] flex-col rounded-[24px] border p-3 transition-colors ${
                  dragOver === d ? 'border-amber-500/50 bg-amber-500/[0.06]' : 'border-white/[0.06] bg-[#161618]'
                }`}
              >
                <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <div>
                    <span className={`block text-xs font-semibold ${isToday ? 'text-amber-400' : 'text-neutral-200'}`}>{cap(dayLabel(d, { weekday: 'short' }).replace('.', ''))}</span>
                    <span className="block text-[11px] tabular-nums text-neutral-500">{dayLabel(d, { day: '2-digit', month: 'short' })}</span>
                  </div>
                  <button type="button" onClick={() => openNew(d)} aria-label={`Agendar em ${dayLabel(d)}`} className="grid h-7 w-7 place-items-center rounded-full text-neutral-400 hover:bg-white/[0.07] hover:text-amber-400">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  {items.map((item) => chip(item, true))}
                  {items.length === 0 && <p className="py-6 text-center text-[11px] text-neutral-600">Sem posts</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Editar conteúdo' : 'Agendar conteúdo'}
        subtitle={draft?.date ? cap(dayLabel(draft.date)) : `Planejamento de ${client.name}`}
        maxWidth="lg"
      >
        {draft && (
          <form
            className="space-y-4 text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div>
              <label htmlFor="cal-title" className="mb-1 block text-neutral-400">
                Título do conteúdo
              </label>
              <input
                id="cal-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Ex.: 3 erros na reforma da cozinha"
                className="w-full rounded-2xl border border-white/[0.08] bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 focus:border-amber-500/60 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cal-date" className="mb-1 flex items-center gap-1.5 text-neutral-400">
                  <CalendarDays className="h-3.5 w-3.5" /> Data
                </label>
                <input
                  id="cal-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                  className="w-full rounded-2xl border border-white/[0.08] bg-neutral-950 px-3 py-2 text-sm text-neutral-100 [color-scheme:dark] focus:border-amber-500/60 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="cal-time" className="mb-1 flex items-center gap-1.5 text-neutral-400">
                  <Clock className="h-3.5 w-3.5" /> Horário
                </label>
                <input
                  id="cal-time"
                  type="time"
                  value={draft.timeSlot}
                  onChange={(e) => setDraft({ ...draft, timeSlot: e.target.value })}
                  className="w-full rounded-2xl border border-white/[0.08] bg-neutral-950 px-3 py-2 text-sm text-neutral-100 [color-scheme:dark] focus:border-amber-500/60 focus:outline-none"
                />
              </div>
            </div>
            {!draft.date && (
              <div>
                <label htmlFor="cal-weekday" className="mb-1 block text-neutral-400">
                  Sem data: repetir como modelo em qual dia?
                </label>
                <select
                  id="cal-weekday"
                  value={draft.dayOfWeek}
                  onChange={(e) => setDraft({ ...draft, dayOfWeek: e.target.value as WeekDay })}
                  className="w-full rounded-2xl border border-white/[0.08] bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  {WEEK.map((d) => (
                    <option key={d} value={d}>
                      {weekDayLabel(d)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cal-format" className="mb-1 block text-neutral-400">
                  Formato
                </label>
                <select
                  id="cal-format"
                  value={draft.format}
                  onChange={(e) => setDraft({ ...draft, format: e.target.value as ContentFormat })}
                  className="w-full rounded-2xl border border-white/[0.08] bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  {FORMATS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cal-pillar" className="mb-1 block text-neutral-400">
                  Pilar
                </label>
                <select
                  id="cal-pillar"
                  value={draft.pillar}
                  onChange={(e) => setDraft({ ...draft, pillar: e.target.value })}
                  className="w-full rounded-2xl border border-white/[0.08] bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  {[...new Set([...PILLARS, ...(client.pillars ?? []), draft.pillar])].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="cal-hook" className="mb-1 block text-neutral-400">
                Gancho
              </label>
              <textarea
                id="cal-hook"
                rows={2}
                value={draft.hook}
                onChange={(e) => setDraft({ ...draft, hook: e.target.value })}
                className="w-full rounded-2xl border border-white/[0.08] bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-amber-500/60 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="cal-notes" className="mb-1 block text-neutral-400">
                Observações
              </label>
              <textarea
                id="cal-notes"
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="w-full rounded-2xl border border-white/[0.08] bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-amber-500/60 focus:outline-none"
              />
            </div>
            {error && (
              <p role="alert" className="rounded-2xl bg-rose-500/10 px-3 py-2 text-rose-300">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
              {draft.id ? (
                <button
                  type="button"
                  onClick={() => {
                    const item = calendarItems.find((i) => i.id === draft.id);
                    if (item) remove(item);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setDraft(null)} className="rounded-full bg-white/[0.06] px-4 py-2 text-neutral-300 hover:bg-white/[0.1]">
                  Cancelar
                </button>
                <button type="submit" className="rounded-full bg-amber-500 px-4 py-2 font-semibold text-neutral-950 hover:bg-amber-400 active:scale-[0.98]">
                  Salvar no calendário
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
