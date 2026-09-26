import React, { useState } from 'react';
import { Client, Content, AccountSnapshot, ContentFormat } from '../../types';
import { analyticsService } from '../../services/analyticsService';
import { StatCard } from '../common/StatCard';
import { ChartArea } from '../common/ChartArea';
import { ChartBar } from '../common/ChartBar';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Bookmark,
  Share2,
  Calendar,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';
import { formatMetric } from '../../utils/metrics';

interface PerformanceTabProps {
  client: Client;
  contents: Content[];
  snapshots: AccountSnapshot[];
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({
  client,
  contents,
  snapshots
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30 | 90 | 'custom'>(30);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedSortMetric, setSelectedSortMetric] = useState<'score' | 'views' | 'reach' | 'saves' | 'engagement'>('score');

  const customRange = selectedPeriod === 'custom' && customStartDate && customEndDate
    ? { startDate: customStartDate, endDate: customEndDate }
    : undefined;

  const periodData = analyticsService.calculatePeriod(snapshots, selectedPeriod, customRange, contents);

  const bestContents = analyticsService.rankContents(contents, selectedSortMetric, false).slice(0, 5);
  const underperformingContents = analyticsService.rankContents(contents, selectedSortMetric, true).slice(0, 3);
  const formatStats = analyticsService.breakdownByFormat(contents);

  // Filter snapshots strictly by date for the area chart
  const chartSnapshots = analyticsService.filterSnapshotsByDate(
    snapshots,
    periodData.startDate,
    periodData.endDate
  );

  const chartData = chartSnapshots.map(s => ({
    date: s.date,
    label: s.date.split('-').slice(1).reverse().join('/'),
    value: s.views
  }));

  const formatBarData = (Object.keys(formatStats) as ContentFormat[])
    .filter(fmt => formatStats[fmt].count > 0)
    .map(fmt => ({
      label: fmt,
      value: formatStats[fmt].avgViews,
      sublabel: `${formatStats[fmt].count} posts · eng ${formatStats[fmt].avgEngagement}%`
    }));

  const renderComparison = (comparison: typeof periodData.totalViews) => {
    if (!comparison.hasSufficientData || comparison.previous === null) {
      return (
        <span className="text-[11px] text-neutral-500 font-mono">
          Sem base comparativa suficiente
        </span>
      );
    }

    const isPos = (comparison.percentDiff ?? 0) >= 0;
    const diffIcon = isPos ? (
      <ArrowUpRight className="w-3 h-3 text-emerald-400" />
    ) : (
      <ArrowDownRight className="w-3 h-3 text-rose-400" />
    );

    return (
      <div className="flex items-center gap-1.5 text-[11px] font-mono">
        {diffIcon}
        <span className={isPos ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
          {isPos ? '+' : ''}{comparison.percentDiff}%
        </span>
        <span className="text-neutral-500">
          ({isPos ? '+' : ''}{comparison.absoluteDiff?.toLocaleString('pt-BR')} vs anterior)
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Strict Calendar Period Selector */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Análise de Performance & Métricas Rigorosas</span>
            </h2>
            <ProvenanceBadge type="CALCULATED_DATA" />
          </div>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            Período ativo: <span className="font-mono text-neutral-200">{periodData.startDate}</span> até <span className="font-mono text-neutral-200">{periodData.endDate}</span> ({periodData.periodDays} dias)
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-2 font-mono">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-1 text-xs">
            {([7, 14, 30, 90] as const).map(days => (
              <button
                key={days}
                onClick={() => setSelectedPeriod(days)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  selectedPeriod === days
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {days} dias
              </button>
            ))}
            <button
              onClick={() => setSelectedPeriod('custom')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                selectedPeriod === 'custom'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Personalizado
            </button>
          </div>

          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-2 py-1 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-transparent text-neutral-200 focus:outline-hidden"
              />
              <span className="text-neutral-500">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-transparent text-neutral-200 focus:outline-hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Followers */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
          <span className="text-[10px] font-mono uppercase text-neutral-500">Seguidores (Final)</span>
          <div className="text-2xl font-bold text-neutral-100 font-mono">
            {formatMetric(periodData.followersGrowth.current)}
          </div>
          {renderComparison(periodData.followersGrowth)}
        </div>

        {/* Views */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
          <span className="text-[10px] font-mono uppercase text-neutral-500">Visualizações (Total)</span>
          <div className="text-2xl font-bold text-neutral-100 font-mono">
            {formatMetric(periodData.totalViews.current)}
          </div>
          {renderComparison(periodData.totalViews)}
        </div>

        {/* Reach */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
          <span className="text-[10px] font-mono uppercase text-neutral-500">Alcance (Total)</span>
          <div className="text-2xl font-bold text-neutral-100 font-mono">
            {formatMetric(periodData.totalReach.current)}
          </div>
          {renderComparison(periodData.totalReach)}
        </div>

        {/* Engagement Rate */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2">
          <span className="text-[10px] font-mono uppercase text-neutral-500">Taxa de Engajamento (Média)</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {formatMetric(periodData.avgEngagementRate.current, { suffix: '%' })}
          </div>
          {renderComparison(periodData.avgEngagementRate)}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Views Trajectory */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-200">
                Evolução Cronológica de Visualizações
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Filtrado estritamente por intervalo de datas do calendário
              </p>
            </div>
            <ProvenanceBadge type="REAL_DATA" />
          </div>

          {chartData.length > 0 ? (
            <ChartArea
              data={chartData}
              height={220}
              lineColor="#f59e0b"
            />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-neutral-500 font-mono">
              Nenhum snapshot diário registrado para este período.
            </div>
          )}
        </div>

        {/* Format Performance */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-200">
                Performance por Formato
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Média de visualizações por tipo de mídia
              </p>
            </div>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>

          {formatBarData.length > 0 ? (
            <ChartBar
              data={formatBarData}
              height={220}
            />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-neutral-500 font-mono">
              Nenhum conteúdo catalogado ainda.
            </div>
          )}
        </div>
      </div>

      {/* Content Ranking Sections */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Ranqueamento de Publicações</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Identificação matemática de conteúdos com maior tração e pontos de ajuste
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-neutral-500">Ordenar por:</span>
            <select
              value={selectedSortMetric}
              onChange={e => setSelectedSortMetric(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-neutral-200 focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="score">Score Estratégico (Ponderado)</option>
              <option value="views">Visualizações</option>
              <option value="reach">Alcance</option>
              <option value="saves">Salvamentos</option>
              <option value="engagement">Engajamento %</option>
            </select>
          </div>
        </div>

        {/* Best Performing Grid */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase text-amber-400 tracking-wider font-semibold">
            Top 5 Conteúdos de Maior Impacto
          </div>
          {bestContents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bestContents.map(c => {
                const score = analyticsService.calculateContentScore(c);
                return (
                  <div
                    key={c.id}
                    className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-amber-400">
                        {c.format}
                      </span>
                      <span className="text-neutral-400">Score: {score}</span>
                    </div>

                    <h4 className="text-xs font-semibold text-neutral-100 line-clamp-2">
                      {c.title}
                    </h4>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800 text-center font-mono">
                      <div className="bg-neutral-950 p-1.5 rounded-lg">
                        <span className="text-[10px] text-neutral-500 block">Views</span>
                        <span className="text-xs text-neutral-200">{formatMetric(c.metrics.views)}</span>
                      </div>
                      <div className="bg-neutral-950 p-1.5 rounded-lg">
                        <span className="text-[10px] text-neutral-500 block">Saves</span>
                        <span className="text-xs text-purple-400 font-bold">{c.metrics.saves}</span>
                      </div>
                      <div className="bg-neutral-950 p-1.5 rounded-lg">
                        <span className="text-[10px] text-neutral-500 block">Engajamento</span>
                        <span className="text-xs text-emerald-400">{formatMetric(c.metrics.engagementRate, { suffix: '%' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 bg-neutral-900/40 border border-neutral-800 rounded-xl text-center text-xs text-neutral-400 font-mono">
              Nenhum conteúdo cadastrado para avaliação.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
