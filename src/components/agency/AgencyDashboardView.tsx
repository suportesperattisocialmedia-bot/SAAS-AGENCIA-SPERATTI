import React, { useMemo } from 'react';
import { Client, Alert, AccountSnapshot, Content, CalendarItem } from '../../types';
import type { WorkspaceSubTab } from '../workspace/WorkspaceHeader';
import { analyticsService } from '../../services/analyticsService';
import {
  clientFreshness,
  formatBreakdown,
  percentChange,
  topPosts,
  weekDayOf,
  weekPlan,
  weeklyViews
} from '../../services/dashboardInsights';
import { ClientCard } from '../clients/ClientCard';
import { formatMetric, isMetric, sumMetric } from '../../utils/metrics';
import {
  BigNumberPair,
  FormatDonut,
  KPI_ICONS,
  KpiCard,
  RoutinePanel,
  TopPostsPanel,
  WeekPanel,
  WeeklyViewsChart
} from './DashboardPanels';
import { AlertTriangle, CalendarDays, FileText, Plus, Users, Database } from 'lucide-react';

interface AgencyDashboardViewProps {
  clients: Client[];
  snapshots: AccountSnapshot[];
  contents: Content[];
  calendarItems: CalendarItem[];
  alerts: Alert[];
  userName?: string;
  onOpenWorkspace: (client: Client) => void;
  onOpenClientTab: (client: Client, tab: WorkspaceSubTab) => void;
  onOpenNewClient: () => void;
  onEditClient: (client: Client) => void;
  onDuplicateClient: (client: Client) => void;
  onDeleteClient: (client: Client) => void;
  onOpenAlerts: () => void;
  onSeedDemoData?: () => void;
}

