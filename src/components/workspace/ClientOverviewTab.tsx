import React from 'react';
import { Client, Content, MetricSnapshot, Alert } from '../../types';
import { StatCard } from '../common/StatCard';
import { ChartArea } from '../common/ChartArea';
import { analyticsService } from '../../services/analyticsService';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Eye,
  Bookmark,
  Share2,
  CheckCircle2
} from 'lucide-react';
import { formatMetric } from '../../utils/metrics';

interface ClientOverviewTabProps {
  client: Client;
  snapshots: MetricSnapshot[];
  contents: Content[];
  alerts: Alert[];
  onNavigateTab: (tab: any) => void;
  nextActions: string[];
}

export const ClientOverviewTab: React.FC<ClientOverviewTabProps> = ({
  client,
  snapshots,
  contents,
  alerts,
  onNavigateTab,
  nextActions
}) => {
  const periodSummary = analyticsService.calculatePeriod(snapshots, 30);
  const sortedContents = analyticsService.rankContents(contents, 'views', false);
  const topContent = sortedContents[0];

  // Chart data points
  const chartData = snapshots.map(s => ({
    date: s.date,
    label: s.date.split('-').slice(1).reverse().join('/'),
    value: s.followers
  }));

  const unhandledAlerts = alerts.filter(a => a.status === 'NEW');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Alert Banner if any critical alert exists */}
      {unhandledAlerts.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-300 uppercase font-mono">
                {unhandledAlerts.length} Alerta(s) da Operação
              </h4>
              <p className="text-xs text-neutral-300 mt-0.5">
                {unhandledAlerts[0].title}: {unhandledAlerts[0].message}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('performance')}
            className="text-xs text-amber-400 hover:text-amber-300 font-mono font-medium shrink-0"
          >
            Ver Detalhes →
          </button>
        </div>
      )}

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Seguidores Atuais"
          value={formatMetric(periodSummary.followersGrowth.current)}
          typeTag="DADO REAL"
          diffPercent={periodSummary.followersGrowth.percentDiff ?? undefined}
          periodLabel="Últimos 30 dias"
        />

        <StatCard
          label="Visualizações Totais"
          value={formatMetric(periodSummary.totalViews.current)}
          typeTag="DADO REAL"
          diffPercent={periodSummary.totalViews.percentDiff ?? undefined}
          periodLabel="Últimos 30 dias"
        />

        <StatCard
          label="Taxa Média de Engajamento"
          value={formatMetric(periodSummary.avgEngagementRate.current, { suffix: '%' })}
          typeTag="DADO CALCULADO"
          diffPercent={periodSummary.avgEngagementRate.percentDiff ?? undefined}
          periodLabel="Base: Alcance real"
        />

        <StatCard
          label="Conteúdos no Período"
          value={contents.length}
          typeTag="DADO REAL"
          subtext="Cadência regular"
          periodLabel="Feed & Reels"
        />
      </div>

      {/* Evolution Chart & Top Content Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartArea
            data={chartData}
            title="Crescimento Histórico de Seguidores"
            subtitle="Snapshots diários consolidados sem sobrescrita de dados"
            primaryLabel="Seguidores Reais"
            valueFormatter={(val) => `${val.toLocaleString('pt-BR')} seg.`}
            height={240}
            lineColor="#f59e0b"
          />
        </div>

        {/* Top Performer Card */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-mono uppercase text-amber-400 font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Melhor Conteúdo Recente
              </span>
              {topContent && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {topContent.format}
                </span>
              )}
            </div>

            {topContent ? (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-neutral-100 line-clamp-2">
                  {topContent.title}
                </h4>

                <div className="p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800 text-xs">
                  <div className="text-[10px] font-mono text-neutral-500 uppercase mb-1">
                    Gancho Estratégico
                  </div>
                  <p className="text-neutral-300 italic">
                    &quot;{topContent.hook}&quot;
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                  <div className="p-2 bg-neutral-950/40 rounded border border-neutral-800/60">
                    <div className="text-[10px] text-neutral-500 flex items-center justify-center gap-1">
                      <Eye className="w-3 h-3" /> Views
                    </div>
                    <div className="text-xs font-bold text-neutral-200 mt-0.5">
                      {formatMetric(topContent.metrics.views)}
                    </div>
                  </div>

                  <div className="p-2 bg-neutral-950/40 rounded border border-neutral-800/60">
                    <div className="text-[10px] text-neutral-500 flex items-center justify-center gap-1">
                      <Bookmark className="w-3 h-3" /> Salvos
                    </div>
                    <div className="text-xs font-bold text-neutral-200 mt-0.5">
                      {formatMetric(topContent.metrics.saves)}
                    </div>
                  </div>

                  <div className="p-2 bg-neutral-950/40 rounded border border-neutral-800/60">
                    <div className="text-[10px] text-neutral-500 flex items-center justify-center gap-1">
                      <Share2 className="w-3 h-3" /> Shares
                    </div>
                    <div className="text-xs font-bold text-neutral-200 mt-0.5">
                      {formatMetric(topContent.metrics.shares)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-500 py-6 text-center">
                Nenhum conteúdo analisado ainda.
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('content')}
            className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs font-medium text-amber-400 hover:text-amber-300"
          >
            <span>Ver todos os conteúdos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Strategic AI Next Actions Section */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                Próximas Ações Estratégicas
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-purple-500/30 text-purple-400 bg-purple-950/20">
                  INSIGHT DA IA
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Passos concretos priorizados com base na performance real e no comportamento da persona
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('diagnostic')}
            className="text-xs font-mono text-neutral-400 hover:text-neutral-200 flex items-center gap-1 hidden sm:flex"
          >
            Ver Diagnóstico Completo →
          </button>
        </div>

        <div className="space-y-2.5">
          {nextActions.map((action, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg bg-neutral-950/60 border border-neutral-800/80 text-xs text-neutral-200"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px] font-mono font-bold text-amber-400 shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 font-medium leading-relaxed">
                {action}
              </div>
              <CheckCircle2 className="w-4 h-4 text-neutral-600 hover:text-emerald-400 cursor-pointer transition-colors shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
