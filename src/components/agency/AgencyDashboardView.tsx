import React from 'react';
import { Client, Alert, AccountSnapshot } from '../../types';
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
  // Consolidated statistics derived strictly from real snapshots
  const totalFollowers = snapshots
    .filter((s, idx, arr) => {
      const clientSnaps = arr.filter(cs => cs.clientId === s.clientId);
      return s.id === clientSnaps[clientSnaps.length - 1]?.id;
    })
    .reduce((sum, s) => sum + s.followers, 0);

  // Total views from available snapshots
  const totalViews = snapshots.reduce((sum, s) => sum + s.views, 0);

  // Real weighted engagement rate calculation (Interactions / Reach)
  const totalReach = snapshots.reduce((sum, s) => sum + s.reach, 0);
  const totalInteractions = snapshots.reduce(
    (sum, s) => sum + (s.likes + s.comments + s.shares + s.saves),
    0
  );

  let calculatedEngagementRate = '0.0%';
  if (totalReach > 0) {
    calculatedEngagementRate = `${((totalInteractions / totalReach) * 100).toFixed(1)}%`;
  } else if (snapshots.length > 0) {
    const avgEng = snapshots.reduce((sum, s) => sum + s.engagementRate, 0) / snapshots.length;
    calculatedEngagementRate = `${avgEng.toFixed(1)}%`;
  }

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
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>GABRIEL SPERATTI · SOCIAL INTELLIGENCE SYSTEM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-100 tracking-tight font-serif">
              Painel de Gestão Estratégica & Inteligência Competitiva
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
              Sistema interno para auditoria de posicionamento, governança de dados da Meta Graph API, benchmark analítico e arquitetura de autoridade de clientes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {unhandledAlerts.length > 0 && (
              <button
                onClick={onOpenAlerts}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium hover:bg-rose-500/20 transition-all font-mono"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>{unhandledAlerts.length} Alerta(s) Ativo(s)</span>
              </button>
            )}

            <button
              onClick={onOpenNewClient}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold font-mono transition-all shadow-lg shadow-amber-500/10"
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
          label="Visualizações Totais"
          value={totalViews > 0 ? totalViews.toLocaleString('pt-BR') : '0'}
          typeTag="DADO REAL"
          subtext="Histórico consolidado catalogado"
          icon={<Eye className="w-4 h-4 text-sky-400" />}
        />

        <StatCard
          label="Taxa Média de Engajamento"
          value={calculatedEngagementRate}
          typeTag="DADO CALCULADO"
          subtext={totalReach > 0 ? 'Ponderada por alcance real' : 'Sem alcance para ponderação'}
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
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-bold transition-all shadow-md font-mono"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Cadastrar Primeiro Cliente</span>
              </button>
              {onSeedDemoData && (
                <button
                  onClick={onSeedDemoData}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl text-xs font-semibold transition-all font-mono"
                >
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>Explorar com Dados de Demonstração</span>
                </button>
              )}
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
