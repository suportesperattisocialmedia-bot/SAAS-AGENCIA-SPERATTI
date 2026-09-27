import { describe, expect, it } from 'vitest';
import type { Contract, Expense, Invoice } from '../src/types';
import {
  agingBuckets,
  brl,
  forecast,
  invoiceState,
  invoiceTotal,
  monthSummary,
  monthlySeries,
  mrr,
  nextInvoiceNumber,
  parseMoney,
  pendingRecurring,
  recurringInvoiceDraft,
  revenueByClient,
  toCsv
} from '../src/services/finance';

const now = '2026-09-26T12:00:00Z';
const contract = (p: Partial<Contract> = {}): Contract => ({
  id: 'c1', clientId: 'cl1', clientName: 'Lumen', title: 'Gestão de redes', kind: 'recorrente', amountCents: 250000, billingDay: 10,
  startDate: '2026-01-01', status: 'ativo', paymentMethod: 'pix', createdAt: now, updatedAt: now, ...p
});
const invoice = (p: Partial<Invoice> = {}): Invoice => ({
  id: 'i' + Math.random(), number: 1, clientId: 'cl1', clientName: 'Lumen', description: 'x',
  items: [{ id: 'a', description: 'x', quantity: 1, unitCents: 100000 }], discountCents: 0,
  issueDate: '2026-09-01', dueDate: '2026-09-10', status: 'aberta', paymentMethod: 'pix', createdAt: now, updatedAt: now, ...p
});
const expense = (p: Partial<Expense> = {}): Expense => ({
  id: 'e' + Math.random(), description: 'Canva', category: 'ferramentas', amountCents: 5000, date: '2026-09-05', paid: true, paidAt: '2026-09-05',
  recurring: true, createdAt: now, updatedAt: now, ...p
});

