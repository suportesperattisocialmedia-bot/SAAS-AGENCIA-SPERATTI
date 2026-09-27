import { useCallback, useEffect, useState } from 'react';
import type { Contract, Expense, Invoice, PaymentMethod, Project, ProjectStage } from '../../types';
import { storageService } from '../../services/storageService';
import { syncService } from '../../services/sync/syncService';
import { invoiceTotal, nextInvoiceNumber, pendingRecurring, recurringInvoiceDraft, todayBR } from '../../services/finance';

export interface FinanceData {
  contracts: Contract[];
  invoices: Invoice[];
  projects: Project[];
  expenses: Expense[];
}

const load = (): FinanceData => ({
  contracts: storageService.finance.contracts.getAll(),
  invoices: storageService.finance.invoices.getAll(),
  projects: storageService.finance.projects.getAll(),
  expenses: storageService.finance.expenses.getAll()
});

/** Dados financeiros com recarga manual e automática (quando chegam da nuvem). */
export function useFinance(): FinanceData & { reload: () => void } {
  const [data, setData] = useState<FinanceData>(load);
  const reload = useCallback(() => setData(load()), []);
  useEffect(() => syncService.onRemoteChange((keys) => keys.some((k) => k.startsWith('gs_fin_')) && reload()), [reload]);
  return { ...data, reload };
}

type InvoiceInput = Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt'> & { id?: string; number?: number };

export const financeActions = {
  saveInvoice(input: InvoiceInput): Invoice {
    const all = storageService.finance.invoices.getAll();
    const existing = input.id ? all.find((i) => i.id === input.id) : undefined;
    return storageService.finance.invoices.save({ ...input, number: existing?.number ?? input.number ?? nextInvoiceNumber(all) });
  },

  /** Registra o pagamento; o projeto ligado vai para "Recebido". */
  markPaid(inv: Invoice, payment: { paidAt: string; paidCents: number; paymentMethod: PaymentMethod }): Invoice {
    const saved = storageService.finance.invoices.save({ ...inv, status: 'paga', ...payment });
    if (inv.projectId) this.moveProject(inv.projectId, 'recebido');
    return saved;
  },

  reopen(inv: Invoice): Invoice {
    return storageService.finance.invoices.save({ ...inv, status: 'aberta', paidAt: undefined, paidCents: undefined });
  },

  cancel(inv: Invoice): Invoice {
    return storageService.finance.invoices.save({ ...inv, status: 'cancelada', paidAt: undefined, paidCents: undefined });
  },

  /** Gera as cobranças recorrentes do mês que ainda não existem. Retorna quantas criou. */
  generateRecurring(month: string): Invoice[] {
    const today = todayBR();
    const contracts = storageService.finance.contracts.getAll();
    const created: Invoice[] = [];
    pendingRecurring(contracts, storageService.finance.invoices.getAll(), month).forEach((c) => {
      created.push(this.saveInvoice(recurringInvoiceDraft(c, month, today)));
    });
    return created;
  },

  moveProject(id: string, stage: ProjectStage): Project | undefined {
    const p = storageService.finance.projects.getById(id);
    if (!p || p.stage === stage) return p;
    return storageService.finance.projects.save({ ...p, stage, stageHistory: [...p.stageHistory, { stage, at: new Date().toISOString() }] });
  },

  /** Cria a cobrança do projeto e o move para "Faturado". */
  invoiceProject(p: Project, dueDate: string, paymentMethod: PaymentMethod): Invoice {
    const inv = this.saveInvoice({
      clientId: p.clientId,
      clientName: p.clientName,
      projectId: p.id,
      contractId: p.contractId,
      description: p.title,
      items: [{ id: `${p.id}-item`, description: p.title, quantity: 1, unitCents: p.valueCents }],
      discountCents: 0,
      issueDate: todayBR(),
      dueDate,
      status: 'aberta',
      paymentMethod
    });
    this.moveProject(p.id, 'faturado');
    return inv;
  },

  /** Lança no mês as despesas recorrentes do mês anterior que ainda não foram lançadas. */
  copyRecurringExpenses(fromMonth: string, toMonth: string): number {
    const all = storageService.finance.expenses.getAll();
    const already = new Set(all.filter((e) => e.date.startsWith(toMonth)).map((e) => `${e.description}|${e.category}`));
    let n = 0;
    all
      .filter((e) => e.recurring && e.date.startsWith(fromMonth) && !already.has(`${e.description}|${e.category}`))
      .forEach((e) => {
        const day = e.date.slice(8, 10);
        const [y, m] = toMonth.split('-').map(Number);
        const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
        storageService.finance.expenses.save({
          description: e.description,
          category: e.category,
          amountCents: e.amountCents,
          date: `${toMonth}-${String(Math.min(Number(day), last)).padStart(2, '0')}`,
          paid: false,
          recurring: true,
          clientId: e.clientId,
          notes: e.notes
        });
        n += 1;
      });
    return n;
  }
};

export { invoiceTotal };
