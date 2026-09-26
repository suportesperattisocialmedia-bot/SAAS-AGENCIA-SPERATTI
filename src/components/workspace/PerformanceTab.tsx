import React, { useState } from 'react';
import { Client, Content, AccountSnapshot, ContentFormat } from '../../types';
import { analyticsService } from '../../services/analyticsService';
import { ChartArea } from '../common/ChartArea';
import { ChartBar } from '../common/ChartBar';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { engagementFrom, formatMetric } from '../../utils/metrics';
import { brasiliaDay } from '../../services/dashboardInsights';

interface PerformanceTabProps {
  client: Client;
  contents: Content[];
  snapshots: AccountSnapshot[];
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({
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

  // Ranking e formatos respeitam o período escolhido (data de publicação em Brasília).
  const periodContents = contents.filter((c) => {
    const d = brasiliaDay(c.publishedAt);
    return d >= periodData.startDate && d <= periodData.endDate;
  });
  const bestContents = analyticsService.rankContents(periodContents, selectedSortMetric, false).slice(0, 5);
  const bestIds = new Set(bestContents.map((c) => c.id));
  // Pontos de ajuste só fazem sentido com base de comparação (6+ posts no período).
  const underperformingContents =
    periodContents.length >= 6
      ? analyticsService.rankContents(periodContents, selectedSortMetric, true).filter((c) => !bestIds.has(c.id)).slice(0, 3)
      : [];
  const formatStats = analyticsService.breakdownByFormat(periodContents);

  // Filter snapshots strictly by date for the area chart
  const chartSnapshots = analyticsService.filterSnapshotsByDate(
    snapshots,
    periodData.startDate,
    periodData.endDate
  );

  const snapshotChart = chartSnapshots
    .filter((s) => s.views !== null)
    .map((s) => ({ date: s.date, label: s.date.split('-').slice(1).reverse().join('/'), value: s.views }));
  // Sem snapshots de visualizações (fluxo por CSV): soma dos posts por dia de publicação.
  const postsByDay = new Map<string, number>();
  periodContents.forEach((c) => {
    if (c.metrics.views === null) return;
    const d = brasiliaDay(c.publishedAt);
    postsByDay.set(d, (postsByDay.get(d) ?? 0) + c.metrics.views);
  });
  const chartFromPosts = snapshotChart.length === 0;
  const chartData = chartFromPosts
    ? [...postsByDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, label: date.split('-').slice(1).reverse().join('/'), value }))
    : snapshotChart;

  const formatBarData = (Object.keys(formatStats) as ContentFormat[])
    .filter(fmt => formatStats[fmt].count > 0)
    .map(fmt => ({
      label: fmt,
      value: formatStats[fmt].avgViews,
      sublabel: `${formatStats[fmt].count} posts · eng ${formatMetric(formatStats[fmt].avgEngagement, { suffix: '%' })}`
    }));

