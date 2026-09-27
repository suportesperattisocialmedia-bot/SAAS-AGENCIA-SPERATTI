import React, { useDeferredValue, useMemo, useState } from 'react';
import { Ban, CheckCircle2, Download, FileDown, Pencil, Plus, Repeat, RotateCcw, Search, Trash2 } from 'lucide-react';
import type { Invoice } from '../../types';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import {
  PAYMENT_METHODS,
  brl,
  daysLate,
  formatInvoiceNumber,
  invoiceState,
  invoiceTotal,
  monthName,
  pendingRecurring,
  receivedOf,
  toCsv,
  todayBR,
  type InvoiceState
} from '../../services/finance';
import { downloadReceiptPdf } from '../../services/receiptPdf';
import { EmptyState, GhostButton, InvoicePill, PageHeader, PrimaryButton, Segmented, downloadText } from './ui';
import { InvoiceModal, PayModal, type ClientOption } from './forms';
import { financeActions, type FinanceData } from './useFinance';

const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

type Filter = 'todas' | InvoiceState;

export const InvoicesView: React.FC<FinanceData & { clients: ClientOption[]; agencyName: string; reload: () => void }> = ({
  invoices,
  contracts,
  clients,
  agencyName,
  reload
}) => {
  const today = todayBR();
  const [month, setMonth] = useState<string>('todos');
  const [filter, setFilter] = useState<Filter>('todas');
  const [clientId, setClientId] = useState('');
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query).trim().toLowerCase();
  const [editing, setEditing] = useState<Invoice | 'new' | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);

  const currentMonth = today.slice(0, 7);
  const pending = pendingRecurring(contracts, invoices, currentMonth);
  const months = useMemo(() => {
    const set = new Set(invoices.map((i) => i.dueDate.slice(0, 7)));
    set.add(currentMonth);
    return [...set].sort().reverse();
  }, [invoices, currentMonth]);

  const base = useMemo(
    () =>
      invoices
        .filter((i) => month === 'todos' || i.dueDate.startsWith(month))
        .filter((i) => !clientId || i.clientId === clientId)
        .filter((i) => !q || `${formatInvoiceNumber(i.number)} ${i.clientName} ${i.description} ${i.fiscalNumber ?? ''}`.toLowerCase().includes(q)),
    [invoices, month, clientId, q]
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { todas: base.length, aberta: 0, vencida: 0, paga: 0, cancelada: 0 };
    base.forEach((i) => (c[invoiceState(i, today)] += 1));
    return c;
  }, [base, today]);
  const list = base
    .filter((i) => filter === 'todas' || invoiceState(i, today) === filter)
    .sort((a, b) => {
      const rank = { vencida: 0, aberta: 1, paga: 2, cancelada: 3 } as const;
      return rank[invoiceState(a, today)] - rank[invoiceState(b, today)] || a.dueDate.localeCompare(b.dueDate) || b.number - a.number;
    });
  const totals = {
    open: list.filter((i) => i.status === 'aberta').reduce((a, i) => a + invoiceTotal(i), 0),
    paid: list.filter((i) => i.status === 'paga').reduce((a, i) => a + receivedOf(i), 0)
  };

  const generate = () => {
    const created = financeActions.generateRecurring(currentMonth);
    reload();
    notificationService.showToast(`${created.length} ${created.length === 1 ? 'cobrança gerada' : 'cobranças geradas'} para ${monthName(currentMonth).toLowerCase()}.`, 'success');
  };

  const remove = (inv: Invoice) => {
    storageService.finance.invoices.delete(inv.id);
    reload();
    notificationService.undoable(`Cobrança ${formatInvoiceNumber(inv.number)} excluída.`, () => {
      storageService.finance.invoices.restore(inv);
      reload();
    });
  };

  const exportCsv = () => {
    const rows = list.map((i) => ({
      Numero: formatInvoiceNumber(i.number),
      Cliente: i.clientName,
      Descricao: i.description,
      Emissao: br(i.issueDate),
      Vencimento: br(i.dueDate),
      Situacao: invoiceState(i, today),
      Valor: (invoiceTotal(i) / 100).toFixed(2).replace('.', ','),
      Pago_em: i.paidAt ? br(i.paidAt) : '',
      Valor_recebido: i.status === 'paga' ? (receivedOf(i) / 100).toFixed(2).replace('.', ',') : '',
      Forma: PAYMENT_METHODS.find((m) => m.id === i.paymentMethod)?.label ?? i.paymentMethod,
      Nota_fiscal: i.fiscalNumber ?? ''
    }));
    if (!rows.length) return notificationService.showToast('Nenhuma cobrança com esses filtros.', 'info');
    downloadText(`cobrancas_${month === 'todos' ? 'todas' : month}.csv`, toCsv(rows));
  };

  const pdf = async (inv: Invoice) => {
    try {
      await downloadReceiptPdf(inv, agencyName);
    } catch {
      notificationService.showToast('Não foi possível gerar o PDF.', 'error');
    }
  };

  const iconBtn = 'grid h-8 w-8 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-white/[0.07] hover:text-neutral-100';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cobranças"
        subtitle={
          <>
            {list.length} {list.length === 1 ? 'cobrança' : 'cobranças'} · a receber <span className="text-neutral-200 tabular-nums">{brl(totals.open)}</span> · recebido{' '}
            <span className="text-emerald-300 tabular-nums">{brl(totals.paid)}</span>
          </>
        }
        actions={
          <>
            <GhostButton onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </GhostButton>
            <PrimaryButton onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Nova cobrança
            </PrimaryButton>
          </>
        }
      />

      {pending.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[22px] border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3 text-sm text-neutral-200">
            <Repeat className="h-5 w-5 shrink-0 text-amber-400" />
            {pending.length} {pending.length === 1 ? 'contrato recorrente ainda sem cobrança' : 'contratos recorrentes ainda sem cobrança'} em {monthName(currentMonth).toLowerCase()} (
            {brl(pending.reduce((a, c) => a + c.amountCents, 0))}).
          </p>
          <button type="button" onClick={generate} className="shrink-0 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400">
            Gerar cobranças do mês
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Buscar cobranças</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por número, cliente, descrição ou NF..."
            className="w-full rounded-full border border-white/[0.06] bg-[#161618] py-2.5 pl-10 pr-4 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500/60 focus:outline-none"
          />
        </label>
        <select aria-label="Mês de vencimento" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-full border border-white/[0.06] bg-[#161618] px-4 py-2.5 text-sm text-neutral-200">
          <option value="todos">Todos os meses</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthName(m)}
            </option>
          ))}
        </select>
        <select aria-label="Cliente" value={clientId} onChange={(e) => setClientId(e.target.value)} className="rounded-full border border-white/[0.06] bg-[#161618] px-4 py-2.5 text-sm text-neutral-200">
          <option value="">Todos os clientes</option>
          {[...new Map(invoices.map((i) => [i.clientId, i.clientName])).entries()].map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <Segmented<Filter>
        label="Situação"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'todas', label: 'Todas', count: counts.todas },
          { id: 'vencida', label: 'Vencidas', count: counts.vencida },
          { id: 'aberta', label: 'A vencer', count: counts.aberta },
          { id: 'paga', label: 'Pagas', count: counts.paga },
          { id: 'cancelada', label: 'Canceladas', count: counts.cancelada }
        ]}
      />

      {invoices.length === 0 ? (
        <EmptyState
          title="Nenhuma cobrança ainda"
          text="Crie uma cobrança avulsa ou cadastre um contrato recorrente para gerar as cobranças de cada mês. O cliente pode ser um dos cadastrados ou qualquer nome que você digitar."
          action={
            <PrimaryButton onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Nova cobrança
            </PrimaryButton>
          }
        />
      ) : list.length === 0 ? (
        <p className="rounded-[24px] bg-[#161618] p-8 text-center text-sm text-neutral-500">Nenhuma cobrança com esses filtros.</p>
      ) : (
        <div className="overflow-x-auto rounded-[24px] border border-white/[0.06] bg-[#161618]">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="text-left text-[11px] text-neutral-500">
                <th className="px-4 py-3 font-medium">Nº</th>
                <th className="px-3 py-3 font-medium">Cliente / descrição</th>
                <th className="px-3 py-3 font-medium">Vencimento</th>
                <th className="px-3 py-3 text-right font-medium">Valor</th>
                <th className="px-3 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((inv) => {
                const state = invoiceState(inv, today);
                return (
                  <tr key={inv.id} className="border-t border-white/[0.04] align-middle">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400">{formatInvoiceNumber(inv.number)}</td>
                    <td className="max-w-[320px] px-3 py-3">
                      <p className="truncate text-neutral-100">{inv.clientName}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {inv.description}
                        {inv.contractId && inv.period ? ' · recorrente' : ''}
                        {inv.fiscalNumber ? ` · NF ${inv.fiscalNumber}` : ''}
                      </p>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-neutral-300">
                      {br(inv.dueDate)}
                      {state === 'paga' && inv.paidAt && <span className="block text-[11px] text-emerald-400/80">pago {br(inv.paidAt)}</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-neutral-100">
                      {brl(invoiceTotal(inv))}
                      {state === 'paga' && receivedOf(inv) !== invoiceTotal(inv) && <span className="block text-[11px] text-neutral-500">recebido {brl(receivedOf(inv))}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <InvoicePill state={state} late={daysLate(inv, today)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {(state === 'aberta' || state === 'vencida') && (
                          <button type="button" onClick={() => setPaying(inv)} className="mr-1 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/25">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Recebi
                          </button>
                        )}
                        <button type="button" onClick={() => void pdf(inv)} aria-label={`PDF da cobrança ${formatInvoiceNumber(inv.number)}`} title={state === 'paga' ? 'Recibo em PDF' : 'Cobrança em PDF'} className={iconBtn}>
                          <FileDown className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setEditing(inv)} aria-label={`Editar cobrança ${formatInvoiceNumber(inv.number)}`} title="Editar" className={iconBtn}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        {state === 'paga' || state === 'cancelada' ? (
                          <button
                            type="button"
                            onClick={() => {
                              financeActions.reopen(inv);
                              reload();
                              notificationService.showToast(`Cobrança ${formatInvoiceNumber(inv.number)} reaberta.`, 'info');
                            }}
                            aria-label={`Reabrir cobrança ${formatInvoiceNumber(inv.number)}`}
                            title="Reabrir"
                            className={iconBtn}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              financeActions.cancel(inv);
                              reload();
                              notificationService.undoable(`Cobrança ${formatInvoiceNumber(inv.number)} cancelada.`, () => {
                                financeActions.reopen(inv);
                                reload();
                              });
                            }}
                            aria-label={`Cancelar cobrança ${formatInvoiceNumber(inv.number)}`}
                            title="Cancelar cobrança"
                            className={iconBtn}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        <button type="button" onClick={() => remove(inv)} aria-label={`Excluir cobrança ${formatInvoiceNumber(inv.number)}`} title="Excluir" className={`${iconBtn} hover:!text-rose-300`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <InvoiceModal
          initial={editing === 'new' ? undefined : editing}
          clients={clients}
          defaultClientId={clientId || undefined}
          onClose={() => setEditing(null)}
          onSaved={(inv) => {
            setEditing(null);
            reload();
            notificationService.showToast(`Cobrança ${formatInvoiceNumber(inv.number)} salva.`, 'success');
          }}
        />
      )}
      {paying && (
        <PayModal
          invoice={paying}
          onClose={() => setPaying(null)}
          onPaid={(inv) => {
            setPaying(null);
            reload();
            notificationService.showToast(`Pagamento de ${brl(receivedOf(inv))} registrado (${inv.clientName}).`, 'success');
          }}
        />
      )}
    </div>
  );
};

