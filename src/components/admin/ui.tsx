import React, { useState } from 'react';
import { centsToInput, parseMoney, type InvoiceState } from '../../services/finance';

export const FIELD =
  'w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20';
export const LABEL = 'mb-1.5 block text-xs font-medium text-neutral-300';

export const Field: React.FC<{ id: string; label: string; error?: string | null; hint?: string; children: React.ReactNode; className?: string }> = ({
  id,
  label,
  error,
  hint,
  children,
  className = ''
}) => (
  <div className={className}>
    <label htmlFor={id} className={LABEL}>
      {label}
    </label>
    {children}
    {hint && !error && <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>}
    {error && (
      <p role="alert" className="mt-1 text-xs text-rose-400">
        {error}
      </p>
    )}
  </div>
);

/** Campo de valor em reais: digita "1.500,00" e guarda centavos. */
export const MoneyInput: React.FC<{
  id: string;
  cents: number | null;
  onChange: (cents: number | null) => void;
  placeholder?: string;
  ariaLabel?: string;
}> = ({ id, cents, onChange, placeholder = '0,00', ariaLabel }) => {
  const [text, setText] = useState(cents === null ? '' : centsToInput(cents));
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-500">R$</span>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseMoney(e.target.value));
        }}
        onBlur={() => {
          const v = parseMoney(text);
          if (v !== null) setText(centsToInput(v));
        }}
        className={`${FIELD} pl-10 tabular-nums`}
      />
    </div>
  );
};

const STATE_STYLE: Record<InvoiceState, { label: string; cls: string }> = {
  aberta: { label: 'Aberta', cls: 'bg-sky-400/15 text-sky-300' },
  vencida: { label: 'Vencida', cls: 'bg-rose-500/15 text-rose-300' },
  paga: { label: 'Paga', cls: 'bg-emerald-400/15 text-emerald-300' },
  cancelada: { label: 'Cancelada', cls: 'bg-white/[0.06] text-neutral-400' }
};

export const InvoicePill: React.FC<{ state: InvoiceState; late?: number }> = ({ state, late }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATE_STYLE[state].cls}`}>
    {STATE_STYLE[state].label}
    {state === 'vencida' && late ? ` · ${late}d` : ''}
  </span>
);

export const PageHeader: React.FC<{ title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-50">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50 ${className}`}
  />
);

export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2.5 text-sm text-neutral-200 transition-colors hover:bg-white/[0.1] disabled:opacity-50 ${className}`}
  />
);

export const EmptyState: React.FC<{ title: string; text: string; action?: React.ReactNode }> = ({ title, text, action }) => (
  <div className="rounded-[28px] border border-dashed border-white/[0.08] bg-[#161618] px-6 py-12 text-center">
    <p className="text-sm font-medium text-neutral-100">{title}</p>
    <p className="mx-auto mt-1 max-w-[56ch] text-xs text-neutral-500">{text}</p>
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

export const Segmented = <T extends string>({
  value,
  options,
  onChange,
  label
}: {
  value: T;
  options: Array<{ id: T; label: string; count?: number }>;
  onChange: (v: T) => void;
  label: string;
}) => (
  <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        aria-pressed={value === o.id}
        onClick={() => onChange(o.id)}
        className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
          value === o.id ? 'bg-amber-500 font-semibold text-neutral-950' : 'bg-[#161618] text-neutral-300 hover:bg-white/[0.08]'
        }`}
      >
        {o.label}
        {o.count !== undefined && <span className="ml-1.5 tabular-nums opacity-70">{o.count}</span>}
      </button>
    ))}
  </div>
);

/** Baixa um arquivo de texto (CSV) gerado no navegador. */
export function downloadText(filename: string, content: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Primeira mensagem de erro de validação Zod (ou texto genérico). */
export function firstIssue(err: unknown, fallback = 'Não foi possível salvar.'): string {
  const issues = (err as { issues?: Array<{ message: string }> }).issues;
  return issues?.[0]?.message ?? (err instanceof Error ? err.message : fallback);
}
