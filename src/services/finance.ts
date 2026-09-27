/**
 * Regras do financeiro da agência. Funções puras (datas YYYY-MM-DD, valores em centavos),
 * testáveis sem navegador. Datas de "hoje" sempre no fuso de Brasília.
 */

import type { Contract, Expense, Invoice, PaymentMethod, Project, ProjectStage } from '../types';

export const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string }> = [
  { id: 'pix', label: 'Pix' },
  { id: 'boleto', label: 'Boleto' },
  { id: 'transferencia', label: 'Transferência' },
  { id: 'cartao', label: 'Cartão' },
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'outro', label: 'Outro' }
];

export const PROJECT_STAGES: Array<{ id: ProjectStage; label: string; color: string }> = [
  { id: 'proposta', label: 'Proposta', color: '#a3a3a3' },
  { id: 'aprovado', label: 'Aprovado', color: '#93c5fd' },
  { id: 'producao', label: 'Em produção', color: '#fcd34d' },
  { id: 'revisao', label: 'Revisão', color: '#fdba74' },
  { id: 'entregue', label: 'Entregue', color: '#5eead4' },
  { id: 'faturado', label: 'Faturado', color: '#c4b5fd' },
  { id: 'recebido', label: 'Recebido', color: '#86efac' }
];

export const EXPENSE_CATEGORIES: Array<{ id: Expense['category']; label: string }> = [
  { id: 'ferramentas', label: 'Ferramentas e softwares' },
  { id: 'equipe', label: 'Equipe' },
  { id: 'freelancer', label: 'Freelancers' },
  { id: 'anuncios', label: 'Anúncios' },
  { id: 'impostos', label: 'Impostos e taxas' },
  { id: 'escritorio', label: 'Escritório' },
  { id: 'outros', label: 'Outros' }
];

const DAY_MS = 24 * 3600 * 1000;

