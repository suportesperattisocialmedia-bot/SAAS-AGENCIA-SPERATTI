import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CheckSquare, Columns3, Flag, List, Plus, Search } from 'lucide-react';
import type { Client, DeliveryTask, TaskStatus } from '../../types';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { TASK_STATUSES, dueLabel, dueState, filterTasks, summarizeTasks, type QuickFilter } from '../../services/taskInsights';
import { TaskModal, TaskDraft, draftFromTask, emptyDraft } from './TaskModal';

/** Cor de cada etapa (faixa superior dos cards de resumo e marcador das colunas). */
export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: '#93c5fd',
  doing: '#fcd34d',
  review: '#fdba74',
  approved: '#5eead4',
  done: '#86efac'
};

const QUICK: Array<{ id: QuickFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'overdue', label: 'Atrasadas' },
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Próximos 7 dias' },
  { id: 'high', label: 'Prioridade alta' }
];

const DUE_STYLE = {
  overdue: 'bg-rose-500/15 text-rose-300',
  today: 'bg-amber-500 text-neutral-950',
  soon: 'bg-amber-500/15 text-amber-300',
  later: 'bg-white/[0.06] text-neutral-300',
  none: '',
  done: 'bg-white/[0.04] text-neutral-500'
} as const;

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const TasksBoard: React.FC<{
  tasks: DeliveryTask[];
  clients: Client[];
  /** 'all', 'general' ou id do cliente. */
  scope: string;
  onChanged: () => void;
}> = ({ tasks, clients, scope, onChanged }) => {
  const reduce = useReducedMotion();
  const [view, setView] = useState<'board' | 'list'>(() => {
    try {
      return localStorage.getItem('gs_tasks_view') === 'list' ? 'list' : 'board';
    } catch {
      return 'board';
    }
  });
  const [search, setSearch] = useState('');
  const [quick, setQuick] = useState<QuickFilter>('all');
  const [modal, setModal] = useState<{ open: boolean; draft: TaskDraft; seq: number }>({ open: false, draft: emptyDraft(), seq: 0 });
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

  const clientNames = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const scoped = useMemo(() => filterTasks(tasks, { clientId: scope }, clientNames), [tasks, scope, clientNames]);
  const visible = useMemo(() => filterTasks(scoped, { clientId: 'all', search, quick }, clientNames), [scoped, search, quick, clientNames]);
  const summary = summarizeTasks(scoped);

  const changeView = (v: 'board' | 'list') => {
    setView(v);
    try {
      localStorage.setItem('gs_tasks_view', v);
    } catch {
      /* preferência opcional */
    }
  };

  const defaultClient = scope !== 'all' && scope !== 'general' ? scope : '';
  const openNew = (status: TaskStatus = 'todo') => setModal((m) => ({ open: true, draft: emptyDraft({ status, clientId: defaultClient }), seq: m.seq + 1 }));

  const save = (d: TaskDraft) => {
    storageService.tasks.save({
      id: d.id,
      clientId: d.clientId || undefined,
      title: d.title,
      type: d.type,
      status: d.status,
      priority: d.priority,
      dueDate: d.dueDate || undefined,
      notes: d.notes || undefined,
      checklist: d.checklist
    });
    notificationService.showToast(d.id ? 'Tarefa atualizada.' : 'Tarefa criada.', 'success');
    setModal((m) => ({ ...m, open: false }));
    onChanged();
  };

  const remove = (id: string) => {
    storageService.tasks.delete(id);
    notificationService.showToast('Tarefa excluída.', 'info');
    setModal((m) => ({ ...m, open: false }));
    onChanged();
  };

  const move = (id: string, status: TaskStatus, beforeId?: string) => {
    const task = tasks.find((t) => t.id === id);
    storageService.tasks.move(id, status, beforeId);
    if (task && task.status !== status && status === 'done') notificationService.showToast(`"${task.title}" entregue.`, 'success');
    onChanged();
  };

  const nextStatus = (s: TaskStatus): TaskStatus | null => {
    const i = TASK_STATUSES.findIndex((x) => x.id === s);
    return i >= 0 && i < TASK_STATUSES.length - 1 ? TASK_STATUSES[i + 1].id : null;
  };

  const renderCard = (task: DeliveryTask) => {
    const client = task.clientId ? clients.find((c) => c.id === task.clientId) : undefined;
    const state = dueState(task);
    const label = dueLabel(task);
    const done = task.checklist.filter((i) => i.done).length;
    const next = nextStatus(task.status);
    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => {
          setDragId(task.id);
          e.dataTransfer.setData('text/plain', task.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => {
          setDragId(null);
          setOverCol(null);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = e.dataTransfer.getData('text/plain');
          if (id && id !== task.id) move(id, task.status, task.id);
          setOverCol(null);
        }}
        className={`group rounded-2xl border border-white/[0.05] bg-[#1d1d20] p-3.5 transition-all hover:border-white/[0.12] ${dragId === task.id ? 'opacity-40' : ''}`}
      >
        <button type="button" onClick={() => setModal((m) => ({ open: true, draft: draftFromTask(task), seq: m.seq + 1 }))} className="block w-full text-left">
          <span className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-neutral-200">
              {client ? initials(client.name) : 'AG'}
            </span>
            <span className="truncate text-[11px] text-neutral-400">{client?.name ?? 'Geral (agência)'}</span>
            {task.priority === 'high' && task.status !== 'done' && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                <Flag className="h-3 w-3" />
                Alta
              </span>
            )}
          </span>
          <span className={`mt-2 block text-sm leading-snug ${task.status === 'done' ? 'text-neutral-500 line-through' : 'text-neutral-100'}`}>{task.title}</span>
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-neutral-300">{task.type}</span>
          {label && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DUE_STYLE[state]}`}>{label}</span>}
          {task.checklist.length > 0 && (
            <span className={`inline-flex items-center gap-1 text-[10px] ${done === task.checklist.length ? 'text-emerald-400' : 'text-neutral-500'}`}>
              <CheckSquare className="h-3 w-3" />
              {done}/{task.checklist.length}
            </span>
          )}
          {next && (
            <button
              type="button"
              onClick={() => move(task.id, next)}
              title={`Mover para ${TASK_STATUSES.find((s) => s.id === next)?.label}`}
              aria-label={`Mover "${task.title}" para ${TASK_STATUSES.find((s) => s.id === next)?.label}`}
              className="ml-auto grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-neutral-300 opacity-100 transition hover:bg-neutral-50 hover:text-neutral-950 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Resumo por etapa */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TASK_STATUSES.map((s, i) => (
          <motion.div
            key={s.id}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            className={`overflow-hidden rounded-[22px] bg-[#161618] ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <div className="rounded-b-[18px] px-4 py-2.5 text-xs font-semibold text-neutral-950" style={{ background: STATUS_COLOR[s.id] }}>
              {s.label}
            </div>
            <div className="flex items-end justify-between px-4 py-3.5">
              <span className="text-3xl font-semibold tabular-nums text-neutral-50">{summary.byStatus[s.id]}</span>
              <span className="text-[11px] text-neutral-500">
                {s.id === 'done' ? `${summary.doneThisWeek} nos últimos 7 dias` : s.id === 'todo' && summary.overdue > 0 ? `${summary.overdue} atrasada${summary.overdue > 1 ? 's' : ''} no total` : ''}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Barra de ferramentas */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block">
            <span className="sr-only">Buscar tarefas</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarefa, cliente, tipo..."
              className="w-full rounded-full border border-white/[0.06] bg-[#161618] py-2.5 pl-10 pr-4 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500/50 focus:outline-none sm:w-72"
            />
          </label>
          <span className="text-xs text-neutral-500 tabular-nums">
            {visible.length} {visible.length === 1 ? 'tarefa' : 'tarefas'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-[#161618] p-1" role="group" aria-label="Visualização">
            {([
              ['board', 'Quadro', Columns3],
              ['list', 'Lista', List]
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => changeView(id)}
                aria-pressed={view === id}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === id ? 'bg-white/[0.1] text-neutral-50' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openNew()}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-white active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Nova tarefa
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setQuick(q.id)}
            aria-pressed={quick === q.id}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              quick === q.id ? 'bg-amber-500 text-neutral-950' : 'bg-[#161618] text-neutral-300 hover:bg-white/[0.08]'
            }`}
          >
            {q.label}
            {q.id === 'overdue' && summary.overdue > 0 && <span className="ml-1.5 tabular-nums">{summary.overdue}</span>}
          </button>
        ))}
      </div>

      {scoped.length === 0 ? (
        <div className="rounded-[28px] bg-[#161618] p-10 text-center">
          <h3 className="text-base font-semibold text-neutral-100">Nenhuma tarefa ainda</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
            Crie as entregas da semana (posts, roteiros, relatórios, reuniões) e acompanhe cada uma até o cliente aprovar.
          </p>
          <button
            type="button"
            onClick={() => openNew()}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Criar primeira tarefa
          </button>
        </div>
      ) : view === 'board' ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="grid min-w-[1100px] grid-cols-5 gap-3">
            {TASK_STATUSES.map((s) => {
              const col = visible.filter((t) => t.status === s.id);
              return (
                <section
                  key={s.id}
                  aria-label={s.label}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverCol(s.id);
                  }}
                  onDragLeave={() => setOverCol((c) => (c === s.id ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain');
                    if (id) move(id, s.id);
                    setOverCol(null);
                  }}
                  className={`flex min-h-[320px] flex-col rounded-[24px] bg-[#161618] p-3 transition-colors ${overCol === s.id ? 'ring-2 ring-amber-500/40' : ''}`}
                >
                  <header className="mb-3 flex items-center justify-between px-1.5 pt-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s.id] }} />
                      {s.label}
                      <span className="text-xs font-normal text-neutral-500 tabular-nums">{col.length}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openNew(s.id)}
                      aria-label={`Nova tarefa em ${s.label}`}
                      className="grid h-7 w-7 place-items-center rounded-full text-neutral-400 hover:bg-white/[0.08] hover:text-neutral-100"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </header>
                  <div className="flex flex-1 flex-col gap-2">
                    {col.map((t) => renderCard(t))}
                    {col.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-white/[0.06] px-3 py-6 text-center text-[11px] text-neutral-600">
                        Arraste uma tarefa para cá
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[24px] bg-[#161618]">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[11px] text-neutral-500">
                <th className="px-4 py-3 font-medium">Tarefa</th>
                <th className="py-3 font-medium">Cliente</th>
                <th className="py-3 font-medium">Tipo</th>
                <th className="py-3 font-medium">Prazo</th>
                <th className="py-3 font-medium">Prioridade</th>
                <th className="px-4 py-3 font-medium">Etapa</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500">Nenhuma tarefa com esse filtro.</td>
                </tr>
              )}
              {visible.map((t) => {
                const client = t.clientId ? clientNames.get(t.clientId) : undefined;
                const state = dueState(t);
                const label = dueLabel(t);
                return (
                  <tr key={t.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="max-w-[320px] px-4 py-3">
                      <button type="button" onClick={() => setModal((m) => ({ open: true, draft: draftFromTask(t), seq: m.seq + 1 }))} className="block w-full truncate text-left text-neutral-100 hover:text-amber-300">
                        {t.title}
                      </button>
                    </td>
                    <td className="text-neutral-400">{client ?? 'Geral'}</td>
                    <td>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-neutral-300">{t.type}</span>
                    </td>
                    <td>{label ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DUE_STYLE[state]}`}>{label}</span> : <span className="text-neutral-600">Sem prazo</span>}</td>
                    <td className={t.priority === 'high' ? 'text-rose-300' : 'text-neutral-400'}>{t.priority === 'high' ? 'Alta' : t.priority === 'low' ? 'Baixa' : 'Normal'}</td>
                    <td className="px-4">
                      <select
                        value={t.status}
                        onChange={(e) => move(t.id, e.target.value as TaskStatus)}
                        aria-label={`Etapa de ${t.title}`}
                        className="rounded-full border-0 px-3 py-1 text-xs font-semibold text-neutral-950 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        style={{ background: STATUS_COLOR[t.status] }}
                      >
                        {TASK_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TaskModal
        key={modal.seq}
        open={modal.open}
        initial={modal.draft}
        clients={clients}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSave={save}
        onDelete={remove}
      />
    </div>
  );
};
