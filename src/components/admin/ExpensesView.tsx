import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Download, Plus, Repeat } from 'lucide-react';
import type { Expense } from '../../types';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { EXPENSE_CATEGORIES, brl, monthName, monthOnly, shiftMonthISO, toCsv, todayBR } from '../../services/finance';
import { EmptyState, GhostButton, PageHeader, PrimaryButton, downloadText } from './ui';
import { ExpenseModal, type ClientOption } from './forms';
import { financeActions, type FinanceData } from './useFinance';

const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const catLabel = (id: Expense['category']) => EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const ExpensesView: React.FC<FinanceData & { clients: ClientOption[]; reload: () => void }> = ({ expenses, clients, reload }) => {
  const today = todayBR();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const list = expenses.filter((e) => e.date.startsWith(month)).sort((a, b) => Number(a.paid) - Number(b.paid) || a.date.localeCompare(b.date));
  const paid = list.filter((e) => e.paid).reduce((a, e) => a + e.amountCents, 0);
  const due = list.filter((e) => !e.paid).reduce((a, e) => a + e.amountCents, 0);
  const prev = shiftMonthISO(month, -1);
  const recurringToCopy = expenses.filter((e) => e.recurring && e.date.startsWith(prev)).filter((e) => !list.some((x) => x.description === e.description && x.category === e.category)).length;
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({ ...c, cents: list.filter((e) => e.category === c.id).reduce((a, e) => a + e.amountCents, 0) }))
    .filter((c) => c.cents > 0)
    .sort((a, b) => b.cents - a.cents);
  const clientName = (id?: string) => (id ? clients.find((c) => c.id === id)?.name ?? '' : '');

  const togglePaid = (e: Expense) => {
    storageService.finance.expenses.save({ ...e, paid: !e.paid, paidAt: e.paid ? undefined : today < e.date ? today : e.date });
    reload();
  };

  const remove = (e: Expense) => {
    storageService.finance.expenses.delete(e.id);
    setEditing(null);
    reload();
    notificationService.undoable(`Despesa "${e.description}" excluída.`, () => {
      storageService.finance.expenses.restore(e);
      reload();
    });
  };

  const exportCsv = () => {
    if (!list.length) return notificationService.showToast('Nenhuma despesa neste mês.', 'info');
    downloadText(
      `despesas_${month}.csv`,
      toCsv(
        list.map((e) => ({
          Data: br(e.date) + '/' + e.date.slice(0, 4),
          Descricao: e.description,
          Categoria: catLabel(e.category),
          Cliente: clientName(e.clientId),
          Valor: (e.amountCents / 100).toFixed(2).replace('.', ','),
          Paga: e.paid ? 'sim' : 'não',
          Recorrente: e.recurring ? 'sim' : 'não'
        }))
      )
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Despesas"
        subtitle={
          <>
            Pagas <span className="tabular-nums text-neutral-100">{brl(paid)}</span> · a pagar <span className="tabular-nums text-amber-300">{brl(due)}</span>
          </>
        }
        actions={
          <>
            <GhostButton onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </GhostButton>
            <PrimaryButton onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Nova despesa
            </PrimaryButton>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-[#161618] p-1">
          <button type="button" onClick={() => setMonth(shiftMonthISO(month, -1))} aria-label="Mês anterior" className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 hover:bg-white/[0.06]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[150px] text-center text-sm text-neutral-200" aria-live="polite">
            {monthName(month)}
          </span>
          <button type="button" onClick={() => setMonth(shiftMonthISO(month, 1))} aria-label="Próximo mês" className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 hover:bg-white/[0.06]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {recurringToCopy > 0 && (
          <button
            type="button"
            onClick={() => {
              const n = financeActions.copyRecurringExpenses(prev, month);
              reload();
              notificationService.showToast(`${n} ${n === 1 ? 'despesa recorrente lançada' : 'despesas recorrentes lançadas'} em ${monthName(month).toLowerCase()}.`, 'success');
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3.5 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/25"
          >
            <Copy className="h-3.5 w-3.5" /> Lançar {recurringToCopy} recorrente{recurringToCopy > 1 ? 's' : ''} de {monthOnly(prev)}
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={`Nenhuma despesa em ${monthName(month).toLowerCase()}`}
          text="Registre ferramentas, freelancers, anúncios e impostos para ver o resultado real da agência (recebido menos despesas)."
          action={
            <PrimaryButton onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Nova despesa
            </PrimaryButton>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <ul className="divide-y divide-white/[0.05] rounded-[24px] border border-white/[0.06] bg-[#161618]">
            {list.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={e.paid}
                  onChange={() => togglePaid(e)}
                  aria-label={e.paid ? `Marcar "${e.description}" como não paga` : `Marcar "${e.description}" como paga`}
                  className="h-4 w-4 shrink-0 accent-emerald-500"
                />
                <button type="button" onClick={() => setEditing(e)} className="min-w-0 flex-1 text-left">
                  <span className={`block truncate text-sm ${e.paid ? 'text-neutral-400' : 'text-neutral-100'}`}>
                    {e.description}
                    {e.recurring && <Repeat className="ml-1.5 inline h-3 w-3 text-neutral-500" aria-label="recorrente" />}
                  </span>
                  <span className="block truncate text-[11px] text-neutral-500">
                    {catLabel(e.category)} · vence {br(e.date)}
                    {e.clientId ? ` · ${clientName(e.clientId)}` : ''}
                    {e.paid && e.paidAt ? ` · paga ${br(e.paidAt)}` : ''}
                  </span>
                </button>
                <span className={`shrink-0 text-sm tabular-nums ${e.paid ? 'text-neutral-400' : e.date < today ? 'text-rose-300' : 'text-neutral-100'}`}>{brl(e.amountCents)}</span>
              </li>
            ))}
          </ul>
          <div className="h-fit rounded-[24px] border border-white/[0.06] bg-[#161618] p-5">
            <p className="text-sm font-medium text-neutral-200">Por categoria</p>
            <ul className="mt-4 space-y-3">
              {byCategory.map((c) => (
                <li key={c.id}>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300">{c.label}</span>
                    <span className="tabular-nums text-neutral-400">{brl(c.cents)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${(c.cents / (paid + due)) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {editing && (
        <ExpenseModal
          initial={editing === 'new' ? undefined : editing}
          clients={clients}
          onClose={() => setEditing(null)}
          onDelete={editing !== 'new' ? () => remove(editing) : undefined}
          onSaved={(e) => {
            setEditing(null);
            if (!e.date.startsWith(month)) setMonth(e.date.slice(0, 7));
            reload();
            notificationService.showToast(`Despesa "${e.description}" salva.`, 'success');
          }}
        />
      )}
    </div>
  );
};