  const renderComparison = (comparison: typeof periodData.totalViews) => {
    if (!comparison.hasSufficientData || comparison.previous === null) {
      return (
        <span className="text-[11px] text-neutral-500 tabular-nums">
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
      <div className="flex items-center gap-1.5 text-[11px] tabular-nums">
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
      <div className="bg-[#161618] border border-white/[0.06] rounded-[24px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Análise de Performance & Métricas Rigorosas</span>
            </h2>
            <ProvenanceBadge type="CALCULATED_DATA" />
          </div>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            Período ativo: <span className="tabular-nums text-neutral-200">{periodData.startDate}</span> até <span className="tabular-nums text-neutral-200">{periodData.endDate}</span> ({periodData.periodDays} dias)
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-2 tabular-nums">
          <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 text-xs">
            {([7, 14, 30, 90] as const).map(days => (
              <button
                key={days}
                onClick={() => setSelectedPeriod(days)}
                className={`px-3 py-1.5 rounded-2xl transition-colors ${
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
              className={`px-3 py-1.5 rounded-2xl transition-colors ${
                selectedPeriod === 'custom'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Personalizado
            </button>
          </div>

          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-2 py-1 text-xs">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Followers */}
        <div className="bg-[#161618] border border-white/[0.06] rounded-[24px] p-5 space-y-2">
          <span className="text-[11px] text-neutral-500">Seguidores (Final)</span>
          <div className="text-2xl font-bold text-neutral-100 tabular-nums">
            {formatMetric(periodData.followersGrowth.current)}
          </div>
          {renderComparison(periodData.followersGrowth)}
        </div>

        {/* Views */}
        <div className="bg-[#161618] border border-white/[0.06] rounded-[24px] p-5 space-y-2">
          <span className="text-[11px] text-neutral-500">Visualizações (Total)</span>
          <div className="text-2xl font-bold text-neutral-100 tabular-nums">
            {formatMetric(periodData.totalViews.current)}
          </div>
          {renderComparison(periodData.totalViews)}
        </div>

        {/* Reach */}
        <div className="bg-[#161618] border border-white/[0.06] rounded-[24px] p-5 space-y-2">
          <span className="text-[11px] text-neutral-500">Alcance (Total)</span>
          <div className="text-2xl font-bold text-neutral-100 tabular-nums">
            {formatMetric(periodData.totalReach.current)}
          </div>
          {renderComparison(periodData.totalReach)}
        </div>

        {/* Engagement Rate */}
        <div className="bg-[#161618] border border-white/[0.06] rounded-[24px] p-5 space-y-2">
          <span className="text-[11px] text-neutral-500">Taxa de Engajamento (Média)</span>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums">
            {formatMetric(periodData.avgEngagementRate.current, { suffix: '%' })}
          </div>
          {renderComparison(periodData.avgEngagementRate)}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Views Trajectory */}
        <div className="lg:col-span-2 bg-[#161618] border border-white/[0.06] rounded-[24px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-200">
                Evolução de visualizações
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {chartFromPosts ? 'Soma dos posts por dia de publicação no período' : 'Visualizações diárias da conta no período'}
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
            <div className="h-[220px] flex items-center justify-center text-xs text-neutral-500 tabular-nums">
              Nenhuma visualização registrada neste período.
            </div>
          )}
        </div>

        {/* Format Performance */}
        <div className="bg-[#161618] border border-white/[0.06] rounded-[24px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-200">
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
            <div className="h-[220px] flex items-center justify-center text-xs text-neutral-500 tabular-nums">
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

          <div className="flex items-center gap-2 text-xs tabular-nums">
            <span className="text-neutral-500">Ordenar por:</span>
            <select aria-label="Ordenar conteúdos por"
              value={selectedSortMetric}
              onChange={e => setSelectedSortMetric(e.target.value as any)}
              className="bg-[#161618] border border-white/[0.06] rounded-[24px] px-3 py-1.5 text-neutral-200 focus:outline-hidden focus:border-amber-500 cursor-pointer"
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
          <div className="text-sm text-amber-400 font-semibold">
            Top 5 Conteúdos de Maior Impacto
          </div>
          {bestContents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bestContents.map(c => {
                const score = analyticsService.calculateContentScore(c);
                return (
                  <div
                    key={c.id}
                    className="p-4 bg-[#161618] border border-white/[0.06] rounded-[24px] space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs tabular-nums">
                      <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-amber-400">
                        {c.format}
                      </span>
                      <span className="text-neutral-400">Score: {score}</span>
                    </div>

                    <h4 className="text-xs font-semibold text-neutral-100 line-clamp-2">
                      {c.title}
                    </h4>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] text-center tabular-nums">
                      <div className="bg-white/[0.03] p-1.5 rounded-2xl">
                        <span className="text-[10px] text-neutral-500 block">Views</span>
                        <span className="text-xs text-neutral-200">{formatMetric(c.metrics.views)}</span>
                      </div>
                      <div className="bg-white/[0.03] p-1.5 rounded-2xl">
                        <span className="text-[10px] text-neutral-500 block">Saves</span>
                        <span className="text-xs text-purple-400 font-bold">{formatMetric(c.metrics.saves)}</span>
                      </div>
                      <div className="bg-white/[0.03] p-1.5 rounded-2xl">
                        <span className="text-[10px] text-neutral-500 block">Engajamento</span>
                        <span className="text-xs text-emerald-400">{formatMetric(c.metrics.engagementRate ?? engagementFrom(c.metrics), { suffix: '%' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center text-xs text-neutral-400 tabular-nums">
              Nenhuma publicação neste período. Escolha um período maior ou importe o CSV na aba Métricas.
            </div>
          )}
        </div>

        {underperformingContents.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-rose-300 font-semibold">Abaixo da média: pontos de ajuste</div>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {underperformingContents.map((c) => (
                <li key={c.id} className="p-4 bg-[#161618] border border-white/[0.06] rounded-[24px] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-300">{c.format}</span>
                    <span className="text-neutral-500">{new Date(c.publishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-neutral-100 line-clamp-2">{c.title}</h4>
                  <p className="text-[11px] text-neutral-400">
                    {formatMetric(c.metrics.views)} views · {formatMetric(c.metrics.saves)} salvos · eng. {formatMetric(c.metrics.engagementRate ?? engagementFrom(c.metrics), { suffix: '%' })}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-neutral-500">Compare gancho, formato e horário destes posts com os do topo antes de repetir o tema.</p>
          </div>
        )}
      </div>
    </div>
  );
};
