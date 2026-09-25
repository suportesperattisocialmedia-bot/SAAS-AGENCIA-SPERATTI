import React from 'react';
import { Client, Alert, AccountSnapshot } from '../../types';
import { ClientCard } from '../clients/ClientCard';
import { StatCard } from '../common/StatCard';
import { ASSETS } from '../../data/assets';
import { avgMetric, formatMetric, isMetric, sumMetric } from '../../utils/metrics';
import {
  Users,
  Eye,
  TrendingUp,
  AlertTriangle,
  Plus,
  Sparkles,
  ShieldCheck,
  Building,
  CheckCircle2,
  Database
} from 'lucide-react';

interface AgencyDashboardViewProps {
  clients: Client[];
  snapshots: AccountSnapshot[];
  alerts: Alert[];
  onOpenWorkspace: (client: Client) => void;
  onOpenNewClient: () => void;
  onEditClient: (client: Client) => void;
  onDuplicateClient: (client: Client) => void;
  onDeleteClient: (client: Client) => void;
  onOpenAlerts: () => void;
  onSeedDemoData?: () => void;
}

export const AgencyDashboardView: React.FC<AgencyDashboardViewProps> = ({
  clients,
  snapshots,
  alerts,
  onOpenWorkspace,
  onOpenNewClient,
  onEditClient,
  onDuplicateClient,
  onDeleteClient,
  onOpenAlerts,
  onSeedDemoData
}) => {
  // Estatísticas consolidadas apenas de snapshots reais (métricas ausentes não viram zero).
  const latestByClient = new Map<string, AccountSnapshot>();
  [...snapshots]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((s) => {
      if (isMetric(s.followers)) latestByClient.set(s.clientId, s);
    });
  const totalFollowers = sumMetric([...latestByClient.values()].map((s) => s.followers));
  const totalViews = sumMetric(snapshots.map((s) => s.views));
  const totalReach = sumMetric(snapshots.map((s) => s.reach));
  const totalInteractions = sumMetric(snapshots.flatMap((s) => [s.likes, s.comments, s.shares, s.saves]));
  const engagement =
    isMetric(totalReach) && totalReach > 0 && isMetric(totalInteractions)
      ? (totalInteractions / totalReach) * 100
      : avgMetric(snapshots.map((s) => s.engagementRate), 2);
  const calculatedEngagementRate = formatMetric(engagement, { suffix: '%', digits: 1, fallback: 'Sem dados' });

  const unhandledAlerts = alerts.filter(a => a.status === 'NEW');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Editorial Agency Ambient Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        <div className="absolute inset-0 z-0 opacity-20">
          <img
            src={ASSETS.agencyHero}
            alt="Gabriel Speratti Intelligence Agency"
            className="w-full h-full object-cover grayscale contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/90 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-50 tracking-tight">Visão geral da agência</h1>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-[60ch]">
              Acompanhe clientes, conexões com o Instagram e alertas. Todos os números vêm de dados sincronizados ou registrados pela equipe.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {unhandledAlerts.length > 0 && (
              <button
                onClick={onOpenAlerts}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium hover:bg-rose-500/20 transition-all"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{unhandledAlerts.length} Alerta(s) Ativo(s)</span>
              </button>
            )}

            <button
              onClick={onOpenNewClient}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Global Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Clientes ativos"
          value={clients.length}
          typeTag="DADO REAL"
          subtext="Contas em operação ativa"
          icon={<Users className="w-4 h-4 text-amber-400" />}
        />

        <StatCard
          label="Seguidores monitorados"
          value={formatMetric(totalFollowers, { fallback: 'Sem dados' })}
          typeTag="DADO REAL"
          subtext="Base combinada da agência"
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
        />

        <StatCard
          label="Visualizações registradas"
          value={formatMetric(totalViews, { fallback: 'Sem dados' })}
          typeTag="DADO REAL"
          subtext="Histórico consolidado catalogado"
          icon={<Eye className="w-4 h-4 text-sky-400" />}
        />

        <StatCard
          label="Engajamento médio"
          value={calculatedEngagementRate}
          typeTag="DADO CALCULADO"
          subtext={isMetric(totalReach) && totalReach > 0 ? 'Ponderada por alcance real' : 'Sem alcance para ponderação'}
          icon={<Sparkles className="w-4 h-4 text-purple-400" />}
        />
      </div>

      {/* Clients Management Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <span>Workspaces dos Clientes</span>
              <span className="text-xs font-mono text-neutral-400">({clients.length})</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Abra um cliente para ver métricas, conteúdo, pesquisa e planejamento.
            </p>
          </div>

          <button
            onClick={onOpenNewClient}
            className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Cliente</span>
          </button>
        </div>

        {clients.length === 0 ? (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 sm:p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-neutral-100">
                Nenhum cliente cadastrado ainda
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Cadastre o perfil, o nicho e os objetivos do cliente. Depois conecte o Instagram para começar a coletar métricas reais.
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {clients.map(client => {
              const latestSnap = snapshots
                .filter((s) => s.clientId === client.id)
                .sort((a, b) => a.date.localeCompare(b.date))
                .at(-1);

              return (
                <ClientCard
                  key={client.id}
                  client={client}
                  latestSnapshot={latestSnap}
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