function greeting(now: Date): string {
  const h = Number(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export const AgencyDashboardView: React.FC<AgencyDashboardViewProps> = ({
  clients,
  snapshots: allSnapshots,
  contents: allContents,
  calendarItems: allCalendar,
  alerts,
  userName,
  onOpenWorkspace,
  onOpenClientTab,
  onOpenNewClient,
  onEditClient,
  onDuplicateClient,
  onDeleteClient,
  onOpenAlerts,
  onSeedDemoData
}) => {
  const now = new Date();
  // Só dados dos clientes visíveis (demo e produção nunca se misturam).
  const ids = useMemo(() => new Set(clients.map((c) => c.id)), [clients]);
  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const snapshots = allSnapshots.filter((s) => ids.has(s.clientId));
  const contents = allContents.filter((c) => ids.has(c.clientId));
  const calendar = allCalendar.filter((c) => ids.has(c.clientId));

  // KPIs: mesmo cálculo do workspace (snapshots da conta ou soma dos posts importados).
  const periods = clients.map((c) =>
    analyticsService.calculatePeriod(
      snapshots.filter((s) => s.clientId === c.id),
      30,
      undefined,
      contents.filter((ct) => ct.clientId === c.id)
    )
  );
  const sumOf = (pick: (p: (typeof periods)[number]) => number | null) => sumMetric(periods.map(pick));
  const views = sumOf((p) => p.totalViews.current);
  const viewsPrev = sumOf((p) => p.totalViews.previous);
  const reach = sumOf((p) => p.totalReach.current);
  const reachPrev = sumOf((p) => p.totalReach.previous);
  const posts = sumOf((p) => p.postsPublished.current) ?? 0;
  const postsPrev = sumOf((p) => p.postsPublished.previous);
  const followers = sumOf((p) => p.followersGrowth.current);
  const weightedEngagement = (key: 'current' | 'previous') => {
    const list = periods.filter((p) => isMetric(p.avgEngagementRate[key]) && isMetric(p.totalReach[key]) && (p.totalReach[key] ?? 0) > 0);
    const base = list.reduce((acc, p) => acc + (p.totalReach[key] ?? 0), 0);
    return base > 0 ? list.reduce((acc, p) => acc + (p.avgEngagementRate[key] ?? 0) * (p.totalReach[key] ?? 0), 0) / base : null;
  };
  const engagement = weightedEngagement('current');
  const engagementPrev = weightedEngagement('previous');

  const weeks = weeklyViews(contents, 8, now);
  const formats = formatBreakdown(contents, 30, now);
  const top = topPosts(contents, 5, 30, now);
  const freshness = clientFreshness(clients, contents, snapshots, now);
  const plan = weekPlan(calendar);
  const today = weekDayOf(now);
  const pending = freshness.filter((f) => f.status !== 'ok');
  const unhandledAlerts = alerts.filter((a) => a.status === 'NEW');
  const firstName = userName?.trim().split(/\s+/)[0];
  const dateLabel = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' });
  const plannedThisWeek = plan.reduce((acc, d) => acc + d.items.length, 0);
  const firstForPerformance = clients.find((c) => contents.some((ct) => ct.clientId === c.id)) ?? clients[0];

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 text-xs text-neutral-400">
            <CalendarDays className="h-3.5 w-3.5" />
            Hoje, {dateLabel}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">
            {greeting(now)}{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="text-sm text-neutral-400">
            {clients.length === 0
              ? 'Cadastre o primeiro cliente para começar.'
              : 'Resumo dos seus clientes nos últimos 30 dias.'}
          </p>
        </div>
        {unhandledAlerts.length > 0 && (
          <button
            onClick={onOpenAlerts}
            className="inline-flex items-center gap-2 self-start rounded-full bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20 sm:self-auto"
          >
            <AlertTriangle className="h-4 w-4" />
            {unhandledAlerts.length} {unhandledAlerts.length === 1 ? 'alerta novo' : 'alertas novos'}
          </button>
        )}
      </div>

      {clients.length > 0 && (
        <>
          {/* KPIs + visualizações semanais */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
              <KpiCard
                highlight
                label="Visualizações"
                value={formatMetric(views, { fallback: 'Sem dados' })}
                delta={percentChange(views, viewsPrev)}
                icon={KPI_ICONS.views}
              />
              <KpiCard
                label="Alcance"
                value={formatMetric(reach, { fallback: 'Sem dados' })}
                delta={percentChange(reach, reachPrev)}
                icon={KPI_ICONS.reach}
                delay={0.05}
              />
              <KpiCard
                label="Engajamento"
                value={formatMetric(engagement, { suffix: '%', digits: 1, fallback: 'Sem dados' })}
                delta={percentChange(engagement, engagementPrev)}
                icon={KPI_ICONS.engagement}
                delay={0.1}
              />
              <KpiCard
                label="Publicações"
                value={String(posts)}
                delta={percentChange(posts, postsPrev)}
                icon={KPI_ICONS.posts}
                delay={0.15}
              />
            </div>
            <WeeklyViewsChart
              weeks={weeks}
              delay={0.1}
              onOpen={firstForPerformance ? () => onOpenClientTab(firstForPerformance, 'performance') : undefined}
            />
          </div>

          {/* Números grandes + formatos */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <BigNumberPair
              delay={0.2}
              left={{
                value: clients.length,
                unit: clients.length === 1 ? 'cliente' : 'clientes',
                icon: Users,
                text:
                  pending.length === 0 ? (
                    'Todos com métricas da última semana.'
                  ) : (
                    <>
                      <span className="text-amber-400">{pending.length}</span> {pending.length === 1 ? 'aguardando' : 'aguardando'} atualização de métricas.
                    </>
                  )
              }}
              right={{
                value: plannedThisWeek,
                unit: plannedThisWeek === 1 ? 'post planejado' : 'posts planejados',
                icon: FileText,
                text: followers !== null ? <>Base somada de <span className="text-neutral-200">{formatMetric(followers)}</span> seguidores.</> : 'Registre os seguidores na aba Métricas.'
              }}
              onCenter={() => pending[0] ? onOpenClientTab(pending[0].client, 'metrics') : onOpenClientTab(clients[0], 'calendar')}
              centerLabel={pending[0] ? `Atualizar métricas de ${pending[0].client.name}` : 'Abrir calendário'}
            />
            <FormatDonut rows={formats} delay={0.25} />
          </div>

          {/* Destaques + rotina */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <TopPostsPanel posts={top} clientsById={clientsById} onOpen={(c) => onOpenClientTab(c, 'content')} delay={0.3} />
            <RoutinePanel rows={freshness} onImport={(c) => onOpenClientTab(c, 'metrics')} delay={0.35} />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <WeekPanel plan={plan} today={today} clientsById={clientsById} onOpen={(c) => onOpenClientTab(c, 'calendar')} delay={0.4} />
          </div>
        </>
      )}

      {/* Clients Management Grid */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-50">
              Clientes
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-neutral-400 tabular-nums">{clients.length}</span>
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">Abra um cliente para ver métricas, conteúdo, pesquisa e planejamento.</p>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="rounded-[28px] bg-[#161618] border border-white/[0.04] p-8 sm:p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-neutral-100">
                Nenhum cliente cadastrado ainda
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Cadastre o perfil, o nicho e os objetivos do cliente. Depois importe as métricas do Meta Business Suite na aba Métricas.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onOpenNewClient}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Cadastrar primeiro cliente</span>
              </button>
              {onSeedDemoData && (
                <button
                  onClick={onSeedDemoData}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-semibold transition-all"
                >
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>Ver demonstração</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {clients.map((client, idx) => {
              const latestSnap = snapshots
                .filter((s) => s.clientId === client.id)
                .sort((a, b) => a.date.localeCompare(b.date))
                .at(-1);

              return (
                <ClientCard
                  key={client.id}
                  client={client}
                  latestSnapshot={latestSnap}
                  period30={{ views: periods[idx].totalViews.current, engagementRate: periods[idx].avgEngagementRate.current }}
                  onOpenWorkspace={onOpenWorkspace}
                  onEdit={onEditClient}
                  onDuplicate={onDuplicateClient}
                  onDelete={onDeleteClient}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
