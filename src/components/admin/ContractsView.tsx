import React, { useState } from 'react';
import { FilePlus2, Plus } from 'lucide-react';
import type { Contract } from '../../types';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { PAYMENT_METHODS, brl, monthName, monthOnly, mrr, pendingRecurring, recurringInvoiceDraft, todayBR } from '../../services/finance';
import { EmptyState, PageHeader, PrimaryButton, Segmented } from './ui';
import { ContractModal, type ClientOption } from './forms';
import { financeActions, type FinanceData } from './useFinance';

const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const STATUS: Record<Contract['status'], string> = {
  ativo: 'bg-emerald-400/15 text-emerald-300',
  pausado: 'bg-amber-400/15 text-amber-300',
  encerrado: 'bg-white/[0.06] text-neutral-400'
};

export const ContractsView: React.FC<FinanceData & { clients: ClientOption[]; reload: () => void }> = ({ contracts, invoices, clients, reload }) => {
  const today = todayBR();
  const month = today.slice(0, 7);
  const [filter, setFilter] = useState<'todos' | Contract['status']>('ativo');
  const [editing, setEditing] = useState<Contract | 'new' | null>(null);
  const pendingIds = new Set(pendingRecurring(contracts, invoices, month).map((c) => c.id));
  const list = contracts
    .filter((c) => filter === 'todos' || c.status === filter)
    .sort((a, b) => a.clientName.localeCompare(b.clientName) || a.title.localeCompare(b.title));
  const count = (s: Contract['status']) => contracts.filter((c) => c.status === s).length;

  const billNow = (c: Contract) => {
    const inv = financeActions.saveInvoice(recurringInvoiceDraft(c, month, today));
    reload();
    notificationService.showToast(`Cobrança de ${monthName(month).toLowerCase()} criada: ${brl(c.amountCents)} (${c.clientName}).`, 'success');
    return inv;
  };

  const remove = (c: Contract) => {
    storageService.finance.contracts.delete(c.id);
    setEditing(null);
    reload();
    notificationService.undoable(`Contrato "${c.title}" excluído. As cobranças já geradas continuam.`, () => {
      storageService.finance.contracts.restore(c);
      reload();
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contratos"
        subtitle={
          <>
            Receita recorrente mensal (MRR): <span className="font-medium tabular-nums text-neutral-100">{brl(mrr(contracts, today))}</span> · {count('ativo')} {count('ativo') === 1 ? 'ativo' : 'ativos'}
          </>
        }
        actions={
          <PrimaryButton onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Novo contrato
          </PrimaryButton>
        }
      />
      <Segmented
        label="Situação"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'ativo', label: 'Ativos', count: count('ativo') },
          { id: 'pausado', label: 'Pausados', count: count('pausado') },
          { id: 'encerrado', label: 'Encerrados', count: count('encerrado') },
          { id: 'todos', label: 'Todos', count: contracts.length }
        ]}
      />
      {contracts.length === 0 ? (
        <EmptyState
          title="Nenhum contrato cadastrado"
          text="Cadastre as mensalidades (gestão de redes, tráfego...) e os projetos fechados. Os recorrentes geram a cobrança de cada mês com um clique."
          action={
            <PrimaryButton onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Novo contrato
            </PrimaryButton>
          }
        />
      ) : list.length === 0 ? (
        <p className="rounded-[24px] bg-[#161618] p-8 text-center text-sm text-neutral-500">Nenhum contrato nesta situação.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const billed = invoices.filter((i) => i.contractId === c.id && i.status !== 'cancelada');
            return (
              <li key={c.id} className="flex flex-col rounded-[24px] border border-white/[0.06] bg-[#161618] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-neutral-500">{c.clientName}</p>
                    <h3 className="mt-0.5 truncate text-base font-semibold text-neutral-50">{c.title}</h3>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] capitalize ${STATUS[c.status]}`}>{c.status}</span>
                </div>
                <p className="mt-4 text-2xl font-semibold tabular-nums text-neutral-50">
                  {brl(c.amountCents)}
                  <span className="ml-1 text-sm font-normal text-neutral-500">{c.kind === 'recorrente' ? '/mês' : 'total'}</span>
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {c.kind === 'recorrente' ? `Vence todo dia ${c.billingDay}` : 'Avulso'} · {PAYMENT_METHODS.find((m) => m.id === c.paymentMethod)?.label} · desde {br(c.startDate)}
                  {c.endDate ? ` até ${br(c.endDate)}` : ''}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{billed.length} {billed.length === 1 ? 'cobrança gerada' : 'cobranças geradas'}</p>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.05] pt-3">
                  {pendingIds.has(c.id) && (
                    <button type="button" onClick={() => billNow(c)} className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-400">
                      <FilePlus2 className="h-3.5 w-3.5" /> Cobrar {monthOnly(month)}
                    </button>
                  )}
                  <button type="button" onClick={() => setEditing(c)} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/[0.1]">
                    Editar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <ContractModal
          initial={editing === 'new' ? undefined : editing}
          clients={clients}
          onClose={() => setEditing(null)}
          onDelete={editing !== 'new' ? () => remove(editing) : undefined}
          onSaved={(c) => {
            setEditing(null);
            reload();
            notificationService.showToast(`Contrato "${c.title}" salvo.`, 'success');
          }}
        />
      )}
    </div>
  );
};
