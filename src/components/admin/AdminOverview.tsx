import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, ArrowUpRight, Banknote, CalendarClock, ChevronLeft, ChevronRight, Download, Hourglass, Repeat, Scale, TrendingUp, Wallet } from 'lucide-react';
import type { Client, DeliveryTask } from '../../types';
import { Card, DeltaPill } from '../agency/DashboardPanels';
import { CountUp } from '../common/CountUp';
import { notificationService } from '../../services/notificationService';
import { packageProgress } from '../../services/taskInsights';
import {
  EXPENSE_CATEGORIES,
  PROJECT_STAGES,
  agingBuckets,
  brl,
  daysLate,
  forecast,
  formatInvoiceNumber,
  invoiceState,
  invoiceTotal,
  monthName,
  monthSummary,
  monthlySeries,
  pendingRecurring,
  pipelineTotals,
  revenueByClient,
  shiftMonthISO,
  toCsv,
  todayBR
} from '../../services/finance';
import { downloadText } from './ui';
import { financeActions, type FinanceData } from './useFinance';

export type AdminSection = 'overview' | 'invoices' | 'contracts' | 'projects' | 'expenses';

const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const compactBRL = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: cents >= 1_000_000 ? 'compact' : 'standard', maximumFractionDigits: cents >= 1_000_000 ? 1 : 0 });

const Kpi: React.FC<{ label: string; cents: number; icon: React.ElementType; hint?: React.ReactNode; delta?: number | null; highlight?: boolean; tone?: 'danger' | 'good'; delay: number; onClick?: () => void }> = ({
  label,
  cents,
  icon: Icon,
  hint,
  delta = null,
  highlight,
  tone,
  delay,
  onClick
}) => (
  <Card delay={delay} className={`flex min-h-[150px] flex-col justify-between p-5 ${highlight ? '!border-transparent !bg-neutral-50' : ''}`}>
    <div className="flex items-start justify-between gap-3">
      <p className={`text-sm font-medium ${highlight ? 'text-neutral-700' : 'text-neutral-300'}`}>{label}</p>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={`Abrir ${label}`}
          className={`grid h-10 w-10 place-items-center rounded-full transition-transform hover:scale-105 ${highlight ? 'bg-amber-500 text-neutral-950' : 'bg-white/[0.07] text-neutral-300'}`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ) : (
        <span className={`grid h-10 w-10 place-items-center rounded-full ${highlight ? 'bg-amber-500 text-neutral-950' : 'bg-white/[0.07] text-neutral-300'}`}>
          <Icon className="h-4 w-4" />
        </span>
      )}
    </div>
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <p
          className={`text-[28px] font-semibold leading-none tracking-tight tabular-nums ${
            highlight ? 'text-neutral-950' : tone === 'danger' && cents > 0 ? 'text-rose-300' : tone === 'good' && cents < 0 ? 'text-rose-300' : 'text-neutral-50'
          }`}
        >
          <CountUp value={cents} format={(n) => brl(Math.round(n))} />
        </p>
        <DeltaPill value={delta} />
      </div>
      {hint && <p className={`text-[11px] ${highlight ? 'text-neutral-600' : 'text-neutral-500'}`}>{hint}</p>}
    </div>
  </Card>
);

export const AdminOverview: React.FC<
  FinanceData & { clients: Client[]; tasks: DeliveryTask[]; reload: () => void; onNavigate: (s: AdminSection) => void }
