import React, { useEffect, useMemo, useState } from 'react';
import { Client, Alert, AccountSnapshot, Content, CalendarItem, DeliveryTask } from '../../types';
import { storageService } from '../../services/storageService';
import { summarizeTasks, upcomingTasks } from '../../services/taskInsights';
import { TasksBoard } from '../tasks/TasksBoard';
import { ScopePicker } from './ScopePicker';
import { PatternCards, WeeklyPilotModal } from '../pilot/WeeklyPilotModal';
import { computeWinningPatterns } from '../../services/winningPatterns';
import { backupStats, daysSinceBackup, downloadBackup } from '../../services/backupService';
import { notificationService } from '../../services/notificationService';
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
  UpcomingTasksPanel,
  WeekPanel,
  WeeklyViewsChart
} from './DashboardPanels';
import { AlertTriangle, HardDriveDownload, Rocket, CalendarDays, FileText, ListChecks, Plus, Database, LayoutDashboard, Users } from 'lucide-react';

interface AgencyDashboardViewProps {
  clients: Client[];
  snapshots: AccountSnapshot[];
  contents: Content[];
  calendarItems: CalendarItem[];
  alerts: Alert[];
  userName?: string;
  /** Modo demonstração: esconde tarefas gerais (reais) do painel fictício. */
  isDemo?: boolean;
  onOpenWorkspace: (client: Client) => void;
  onOpenClientTab: (client: Client, tab: WorkspaceSubTab) => void;
  onOpenNewClient: () => void;
  onEditClient: (client: Client) => void;
  onDuplicateClient: (client: Client) => void;
  onDeleteClient: (client: Client) => void;
  onOpenAlerts: () => void;
  onSeedDemoData?: () => void;
  /** Recarregar dados do App (calendário etc.) depois de mudanças feitas aqui. */
  onDataChanged?: () => void;
}

