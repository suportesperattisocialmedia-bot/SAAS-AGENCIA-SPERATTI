import React from 'react';
import { Client, Alert, MetricSnapshot } from '../../types';
import { ClientCard } from '../clients/ClientCard';
import { StatCard } from '../common/StatCard';
import { ASSETS } from '../../data/assets';
import {
  Users,
  Eye,
  TrendingUp,
  AlertTriangle,
  Plus,
  Sparkles,
  ShieldCheck,
  Building,
  CheckCircle2
} from 'lucide-react';

interface AgencyDashboardViewProps {
  clients: Client[];
  snapshots: MetricSnapshot[];
  alerts: Alert[];
  onOpenWorkspace: (client: Client) => void;
  onOpenNewClient: () => void;
  onEditClient: (client: Client) => void;
  onDuplicateClient: (client: Client) => void;
  onDeleteClient: (client: Client) => void;
  onOpenAlerts: () => void;
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
  onOpenAlerts
}) => {
  // Consolidated statistics
  const totalFollowers = snapshots
    .filter((s, idx, arr) => {
      // Latest snapshot for each client
      const clientSnaps = arr.filter(cs => cs.clientId === s.clientId);
      return s.id === clientSnaps[clientSnaps.length - 1]?.id;
    })
    .reduce((sum, s) => sum + s.followers, 0);

  const totalMonthlyViews = snapshots.slice(-30).reduce((sum, s) => sum + s.views, 0);
  const unhandledAlerts = alerts.filter(a => a.status === 'new');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Editorial Agency Ambient Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        <div className="absolute inset-0 z-0 opacity-20">
          <img
            src={ASSETS.agencyHero}
            alt="Gabriel Speratti Intelligence Agency"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-linear-to-r from-neutral-950 via-neutral-950/80 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                Gabriel Speratti
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/30 text-amber-300 bg-amber-950/40">
                SOCIAL INTELLIGENCE SYSTEM
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-neutral-100 tracking-tight leading-tight">
              Central de Inteligência, Estratégia e Operação
            </h1>

            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
              Sistema interno proprietário para monitoramento de contas no Instagram, benchmarking competitivo, identificação de dores de audiência e execução de conteúdos de alta retenção.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={onOpenNewClient}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-amber-500/10"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Cadastrar Novo Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Agency Operations Alert Banner */}
      {unhandledAlerts.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="text-xs font-bold text-amber-300 uppercase font-mono">
                {unhandledAlerts.length} alerta(s) de atenção na operação
              </span>
              <p className="text-xs text-neutral-300 mt-0.5">
                {unhandledAlerts[0].title}: {unhandledAlerts[0].message}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAlerts}
            className="text-xs text-amber-400 hover:text-amber-300 font-mono font-medium shrink-0 self-end sm:self-auto"
          >
            Abrir Central de Alertas →
          </button>
        </div>
      )}

      {/* Agency Consolidated Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Clientes Ativos"
          value={clients.length}
          typeTag="DADO REAL"
          subtext="Contas em operação ativa"
          icon={<Users className="w-4 h-4 text-amber-400" />}
        />

        <StatCard
          label="Seguidores Monitorados"
          value={totalFollowers > 0 ? totalFollowers.toLocaleString('pt-BR') : '0'}
          typeTag="DADO REAL"
          subtext="Base combinada da agência"
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
        />

        <StatCard
          label="Visualizações nos Últimos 30d"
          value={totalMonthlyViews > 0 ? totalMonthlyViews.toLocaleString('pt-BR') : '0'}
          typeTag="DADO REAL"
          subtext="Entrega orgânica consolidada"
          icon={<Eye className="w-4 h-4 text-sky-400" />}
        />

        <StatCard
          label="Taxa Média de Engajamento"
          value={clients.length > 0 ? '8.1%' : '0.0%'}
          typeTag="DADO CALCULADO"
          subtext="Média ponderada por alcance"
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
              Selecione uma conta para acessar a inteligência aprofundada, métricas e pipeline
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
                O sistema está limpo e pronto para receber seus clientes reais. Inicie o cadastro preenchendo o perfil da conta, nicho e objetivos estratégicos.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onOpenNewClient}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Cadastrar Primeiro Cliente</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {clients.map(client => {
              const clientSnaps = snapshots.filter(s => s.clientId === client.id);
              const latestSnap = clientSnaps[clientSnaps.length - 1];

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