describe('dinheiro', () => {
  it('parseMoney aceita formatos comuns e recusa lixo', () => {
    expect(parseMoney('1.234,56')).toBe(123456);
    expect(parseMoney('R$ 800')).toBe(80000);
    expect(parseMoney('2500,5')).toBe(250050);
    expect(parseMoney('1.500')).toBe(150000);
    expect(parseMoney('99.9')).toBe(9990);
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('1,2,3')).toBeNull();
  });
  it('brl formata em reais', () => {
    expect(brl(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
  });
  it('total com itens, quantidade e desconto (nunca negativo)', () => {
    expect(invoiceTotal({ items: [{ id: 'a', description: 'a', quantity: 2, unitCents: 1500 }, { id: 'b', description: 'b', quantity: 1, unitCents: 1000 }], discountCents: 500 })).toBe(3500);
    expect(invoiceTotal({ items: [{ id: 'a', description: 'a', quantity: 1, unitCents: 100 }], discountCents: 500 })).toBe(0);
  });
  it('número sequencial', () => {
    expect(nextInvoiceNumber([])).toBe(1);
    expect(nextInvoiceNumber([{ number: 3 }, { number: 7 }])).toBe(8);
  });
});

describe('situação e resumo', () => {
  it('vencida é calculada pela data', () => {
    expect(invoiceState(invoice({ dueDate: '2026-09-25' }), '2026-09-26')).toBe('vencida');
    expect(invoiceState(invoice({ dueDate: '2026-09-26' }), '2026-09-26')).toBe('aberta');
    expect(invoiceState(invoice({ status: 'paga', dueDate: '2026-01-01' }), '2026-09-26')).toBe('paga');
  });
  it('resumo do mês: recebido pela data de pagamento, a receber, vencidos, despesas e resultado', () => {
    const invs = [
      invoice({ status: 'paga', paidAt: '2026-09-12', paidCents: 100000, dueDate: '2026-09-10' }),
      invoice({ status: 'paga', paidAt: '2026-08-30', dueDate: '2026-08-30' }), // agosto
      invoice({ dueDate: '2026-09-30' }), // a receber
      invoice({ dueDate: '2026-08-10' }), // vencida de agosto
      invoice({ status: 'cancelada', dueDate: '2026-09-15' })
    ];
    const exps = [expense(), expense({ paid: false, paidAt: undefined, date: '2026-09-28', amountCents: 20000 })];
    const s = monthSummary(invs, exps, [contract()], '2026-09', '2026-09-26');
    expect(s.receivedCents).toBe(100000);
    expect(s.toReceiveCents).toBe(100000);
    expect(s.overdueCents).toBe(100000);
    expect(s.overdueCount).toBe(1);
    expect(s.expensesPaidCents).toBe(5000);
    expect(s.expensesDueCents).toBe(20000);
    expect(s.resultCents).toBe(95000);
    expect(s.mrrCents).toBe(250000);
    expect(s.collectionRate).toBe(0.5);
  });
  it('MRR ignora pausados, encerrados, avulsos e contratos que ainda não começaram', () => {
    expect(mrr([contract(), contract({ id: 'c2', status: 'pausado' }), contract({ id: 'c3', kind: 'avulso' }), contract({ id: 'c4', startDate: '2026-10-01' }), contract({ id: 'c5', endDate: '2026-08-31' })], '2026-09-26')).toBe(250000);
  });
  it('série de 12 meses e receita por cliente', () => {
    const invs = [invoice({ status: 'paga', paidAt: '2026-09-02' }), invoice({ status: 'paga', paidAt: '2026-07-02', clientId: 'cl2', clientName: 'Vértice', items: [{ id: 'a', description: 'a', quantity: 1, unitCents: 300000 }] })];
    const series = monthlySeries(invs, [expense()], 12, '2026-09-26');
    expect(series).toHaveLength(12);
    expect(series[0].month).toBe('2025-10');
    expect(series[11]).toEqual({ month: '2026-09', receivedCents: 100000, expensesCents: 5000 });
    expect(revenueByClient(invs, '2026-07', '2026-09').map((r) => r.clientName)).toEqual(['Vértice', 'Lumen']);
  });
  it('idade dos recebíveis', () => {
    const b = agingBuckets([invoice({ dueDate: '2026-10-01' }), invoice({ dueDate: '2026-09-20' }), invoice({ dueDate: '2026-07-01' }), invoice({ status: 'paga', dueDate: '2026-01-01' })], '2026-09-26');
    expect(b.map((x) => x.count)).toEqual([1, 1, 0, 1]);
  });
});

describe('recorrência', () => {
  it('gera uma vez por mês por contrato ativo', () => {
    const c = contract();
    expect(pendingRecurring([c, contract({ id: 'c2', status: 'pausado' })], [], '2026-09').map((x) => x.id)).toEqual(['c1']);
    expect(pendingRecurring([c], [invoice({ contractId: 'c1', period: '2026-09' })], '2026-09')).toEqual([]);
    // Cobrança cancelada não conta: pode gerar de novo.
    expect(pendingRecurring([c], [invoice({ contractId: 'c1', period: '2026-09', status: 'cancelada' })], '2026-09')).toHaveLength(1);
    // Encerrado antes do mês, ou começa depois: não gera.
    expect(pendingRecurring([contract({ endDate: '2026-08-31' }), contract({ id: 'c3', startDate: '2026-10-02' })], [], '2026-09')).toEqual([]);
  });
  it('rascunho usa o dia de vencimento (limitado ao fim do mês) e o valor do contrato', () => {
    const d = recurringInvoiceDraft(contract({ billingDay: 28 }), '2026-02', '2026-02-01');
    expect(d.dueDate).toBe('2026-02-28');
    expect(d.period).toBe('2026-02');
    expect(invoiceTotal(d)).toBe(250000);
  });
  it('previsão soma abertas + recorrentes ainda não geradas', () => {
    const f = forecast([contract()], [invoice({ dueDate: '2026-10-05' })], '2026-09-26', 2);
    expect(f).toEqual([
      { month: '2026-09', openCents: 0, recurringCents: 250000 },
      { month: '2026-10', openCents: 100000, recurringCents: 250000 }
    ]);
  });
});

describe('CSV', () => {
  it('ponto e vírgula, BOM e proteção contra fórmula', () => {
    const csv = toCsv([{ Cliente: '=HYPERLINK("x")', Valor: -10, Obs: 'a;b' }]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(';-10;');
    expect(csv).toContain('"a;b"');
  });
});
