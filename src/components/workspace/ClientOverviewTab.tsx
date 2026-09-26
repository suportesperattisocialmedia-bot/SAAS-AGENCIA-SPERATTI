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
  /** true quando as ações vêm do último diagnóstico importado (IA externa). */
  actionsFromAi?: boolean;
}

export const ClientOverviewTab: React.FC<ClientOverviewTabProps> = ({
  snapshots,
  contents,
  alerts,
  onNavigateTab,
  nextActions,
  actionsFromAi = false
}) => {
  const periodSummary = analyticsService.calculatePeriod(snapshots, 30, undefined, contents);
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
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                {unhandledAlerts.length} Alerta(s) da Operação
              </h4>
              <p className="text-xs text-neutral-300 mt-0.5">
                {unhandledAlerts[0].title}: {unhandledAlerts[0].message}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('performance')}
            className="text-xs text-amber-400 hover:text-amber-300 tabular-nums font-medium shrink-0"
          >
            Ver Detalhes →
          </button>
        </div>
      )}

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          value={periodSummary.postsPublished.current ?? 0}
          typeTag="DADO REAL"
          subtext="Últimos 30 dias"
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
        <div className="bg-[#161618] border border-white/[0.06] rounded-[24px] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-sm text-amber-400 font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Melhor Conteúdo Recente
              </span>
              {topContent && (
                <span className="text-[10px] tabular-nums px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 border border-white/[0.1]">
                  {topContent.format}
                </span>
              )}
            </div>

            {topContent ? (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-neutral-100 line-clamp-2">
                  {topContent.title}
                </h4>

                <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs">
                  <div className="text-[11px] text-neutral-500 mb-1">
                    Gancho Estratégico
                  </div>
                  <p className="text-neutral-300 italic">
                    &quot;{topContent.hook}&quot;
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 tabular-nums">
                  <div className="p-2 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
                    <div className="text-[10px] text-neutral-500 flex items-center justify-center gap-1">
                      <Eye className="w-3 h-3" /> Views
                    </div>
                    <div className="text-xs font-bold text-neutral-200 mt-0.5">
                      {formatMetric(topContent.metrics.views)}
                    </div>
                  </div>

                  <div className="p-2 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
                    <div className="text-[10px] text-neutral-500 flex items-center justify-center gap-1">
                      <Bookmark className="w-3 h-3" /> Salvos
                    </div>
                    <div className="text-xs font-bold text-neutral-200 mt-0.5">
                      {formatMetric(topContent.metrics.saves)}
                    </div>
                  </div>

                  <div className="p-2 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
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
            className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-medium text-amber-400 hover:text-amber-300"
          >
            <span>Ver todos os conteúdos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Strategic AI Next Actions Section */}
      <div className="bg-[#161618] border border-white/[0.06] rounded-[24px] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                Próximas Ações Estratégicas
                {actionsFromAi ? (
                  <span className="text-[10px] tabular-nums px-2 py-0.5 rounded-full border border-purple-500/30 text-purple-400 bg-purple-950/20">
                    DO DIAGNÓSTICO
                  </span>
                ) : (
                  <span className="text-[10px] tabular-nums px-2 py-0.5 rounded-full border border-white/[0.1] text-neutral-400 bg-[#161618]">
                    CHECKLIST
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {actionsFromAi
                  ? 'Ações recomendadas no último diagnóstico importado.'
                  : 'Próximos passos com base no que já foi cadastrado. Gere a análise completa para ações personalizadas.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('diagnostic')}
            className="text-xs tabular-nums text-neutral-400 hover:text-neutral-200 flex items-center gap-1 hidden sm:flex"
          >
            Ver Diagnóstico Completo →
          </button>
        </div>

        <div className="space-y-2.5">
          {nextActions.map((action, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-neutral-200"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px] tabular-nums font-bold text-amber-400 shrink-0 mt-0.5">
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