export function todayBR(now = new Date()): string {
  return new Date(now.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export function addDaysISO(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export function shiftMonthISO(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/** Só o nome do mês, minúsculo: "setembro". */
export function monthOnly(month: string): string {
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
}

export function monthName(month: string, style: 'long' | 'short' = 'long'): string {
  const s = new Date(`${month}-01T12:00:00Z`).toLocaleDateString('pt-BR', { month: style, year: style === 'long' ? 'numeric' : '2-digit', timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1).replace('.', '');
}

/** "R$ 1.234,56" a partir de centavos. */
export function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Converte o que a pessoa digitou ("1.234,56", "1234.5", "R$ 800") em centavos; null se inválido. */
export function parseMoney(input: string): number | null {
  const clean = input.replace(/R\$|\s/g, '').trim();
  if (!clean) return null;
  let normalized: string;
  if (clean.includes(',')) normalized = clean.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) normalized = clean.replace(/\./g, '');
  else normalized = clean;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export function centsToInput(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function invoiceTotal(inv: Pick<Invoice, 'items' | 'discountCents'>): number {
  const gross = inv.items.reduce((acc, i) => acc + Math.round(i.quantity * i.unitCents), 0);
  return Math.max(0, gross - (inv.discountCents ?? 0));
}

export type InvoiceState = 'aberta' | 'vencida' | 'paga' | 'cancelada';

export function invoiceState(inv: Pick<Invoice, 'status' | 'dueDate'>, today: string): InvoiceState {
  if (inv.status !== 'aberta') return inv.status;
  return inv.dueDate < today ? 'vencida' : 'aberta';
}

export function daysLate(inv: Pick<Invoice, 'dueDate'>, today: string): number {
  return Math.max(0, Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${inv.dueDate}T12:00:00Z`)) / DAY_MS));
}

export function nextInvoiceNumber(invoices: Pick<Invoice, 'number'>[]): number {
  return invoices.reduce((max, i) => Math.max(max, i.number), 0) + 1;
}

export const formatInvoiceNumber = (n: number) => `#${String(n).padStart(4, '0')}`;

/** Valor recebido de uma cobrança paga (o pago informado, ou o total). */
export const receivedOf = (inv: Invoice) => inv.paidCents ?? invoiceTotal(inv);

// ---------------------------------------------------------------------------
// Resumo do mês
// ---------------------------------------------------------------------------

export interface MonthSummary {
  month: string;
  /** Recebido no mês (pela data de pagamento). */
  receivedCents: number;
  /** Ainda a receber de cobranças que vencem no mês. */
  toReceiveCents: number;
  /** Tudo que está vencido e não foi pago (qualquer mês). */
  overdueCents: number;
  overdueCount: number;
  /** Despesas do mês (pela data): pagas e a pagar. */
  expensesPaidCents: number;
  expensesDueCents: number;
  /** Recebido - despesas pagas no mês. */
  resultCents: number;
  /** Receita recorrente mensal dos contratos ativos. */
  mrrCents: number;
  /** Recebido / (recebido + a receber) do mês, 0..1; null sem cobranças no mês. */
  collectionRate: number | null;
}

export function mrr(contracts: Contract[], today: string): number {
  return contracts
    .filter((c) => c.kind === 'recorrente' && c.status === 'ativo' && c.startDate <= today && (!c.endDate || c.endDate >= today))
    .reduce((acc, c) => acc + c.amountCents, 0);
}

export function monthSummary(invoices: Invoice[], expenses: Expense[], contracts: Contract[], month: string, today: string): MonthSummary {
  const paid = invoices.filter((i) => i.status === 'paga' && i.paidAt?.startsWith(month));
  const receivedCents = paid.reduce((acc, i) => acc + receivedOf(i), 0);
  const openThisMonth = invoices.filter((i) => i.status === 'aberta' && i.dueDate.startsWith(month));
  const toReceiveCents = openThisMonth.reduce((acc, i) => acc + invoiceTotal(i), 0);
  const overdue = invoices.filter((i) => invoiceState(i, today) === 'vencida');
  const monthExpenses = expenses.filter((e) => (e.paid ? (e.paidAt ?? e.date) : e.date).startsWith(month));
  const expensesPaidCents = monthExpenses.filter((e) => e.paid).reduce((acc, e) => acc + e.amountCents, 0);
  const expensesDueCents = monthExpenses.filter((e) => !e.paid).reduce((acc, e) => acc + e.amountCents, 0);
  const paidDueThisMonth = invoices.filter((i) => i.status === 'paga' && i.dueDate.startsWith(month)).reduce((acc, i) => acc + receivedOf(i), 0);
  const base = paidDueThisMonth + toReceiveCents;
  return {
    month,
    receivedCents,
    toReceiveCents,
    overdueCents: overdue.reduce((acc, i) => acc + invoiceTotal(i), 0),
    overdueCount: overdue.length,
    expensesPaidCents,
    expensesDueCents,
    resultCents: receivedCents - expensesPaidCents,
    mrrCents: mrr(contracts, today),
    collectionRate: base > 0 ? paidDueThisMonth / base : null
  };
}

/** Série mensal (mais antigo primeiro) de recebido x despesas pagas. */
export function monthlySeries(invoices: Invoice[], expenses: Expense[], months: number, today: string): Array<{ month: string; receivedCents: number; expensesCents: number }> {
  const current = today.slice(0, 7);
  return Array.from({ length: months }, (_, i) => shiftMonthISO(current, i - months + 1)).map((month) => ({
    month,
    receivedCents: invoices.filter((i) => i.status === 'paga' && i.paidAt?.startsWith(month)).reduce((acc, i) => acc + receivedOf(i), 0),
    expensesCents: expenses.filter((e) => e.paid && (e.paidAt ?? e.date).startsWith(month)).reduce((acc, e) => acc + e.amountCents, 0)
  }));
}

/** Recebido por cliente num intervalo de meses (inclusive). */
export function revenueByClient(invoices: Invoice[], fromMonth: string, toMonth: string): Array<{ clientId: string; clientName: string; receivedCents: number; invoices: number }> {
  const map = new Map<string, { clientId: string; clientName: string; receivedCents: number; invoices: number }>();
  invoices
    .filter((i) => i.status === 'paga' && i.paidAt && i.paidAt.slice(0, 7) >= fromMonth && i.paidAt.slice(0, 7) <= toMonth)
    .forEach((i) => {
      const row = map.get(i.clientId) ?? { clientId: i.clientId, clientName: i.clientName, receivedCents: 0, invoices: 0 };
      row.receivedCents += receivedOf(i);
      row.invoices += 1;
      map.set(i.clientId, row);
    });
  return [...map.values()].sort((a, b) => b.receivedCents - a.receivedCents);
}

/** Contas a receber por idade do atraso. */
export function agingBuckets(invoices: Invoice[], today: string): Array<{ label: string; cents: number; count: number }> {
  const buckets = [
    { label: 'A vencer', min: -Infinity, max: 0 },
    { label: '1 a 30 dias', min: 1, max: 30 },
    { label: '31 a 60 dias', min: 31, max: 60 },
    { label: 'Mais de 60 dias', min: 61, max: Infinity }
  ];
  const open = invoices.filter((i) => i.status === 'aberta');
  return buckets.map((b) => {
    const list = open.filter((i) => {
      const late = i.dueDate < today ? daysLate(i, today) : 0;
      return late >= b.min && late <= b.max;
    });
    return { label: b.label, cents: list.reduce((acc, i) => acc + invoiceTotal(i), 0), count: list.length };
  });
}

// ---------------------------------------------------------------------------
// Cobranças recorrentes
// ---------------------------------------------------------------------------

function lastDayOfMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Contratos recorrentes ativos no mês que ainda não têm cobrança daquele mês. */
export function pendingRecurring(contracts: Contract[], invoices: Invoice[], month: string): Contract[] {
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(lastDayOfMonth(month)).padStart(2, '0')}`;
  return contracts.filter(
    (c) =>
      c.kind === 'recorrente' &&
      c.status === 'ativo' &&
      c.startDate <= monthEnd &&
      (!c.endDate || c.endDate >= monthStart) &&
      !invoices.some((i) => i.contractId === c.id && i.period === month && i.status !== 'cancelada')
  );
}

/** Dados da cobrança mensal de um contrato (sem id/número: quem salva completa). */
export function recurringInvoiceDraft(c: Contract, month: string, today: string): Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt'> {
  const day = Math.min(c.billingDay ?? 10, lastDayOfMonth(month));
  return {
    clientId: c.clientId,
    clientName: c.clientName,
    contractId: c.id,
    period: month,
    description: `${c.title} · ${monthName(month)}`,
    items: [{ id: `${c.id}-${month}`, description: `${c.title} (${monthName(month)})`, quantity: 1, unitCents: c.amountCents }],
    discountCents: 0,
    issueDate: today,
    dueDate: `${month}-${String(day).padStart(2, '0')}`,
    status: 'aberta',
    paymentMethod: c.paymentMethod
  };
}

/** Previsão dos próximos meses: cobranças abertas + recorrentes ainda não geradas. */
export function forecast(contracts: Contract[], invoices: Invoice[], today: string, months = 3): Array<{ month: string; openCents: number; recurringCents: number }> {
  const current = today.slice(0, 7);
  return Array.from({ length: months }, (_, i) => shiftMonthISO(current, i)).map((month) => ({
    month,
    openCents: invoices.filter((i) => i.status === 'aberta' && i.dueDate.startsWith(month)).reduce((acc, i) => acc + invoiceTotal(i), 0),
    recurringCents: pendingRecurring(contracts, invoices, month).reduce((acc, c) => acc + c.amountCents, 0)
  }));
}

// ---------------------------------------------------------------------------
// Projetos
// ---------------------------------------------------------------------------

export function nextStage(stage: ProjectStage): ProjectStage | null {
  const i = PROJECT_STAGES.findIndex((s) => s.id === stage);
  return i >= 0 && i < PROJECT_STAGES.length - 1 ? PROJECT_STAGES[i + 1].id : null;
}

export function pipelineTotals(projects: Project[]): Record<ProjectStage, { count: number; cents: number }> {
  const out = Object.fromEntries(PROJECT_STAGES.map((s) => [s.id, { count: 0, cents: 0 }])) as Record<ProjectStage, { count: number; cents: number }>;
  projects.forEach((p) => {
    out[p.stage].count += 1;
    out[p.stage].cents += p.valueCents;
  });
  return out;
}

/** CSV com ponto e vírgula e BOM (abre certo no Excel em português). */
export function toCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) => {
    const s = String(v);
    // Evita fórmulas no Excel (injeção de CSV).
    const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
    return /[;"\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return '﻿' + [headers.join(';'), ...rows.map((r) => headers.map((h) => esc(r[h] ?? '')).join(';'))].join('\n');
}
