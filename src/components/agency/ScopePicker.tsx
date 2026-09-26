import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Users } from 'lucide-react';
import type { Client } from '../../types';

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/** Seletor do escopo do painel: todos os clientes, um cliente ou (nas tarefas) só as tarefas gerais. */
export const ScopePicker: React.FC<{
  clients: Client[];
  value: string;
  onChange: (value: string) => void;
  allowGeneral?: boolean;
}> = ({ clients, value, onChange, allowGeneral }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = clients.find((c) => c.id === value);
  const label = value === 'general' ? 'Tarefas gerais' : selected?.name ?? 'Todos os clientes';

  const options: Array<{ id: string; label: string; sub?: string; badge: React.ReactNode }> = [
    { id: 'all', label: 'Todos os clientes', sub: `${clients.length} ${clients.length === 1 ? 'cliente' : 'clientes'}`, badge: <Users className="h-4 w-4" /> },
    ...(allowGeneral ? [{ id: 'general', label: 'Tarefas gerais', sub: 'Sem cliente vinculado', badge: 'AG' }] : []),
    ...clients.map((c) => ({ id: c.id, label: c.name, sub: c.instagram, badge: initials(c.name) }))
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Cliente do painel: ${label}`}
        className="inline-flex max-w-[260px] items-center gap-2 rounded-full bg-[#161618] py-1.5 pl-1.5 pr-3 text-sm text-neutral-100 transition-colors hover:bg-white/[0.08]"
      >
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${selected ? 'bg-amber-500 text-neutral-950' : 'bg-white/[0.08] text-neutral-300'}`}>
          {selected ? initials(selected.name) : value === 'general' ? 'AG' : <Users className="h-3.5 w-3.5" />}
        </span>
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Escolher cliente"
          className="absolute right-0 z-30 mt-2 max-h-80 w-72 overflow-y-auto rounded-3xl border border-white/[0.08] bg-neutral-900 p-1.5 shadow-2xl sm:left-0 sm:right-auto"
        >
          {options.map((o) => (
            <li key={o.id} role="option" aria-selected={value === o.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors ${value === o.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'}`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-neutral-200">{o.badge}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-neutral-100">{o.label}</span>
                  {o.sub && <span className="block truncate text-[11px] text-neutral-500">{o.sub}</span>}
                </span>
                {value === o.id && <Check className="h-4 w-4 shrink-0 text-amber-400" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
