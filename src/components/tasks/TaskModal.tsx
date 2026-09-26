import React, { useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import type { Client, DeliveryTask, TaskChecklistItem, TaskPriority, TaskStatus, TaskType } from '../../types';
import { Modal } from '../common/Modal';
import { TASK_STATUSES } from '../../services/taskInsights';
import { generateUUID } from '../../utils/uuid';

export const TASK_TYPES: TaskType[] = ['Post', 'Reels', 'Carrossel', 'Stories', 'Roteiro', 'Relatório', 'Reunião', 'Outro'];

const PRIORITIES: Array<{ id: TaskPriority; label: string }> = [
  { id: 'low', label: 'Baixa' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'Alta' }
];

export interface TaskDraft {
  id?: string;
  clientId: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  notes: string;
  checklist: TaskChecklistItem[];
}

export function emptyDraft(patch: Partial<TaskDraft> = {}): TaskDraft {
  return { clientId: '', title: '', type: 'Post', status: 'todo', priority: 'normal', dueDate: '', notes: '', checklist: [], ...patch };
}

export function draftFromTask(t: DeliveryTask): TaskDraft {
  return {
    id: t.id,
    clientId: t.clientId ?? '',
    title: t.title,
    type: t.type,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ?? '',
    notes: t.notes ?? '',
    checklist: t.checklist
  };
}

const FIELD = 'w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20';
const LABEL = 'mb-1.5 block text-xs font-medium text-neutral-300';

export const TaskModal: React.FC<{
  open: boolean;
  initial: TaskDraft;
  clients: Client[];
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
  onDelete?: (id: string) => void;
}> = ({ open, initial, clients, onClose, onSave, onDelete }) => {
  const [draft, setDraft] = useState<TaskDraft>(initial);
  const [newItem, setNewItem] = useState('');
  const [error, setError] = useState<string | null>(null);

  // O componente é remontado a cada abertura (key no pai): o estado nasce com a tarefa certa.
  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    set('checklist', [...draft.checklist, { id: generateUUID(), text, done: false }]);
    setNewItem('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) {
      setError('Dê um nome para a tarefa.');
      return;
    }
    onSave({ ...draft, title: draft.title.trim() });
  };

  const done = draft.checklist.filter((i) => i.done).length;

  return (
    <Modal isOpen={open} onClose={onClose} title={draft.id ? 'Editar tarefa' : 'Nova tarefa'} maxWidth="xl">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="task-title" className={LABEL}>Tarefa</label>
          <input
            id="task-title"
            autoFocus
            value={draft.title}
            onChange={(e) => {
              set('title', e.target.value);
              setError(null);
            }}
            placeholder="Ex: Roteiro do Reels de lançamento"
            className={FIELD}
          />
          {error && <p role="alert" className="mt-1.5 text-xs text-rose-400">{error}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="task-client" className={LABEL}>Cliente</label>
            <select id="task-client" value={draft.clientId} onChange={(e) => set('clientId', e.target.value)} className={FIELD}>
              <option value="">Geral (agência)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="task-due" className={LABEL}>Prazo</label>
            <input id="task-due" type="date" value={draft.dueDate} onChange={(e) => set('dueDate', e.target.value)} className={`${FIELD} [color-scheme:dark]`} />
          </div>
        </div>

        <div>
          <span className={LABEL}>Tipo de entrega</span>
          <div className="flex flex-wrap gap-2">
            {TASK_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                aria-pressed={draft.type === t}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  draft.type === t ? 'bg-neutral-50 text-neutral-950' : 'bg-white/[0.05] text-neutral-300 hover:bg-white/[0.1]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="task-status" className={LABEL}>Etapa</label>
            <select id="task-status" value={draft.status} onChange={(e) => set('status', e.target.value as TaskStatus)} className={FIELD}>
              {TASK_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <span className={LABEL}>Prioridade</span>
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/[0.04] p-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set('priority', p.id)}
                  aria-pressed={draft.priority === p.id}
                  className={`rounded-xl py-1.5 text-xs font-medium transition-colors ${
                    draft.priority === p.id ? (p.id === 'high' ? 'bg-rose-500 text-white' : 'bg-neutral-50 text-neutral-950') : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="task-notes" className={LABEL}>Notas</label>
          <textarea
            id="task-notes"
            rows={3}
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Briefing, links, referências, feedback do cliente..."
            className={`${FIELD} resize-y`}
          />
        </div>

        <div>
          <span className={LABEL}>
            Checklist {draft.checklist.length > 0 && <span className="text-neutral-500">({done}/{draft.checklist.length})</span>}
          </span>
          <ul className="space-y-1.5">
            {draft.checklist.map((item) => (
              <li key={item.id} className="group flex items-center gap-2 rounded-xl bg-white/[0.03] px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => set('checklist', draft.checklist.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))}
                  aria-label={item.done ? `Desmarcar ${item.text}` : `Marcar ${item.text}`}
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
                    item.done ? 'border-emerald-400 bg-emerald-400 text-emerald-950' : 'border-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {item.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
                <span className={`flex-1 text-sm ${item.done ? 'text-neutral-500 line-through' : 'text-neutral-200'}`}>{item.text}</span>
                <button
                  type="button"
                  onClick={() => set('checklist', draft.checklist.filter((i) => i.id !== item.id))}
                  aria-label={`Remover ${item.text}`}
                  className="text-neutral-600 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100 focus:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder="Adicionar item (Enter)"
              aria-label="Novo item do checklist"
              className={FIELD}
            />
            <button type="button" onClick={addItem} aria-label="Adicionar item" className="grid w-11 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-neutral-200 hover:bg-white/[0.1]">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          {draft.id && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Excluir a tarefa "${draft.title}"?`)) onDelete(draft.id as string);
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-neutral-300 hover:bg-white/[0.06]">
              Cancelar
            </button>
            <button type="submit" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-400 active:scale-[0.98]">
              Salvar tarefa
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