> = ({ contracts, invoices, projects, expenses, clients, tasks, reload, onNavigate }) => {
  const reduce = useReducedMotion();
  const today = todayBR();
  const [month, setMonth] = useState(today.slice(0, 7));
  const isCurrent = month === today.slice(0, 7);
  const s = monthSummary(invoices, expenses, contracts, month, today);
  const prev = monthSummary(invoices, expenses, contracts, shiftMonthISO(month, -1), today);
  const delta = prev.receivedCents > 0 ? Math.round(((s.receivedCents - prev.receivedCents) / prev.receivedCents) * 1000) / 10 : null;
  const series = useMemo(() => monthlySeries(invoices, expenses, 12, `${month}-15`), [invoices, expenses, month]);
  const maxBar = Math.max(1, ...series.flatMap((p) => [p.receivedCents, p.expensesCents]));
  const byClient = revenueByClient(invoices, shiftMonthISO(month, -2), month).slice(0, 6);
  const clientMax = Math.max(1, ...byClient.map((c) => c.receivedCents));
  const aging = agingBuckets(invoices, today);
  const upcoming = invoices
    .filter((i) => i.status === 'aberta')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 7);
  const pending = pendingRecurring(contracts, invoices, month);
  const pipe = pipelineTotals(projects);
  const fc = forecast(contracts, invoices, today, 3);
  const packages = packageProgress(clients, tasks);
  const monthRevenueByClient = new Map(revenueByClient(invoices, month, month).map((r) => [r.clientId, r.receivedCents]));
  const deliveryRows = clients
    .map((c) => {
      const pkg = packages.find((p) => p.clientId === c.id);
      const doneInMonth = tasks.filter((t) => t.clientId === c.id && t.status === 'done' && t.completedAt?.slice(0, 7) === month).length;
      const inProduction = tasks.filter((t) => t.clientId === c.id && t.status !== 'done').length;
      return { client: c, pkg, doneInMonth, inProduction, received: monthRevenueByClient.get(c.id) ?? 0, mrr: contracts.filter((k) => k.clientId === c.id && k.kind === 'recorrente' && k.status === 'ativo').reduce((a, k) => a + k.amountCents, 0) };
    })
    .filter((r) => r.pkg || r.doneInMonth || r.inProduction || r.received || r.mrr)
    .sort((a, b) => b.mrr - a.mrr || b.received - a.received);

  const exportMonth = () => {
    const rows: Array<Record<string, string | number>> = [
      ...revenueByClient(invoices, month, month).map((r) => ({ Tipo: 'Receita', Descricao: r.clientName, Valor: (r.receivedCents / 100).toFixed(2).replace('.', ',') })),
      ...EXPENSE_CATEGORIES.map((c) => ({
        Tipo: 'Despesa',
        Descricao: c.label,
        Valor: (-expenses.filter((e) => e.paid && e.category === c.id && (e.paidAt ?? e.date).startsWith(month)).reduce((a, e) => a + e.amountCents, 0) / 100).toFixed(2).replace('.', ',')
      })).filter((r) => r.Valor !== '0,00' && r.Valor !== '-0,00'),
      { Tipo: 'Total', Descricao: 'Recebido', Valor: (s.receivedCents / 100).toFixed(2).replace('.', ',') },
      { Tipo: 'Total', Descricao: 'Despesas pagas', Valor: (-s.expensesPaidCents / 100).toFixed(2).replace('.', ',') },
      { Tipo: 'Total', Descricao: 'Resultado', Valor: (s.resultCents / 100).toFixed(2).replace('.', ',') },
      { Tipo: 'Pendente', Descricao: 'A receber no mês', Valor: (s.toReceiveCents / 100).toFixed(2).replace('.', ',') },
      { Tipo: 'Pendente', Descricao: 'Vencido (todos os meses)', Valor: (s.overdueCents / 100).toFixed(2).replace('.', ',') }
    ];
    downloadText(`financeiro_${month}.csv`, toCsv(rows));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 text-xs text-neutral-400">
            <Scale className="h-3.5 w-3.5" /> Administração
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">Financeiro da agência</h1>
        </div>
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
          <button type="button" onClick={exportMonth} className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm text-neutral-200 hover:bg-white/[0.1]">
            <Download className="h-4 w-4" /> Fechamento do mês
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[22px] border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3 text-sm text-neutral-200">
            <Repeat className="h-5 w-5 shrink-0 text-amber-400" />
            {pending.length} {pending.length === 1 ? 'mensalidade ainda não cobrada' : 'mensalidades ainda não cobradas'} em {monthName(month).toLowerCase()}: {brl(pending.reduce((a, c) => a + c.amountCents, 0))}.
          </p>
          <button
            type="button"
            onClick={() => {
              const created = financeActions.generateRecurring(month);
              reload();
              notificationService.showToast(`${created.length} ${created.length === 1 ? 'cobrança gerada' : 'cobranças geradas'}.`, 'success');
            }}
            className="shrink-0 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400"
          >
            Gerar cobranças
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Recebido no mês" cents={s.receivedCents} icon={Banknote} delta={delta} highlight delay={0} hint={delta === null ? 'Pela data do pagamento' : 'vs mês anterior'} onClick={() => onNavigate('invoices')} />
        <Kpi
          label="A receber no mês"
          cents={s.toReceiveCents}
          icon={Hourglass}
          delay={0.05}
          hint={s.collectionRate === null ? 'Cobranças abertas com vencimento no mês' : `${Math.round(s.collectionRate * 100)}% do mês já recebido`}
          onClick={() => onNavigate('invoices')}
        />
        <Kpi label="Vencido" cents={s.overdueCents} icon={AlertTriangle} tone="danger" delay={0.1} hint={`${s.overdueCount} ${s.overdueCount === 1 ? 'cobrança atrasada' : 'cobranças atrasadas'}`} onClick={() => onNavigate('invoices')} />
        <Kpi label="Receita recorrente (MRR)" cents={s.mrrCents} icon={Repeat} delay={0.15} hint={(() => { const n = contracts.filter((c) => c.kind === 'recorrente' && c.status === 'ativo').length; return `${n} ${n === 1 ? 'contrato ativo' : 'contratos ativos'}`; })()} onClick={() => onNavigate('contracts')} />
        <Kpi label="Despesas pagas" cents={s.expensesPaidCents} icon={Wallet} delay={0.2} hint={s.expensesDueCents ? `${brl(s.expensesDueCents)} a pagar no mês` : 'Nada a pagar no mês'} onClick={() => onNavigate('expenses')} />
        <Kpi label="Resultado do mês" cents={s.resultCents} icon={TrendingUp} tone="good" delay={0.25} hint="Recebido menos despesas pagas" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <Card delay={0.3} className="p-5 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-neutral-50">Últimos 12 meses</h2>
            <div className="flex gap-4 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Recebido
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-500" /> Despesas
              </span>
            </div>
          </div>
          <div className="mt-6 flex h-52 items-end gap-2" role="img" aria-label="Recebido e despesas por mês nos últimos 12 meses">
            {series.map((p) => (
              <div key={p.month} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div className="relative flex h-full w-full items-end justify-center gap-0.5">
                  <span className="pointer-events-none absolute -top-1 z-10 hidden -translate-y-full whitespace-nowrap rounded-lg bg-neutral-50 px-2 py-1 text-[10px] text-neutral-950 group-hover:block">
                    {brl(p.receivedCents)} / {brl(p.expensesCents)}
                  </span>
                  <motion.span
                    initial={reduce ? false : { height: 0 }}
                    animate={{ height: `${(p.receivedCents / maxBar) * 100}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className={`w-1/2 max-w-[18px] rounded-t-md ${p.month === month ? 'bg-amber-400' : 'bg-amber-500/70'}`}
                  />
                  <motion.span
                    initial={reduce ? false : { height: 0 }}
                    animate={{ height: `${(p.expensesCents / maxBar) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className="w-1/2 max-w-[18px] rounded-t-md bg-neutral-600"
                  />
                </div>
                <span className={`text-[10px] ${p.month === month ? 'text-neutral-200' : 'text-neutral-500'}`}>{monthName(p.month, 'short').slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card delay={0.35} className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-50">Próximos vencimentos</h2>
            <button type="button" onClick={() => onNavigate('invoices')} aria-label="Abrir cobranças" className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.07] text-neutral-200 hover:bg-white/[0.12]">
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-6 text-sm text-neutral-500">Nenhuma cobrança em aberto.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/[0.05]">
              {upcoming.map((i) => {
                const st = invoiceState(i, today);
                return (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-neutral-100">{i.clientName}</p>
                      <p className="truncate text-[11px] text-neutral-500">
                        {formatInvoiceNumber(i.number)} · {i.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm tabular-nums text-neutral-100">{brl(invoiceTotal(i))}</p>
                      <p className={`text-[11px] tabular-nums ${st === 'vencida' ? 'text-rose-300' : i.dueDate === today ? 'text-amber-300' : 'text-neutral-500'}`}>
                        {st === 'vencida' ? `${daysLate(i, today)}d atrasada` : i.dueDate === today ? 'vence hoje' : `vence ${br(i.dueDate)}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card delay={0.4} className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-neutral-50">Entregas e faturamento por cliente</h2>
            <p className="text-xs text-neutral-500">{monthName(month)}: entregas concluídas x pacote contratado, trabalho em aberto, mensalidade e valor recebido.</p>
          </div>
        </div>
        {deliveryRows.length === 0 ? (
          <p className="mt-5 text-sm text-neutral-500">Cadastre contratos, pacotes mensais (no cadastro do cliente) e tarefas para acompanhar entregas e faturamento lado a lado.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] text-neutral-500">
                  <th className="py-2 pr-3 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Entregas no mês</th>
                  <th className="px-3 py-2 text-right font-medium">Em aberto</th>
                  <th className="px-3 py-2 text-right font-medium">Mensalidade</th>
                  <th className="py-2 pl-3 text-right font-medium">Recebido</th>
                </tr>
              </thead>
              <tbody>
                {deliveryRows.map((r) => {
                  const pct = r.pkg ? Math.min(100, (r.pkg.delivered / r.pkg.target) * 100) : null;
                  return (
                    <tr key={r.client.id} className="border-t border-white/[0.04]">
                      <td className="py-3 pr-3 text-neutral-100">{r.client.name}</td>
                      <td className="px-3 py-3">
                        {r.pkg ? (
                          <div className="flex items-center gap-3">
                            <span className="w-14 tabular-nums text-neutral-200">
                              {r.pkg.delivered}/{r.pkg.target}
                            </span>
                            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.06]">
                              <span className={`block h-full rounded-full ${r.pkg.status === 'behind' ? 'bg-rose-400' : r.pkg.status === 'done' ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                            </span>
                            {r.pkg.status === 'behind' && <span className="text-[11px] text-rose-300">atrasado</span>}
                          </div>
                        ) : (
                          <span className="tabular-nums text-neutral-400">{r.doneInMonth} entregue{r.doneInMonth === 1 ? '' : 's'} · sem pacote definido</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-neutral-300">{r.inProduction}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-neutral-300">{r.mrr ? brl(r.mrr) : '—'}</td>
                      <td className={`py-3 pl-3 text-right tabular-nums ${r.received ? 'text-emerald-300' : 'text-neutral-500'}`}>{brl(r.received)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card delay={0.45} className="p-5">
          <h2 className="text-base font-semibold text-neutral-50">Receita por cliente</h2>
          <p className="text-[11px] text-neutral-500">Recebido nos últimos 3 meses</p>
          {byClient.length === 0 ? (
            <p className="mt-5 text-sm text-neutral-500">Nenhum recebimento no período.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byClient.map((c) => (
                <li key={c.clientId}>
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="truncate text-neutral-200">{c.clientName}</span>
                    <span className="shrink-0 tabular-nums text-neutral-400">{compactBRL(c.receivedCents)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <motion.div initial={reduce ? false : { width: 0 }} animate={{ width: `${(c.receivedCents / clientMax) * 100}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full bg-amber-500" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card delay={0.5} className="p-5">
          <h2 className="text-base font-semibold text-neutral-50">Contas a receber</h2>
          <p className="text-[11px] text-neutral-500">Cobranças abertas por atraso</p>
          <ul className="mt-4 space-y-2.5">
            {aging.map((a, i) => (
              <li key={a.label} className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-3.5 py-2.5">
                <span className={`text-xs ${i === 0 ? 'text-neutral-300' : i === 1 ? 'text-amber-300' : 'text-rose-300'}`}>
                  {a.label} <span className="text-neutral-500">({a.count})</span>
                </span>
                <span className="text-sm tabular-nums text-neutral-100">{brl(a.cents)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card delay={0.55} className="p-5">
          <h2 className="text-base font-semibold text-neutral-50">Previsão</h2>
          <p className="text-[11px] text-neutral-500">Abertas + mensalidades ainda não cobradas</p>
          <ul className="mt-4 space-y-2.5">
            {fc.map((f) => (
              <li key={f.month} className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-3.5 py-2.5">
                <span className="text-xs text-neutral-300">{monthName(f.month)}</span>
                <span className="text-sm tabular-nums text-neutral-100">{brl(f.openCents + f.recurringCents)}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onNavigate('projects')} className="mt-4 flex w-full items-center justify-between rounded-2xl bg-white/[0.03] px-3.5 py-2.5 text-left hover:bg-white/[0.06]">
            <span className="flex items-center gap-2 text-xs text-neutral-300">
              <CalendarClock className="h-3.5 w-3.5" /> Projetos entregues sem faturar
            </span>
            <span className="text-sm tabular-nums text-amber-300">{brl(pipe.entregue.cents)}</span>
          </button>
        </Card>
      </div>

      <Card delay={0.6} className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-50">Projetos por etapa</h2>
          <button type="button" onClick={() => onNavigate('projects')} aria-label="Abrir projetos" className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.07] text-neutral-200 hover:bg-white/[0.12]">
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {PROJECT_STAGES.map((st) => (
            <div key={st.id} className="rounded-2xl bg-white/[0.03] p-3">
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                <span className="h-2 w-2 rounded-full" style={{ background: st.color }} /> {st.label}
              </span>
              <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-50">{pipe[st.id].count}</p>
              <p className="text-[11px] tabular-nums text-neutral-500">{compactBRL(pipe[st.id].cents)}</p>
            </div>
          ))}
        </div>
      </Card>
      {!isCurrent && <p className="text-center text-[11px] text-neutral-500">Vendo {monthName(month).toLowerCase()}. Vencidos e previsão sempre consideram a data de hoje.</p>}
    </div>
  );
};