function greeting(now: Date): string {
  const h = Number(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export const AgencyDashboardView: React.FC<AgencyDashboardViewProps> = ({
  clients: allClients,
  snapshots: allSnapshots,
  contents: allContents,
  calendarItems: allCalendar,
  alerts,
  userName,
  isDemo = false,
  onOpenWorkspace,
  onOpenClientTab,
  onOpenNewClient,
  onEditClient,
  onDuplicateClient,
  onDeleteClient,
  onOpenAlerts,
  onSeedDemoData,
  onDataChanged
}) => {
  const [pilotOpen, setPilotOpen] = useState(false);
  const now = new Date();
  const readPref = (key: string, fallback: string) => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const writePref = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* preferência opcional */
    }
  };
  const [mode, setModeState] = useState<'summary' | 'tasks'>(() => (readPref('gs_dash_mode', 'summary') === 'tasks' ? 'tasks' : 'summary'));
  const [scope, setScopeState] = useState<string>(() => readPref('gs_dash_scope', 'all'));
  const setMode = (m: 'summary' | 'tasks') => {
    setModeState(m);
    writePref('gs_dash_mode', m);
  };
  const setScope = (v: string) => {
    setScopeState(v);
    writePref('gs_dash_scope', v);
  };
  const [backupDays, setBackupDays] = useState<number | null>(() => daysSinceBackup());
  const [allTasks, setAllTasks] = useState<DeliveryTask[]>(() => storageService.tasks.getAll());
  const reloadTasks = () => setAllTasks(storageService.tasks.getAll());

  // Escopo inválido (cliente excluído, troca demo/produção) volta para "todos".
  const scopeValid = scope === 'all' || (scope === 'general' && mode === 'tasks') || allClients.some((c) => c.id === scope);
  useEffect(() => {
    if (!scopeValid && scope !== 'general') setScope('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeValid, scope]);
  const effectiveScope = scopeValid ? scope : 'all';
  const selectedClient = allClients.find((c) => c.id === effectiveScope);
  const selectedPatterns = useMemo(
    () => (selectedClient ? computeWinningPatterns(allContents.filter((c) => c.clientId === selectedClient.id)) : null),
    [selectedClient, allContents]
  );

  // Resumo: todos os clientes ou só o escolhido.
  const clients = selectedClient ? [selectedClient] : allClients;
  // Só dados dos clientes visíveis (demo e produção nunca se misturam).
  const ids = useMemo(() => new Set(clients.map((c) => c.id)), [clients]);
  const allIds = useMemo(() => new Set(allClients.map((c) => c.id)), [allClients]);
  const clientsById = useMemo(() => new Map(allClients.map((c) => [c.id, c])), [allClients]);
  const visibleTasks = allTasks.filter((t) => (t.clientId ? allIds.has(t.clientId) : !isDemo));
  const scopedTasks = selectedClient ? visibleTasks.filter((t) => t.clientId === selectedClient.id) : visibleTasks;
  const taskSummary = summarizeTasks(scopedTasks, now);
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
            {allClients.length === 0
              ? 'Cadastre o primeiro cliente para começar.'
              : mode === 'tasks'
                ? taskSummary.overdue > 0
                  ? `${taskSummary.open} ${taskSummary.open === 1 ? 'entrega em aberto' : 'entregas em aberto'}, ${taskSummary.overdue} atrasada${taskSummary.overdue > 1 ? 's' : ''}.`
                  : `${taskSummary.open} ${taskSummary.open === 1 ? 'entrega em aberto' : 'entregas em aberto'}.`
                : selectedClient
                  ? `Resumo de ${selectedClient.name} nos últimos 30 dias.`
                  : 'Resumo dos seus clientes nos últimos 30 dias.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {unhandledAlerts.length > 0 && (
            <button
              onClick={onOpenAlerts}
              className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
            >
              <AlertTriangle className="h-4 w-4" />
              {unhandledAlerts.length} {unhandledAlerts.length === 1 ? 'alerta novo' : 'alertas novos'}
            </button>
          )}
          {allClients.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setPilotOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400 active:scale-[0.98]"
              >
                <Rocket className="h-4 w-4" />
                Piloto da semana
              </button>
              <ScopePicker clients={allClients} value={effectiveScope} onChange={setScope} allowGeneral={mode === 'tasks'} />
              <div className="flex rounded-full bg-[#161618] p-1" role="tablist" aria-label="Seção do painel">
                {([
                  ['summary', 'Resumo', LayoutDashboard],
                  ['tasks', 'Tarefas', ListChecks]
                ] as const).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={mode === id}
                    onClick={() => setMode(id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      mode === id ? 'bg-neutral-50 text-neutral-950' : 'text-neutral-400 hover:text-neutral-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {id === 'tasks' && taskSummary.overdue > 0 && (
                      <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white tabular-nums">{taskSummary.overdue}</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {allClients.length > 0 && !isDemo && (backupDays === null || backupDays > 7) && (
        <div className="flex flex-col gap-3 rounded-[22px] border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3 text-sm text-neutral-200">
            <HardDriveDownload className="h-5 w-5 shrink-0 text-amber-400" />
            {backupDays === null
              ? 'Você ainda não fez backup. Métricas, tarefas e planejamento ficam só neste navegador.'
              : `Último backup há ${backupDays} dias. Baixe um novo para não perder nada.`}
          </p>
          <button
            type="button"
            onClick={() => {
              const file = downloadBackup();
              setBackupDays(0);
              notificationService.showToast(`Backup baixado (${backupStats(file).total} registros).`, 'success');
            }}
            className="shrink-0 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400 active:scale-[0.98]"
          >
            Baixar backup agora
          </button>
        </div>
      )}

      {allClients.length > 0 && mode === 'tasks' && (
        <TasksBoard tasks={visibleTasks} clients={allClients} scope={effectiveScope} onChanged={reloadTasks} />
      )}

      {clients.length > 0 && mode === 'summary' && (
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

          {selectedClient && (
            <section className="rounded-[28px] border border-white/[0.04] bg-[#161618] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-50">Padrões vencedores</h3>
                  <p className="text-xs text-neutral-500">O que mais funcionou para {selectedClient.name} nos últimos 90 dias</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPilotOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-white active:scale-[0.98]"
                >
                  <Rocket className="h-4 w-4" />
                  Planejar a próxima semana
                </button>
              </div>
              {selectedPatterns && selectedPatterns.sample > 0 ? (
                <PatternCards p={selectedPatterns} compact />
              ) : (
                <p className="text-sm text-neutral-500">Importe o CSV do Meta Business Suite na aba Métricas para descobrir os padrões deste cliente.</p>
              )}
            </section>
          )}

          {/* Números grandes + formatos */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <BigNumberPair
              delay={0.2}
              left={{
                value: taskSummary.open,
                unit: taskSummary.open === 1 ? 'entrega' : 'entregas',
                icon: ListChecks,
                text:
                  taskSummary.open === 0 ? (
                    'Nenhuma tarefa em aberto.'
                  ) : (
                    <>
                      {taskSummary.overdue > 0 && <><span className="text-rose-400">{taskSummary.overdue} atrasada{taskSummary.overdue > 1 ? 's' : ''}</span>, </>}
                      <span className="text-amber-400">{taskSummary.today}</span> para hoje.
                    </>
                  )
              }}
              right={{
                value: plannedThisWeek,
                unit: plannedThisWeek === 1 ? 'post planejado' : 'posts planejados',
                icon: FileText,
                text: followers !== null ? <>Base somada de <span className="text-neutral-200">{formatMetric(followers)}</span> seguidores.</> : 'Registre os seguidores na aba Métricas.'
              }}
              onCenter={() => setMode('tasks')}
              centerLabel="Abrir minhas tarefas"
            />
            <FormatDonut rows={formats} delay={0.25} />
          </div>

          {/* Destaques + rotina */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <TopPostsPanel posts={top} clientsById={clientsById} onOpen={(c) => onOpenClientTab(c, 'content')} delay={0.3} />
            <RoutinePanel rows={freshness} onImport={(c) => onOpenClientTab(c, 'metrics')} delay={0.35} />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <UpcomingTasksPanel tasks={upcomingTasks(scopedTasks, 5, now)} clientsById={clientsById} onOpenTasks={() => setMode('tasks')} delay={0.4} />
            <WeekPanel plan={plan} today={today} clientsById={clientsById} onOpen={(c) => onOpenClientTab(c, 'calendar')} delay={0.4} />
          </div>
        </>
      )}

      {/* Clients Management Grid */}
      <div className={`space-y-4 ${mode === 'tasks' && allClients.length > 0 ? 'hidden' : ''}`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-50">
              Clientes
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-neutral-400 tabular-nums">{clients.length}</span>
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">Abra um cliente para ver métricas, conteúdo, pesquisa e planejamento.</p>
          </div>
        </div>

        {allClients.length === 0 ? (
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
      {pilotOpen && (
      <WeeklyPilotModal
        open={pilotOpen}
        onClose={() => setPilotOpen(false)}
        clients={allClients}
        initialClientId={selectedClient?.id}
        onApplied={(client, count) => {
          reloadTasks();
          onDataChanged?.();
          setScope(client.id);
          setMode('tasks');
          notificationService.showToast(`${count} ${count === 1 ? 'post planejado' : 'posts planejados'} no calendário e ${count} ${count === 1 ? 'tarefa criada' : 'tarefas criadas'} para ${client.name}.`, 'success');
        }}
      />
      )}
    </div>
  );
};
