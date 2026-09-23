import React, { useState } from 'react';
import { Client, Content, MetricSnapshot, ContentMetrics } from '../../types';
import { analyticsService } from '../../services/analyticsService';
import { StatCard } from '../common/StatCard';
import { ChartArea } from '../common/ChartArea';
import { ChartBar } from '../common/ChartBar';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Bookmark,
  Share2,
  Heart,
  MessageSquare,
  Filter
} from 'lucide-react';

interface PerformanceTabProps {
  client: Client;
  contents: Content[];
  snapshots: MetricSnapshot[];
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({
  client,
  contents,
  snapshots
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30 | 90>(30);
  const [selectedSortMetric, setSelectedSortMetric] = useState<keyof ContentMetrics>('views');

  const summary = analyticsService.calculatePeriodSummary(snapshots, selectedPeriod);
  const bestContents = analyticsService.rankContents(contents, selectedSortMetric, 'desc').slice(0, 5);
  const worstContents = analyticsService.rankContents(contents, selectedSortMetric, 'asc').slice(0, 3);
  const formatStats = analyticsService.getFormatPerformance(contents);

  const chartData = snapshots.slice(-selectedPeriod).map(s => ({
    date: s.timestamp,
    label: s.timestamp.split('-').slice(1).reverse().join('/'),
    value: s.views
  }));

  const formatBarData = formatStats.map(f => ({
    label: f.format,
    value: f.avgViews,
    sublabel: `${f.count} posts · eng ${f.avgEngagementRate}%`
  }));

  const metricOptions: Array<{ id: keyof ContentMetrics; label: string }> = [
    { id: 'views', label: 'Visualizações' },
    { id: 'saves', label: 'Salvamentos' },
    { id: 'shares', label: 'Compartilhamentos' },
    { id: 'engagementRate', label: 'Engajamento %' },
    { id: 'likes', label: 'Curtidas' },
    { id: 'comments', label: 'Comentários' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Period Selector Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-100">
            Comparativo de Performance: Atual vs Anterior
          </h3>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            Período: {summary.startDate} até {summary.endDate} ({selectedPeriod} dias)
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800 self-start sm:self-center font-mono text-xs">
          {[7, 14, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days as any)}
              className={`px-3 py-1 rounded transition-colors ${
                selectedPeriod === days
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Visualizações Totais"
          value={summary.views.current.toLocaleString('pt-BR')}
          typeTag="DADO REAL"
          diffPercent={summary.views.diffPercent}
          periodLabel={`${selectedPeriod}d`}
        />

        <StatCard
          label="Alcance Único de Contas"
          value={summary.reach.current.toLocaleString('pt-BR')}
          typeTag="DADO REAL"
          diffPercent={summary.reach.diffPercent}
          periodLabel={`${selectedPeriod}d`}
        />

        <StatCard
          label="Salvamentos Totais"
          value={summary.saves.current.toLocaleString('pt-BR')}
          typeTag="DADO REAL"
          diffPercent={summary.saves.diffPercent}
          periodLabel="Alta Intenção"
        />

        <StatCard
          label="Taxa de Engajamento Real"
          value={`${summary.engagementRate.current}%`}
          typeTag="DADO CALCULADO"
          diffPercent={summary.engagementRate.diffPercent}
          periodLabel="Base: Alcance"
        />
      </div>

      {/* Trend Chart & Format Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartArea
            data={chartData}
            title={`Evolução Diária de Visualizações (${selectedPeriod} dias)`}
            subtitle="Métrica observada nos snapshots sincronizados"
            valueFormatter={(val) => `${val.toLocaleString('pt-BR')} views`}
            height={250}
            lineColor="#f59e0b"
          />
        </div>

        <div>
          <ChartBar
            data={formatBarData}
            title="Média de Visualizações por Formato"
            subtitle="Comparação de entrega orgânica observada"
            height={250}
            valueFormatter={(val) => `${val.toLocaleString('pt-BR')} views`}
          />
        </div>
      </div>

      {/* Ranking Header & Sorter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <span>Ranking de Performance de Conteúdos</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-700 text-neutral-400 bg-neutral-900">
              {contents.length} postagens
            </span>
          </h4>
          <p className="text-xs text-neutral-400 mt-0.5">
            Classificação rigorosa baseada em dados reais observados
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <Filter className="w-3.5 h-3.5 text-neutral-500" />
          <span className="text-neutral-400 text-[11px]">Ordenar por:</span>
          <select
            value={selectedSortMetric}
            onChange={(e) => setSelectedSortMetric(e.target.value as any)}
            className="bg-neutral-900 border border-neutral-800 text-amber-300 font-semibold px-2.5 py-1 rounded text-xs focus:outline-hidden focus:border-amber-500"
          >
            {metricOptions.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Best Contents vs Worst Contents Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Performers */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <span className="text-xs font-mono uppercase text-emerald-400 font-semibold flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" /> Top 5 Maiores Resultados
            </span>
            <span className="text-[11px] font-mono text-neutral-400">
              Métrica: {selectedSortMetric}
            </span>
          </div>

          <div className="space-y-2">
            {bestContents.map((c, i) => {
              const comp = analyticsService.getContentVsAverage(c, contents, selectedSortMetric);
              return (
                <div
                  key={c.id}
                  className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-200 truncate">
                          {c.title}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-2 mt-0.5">
                          <span>{c.format}</span>
                          <span>·</span>
                          <span>{c.pillar}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <div className="text-xs font-bold text-amber-300 tabular-nums">
                        {c.metrics[selectedSortMetric].toLocaleString('pt-BR')}
                      </div>
                      <div className="text-[10px] text-emerald-400 tabular-nums">
                        {comp.formatted}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Worst 3 Performers */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <span className="text-xs font-mono uppercase text-rose-400 font-semibold flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4" /> Menores Desempenhos no Período
            </span>
            <span className="text-[11px] font-mono text-neutral-400">
              Oportunidade de Ajuste
            </span>
          </div>

          <div className="space-y-2">
            {worstContents.map((c, i) => {
              const comp = analyticsService.getContentVsAverage(c, contents, selectedSortMetric);
              return (
                <div
                  key={c.id}
                  className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-300 truncate">
                          {c.title}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-500 flex items-center gap-2 mt-0.5">
                          <span>{c.format}</span>
                          <span>·</span>
                          <span>{c.pillar}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <div className="text-xs font-bold text-neutral-300 tabular-nums">
                        {c.metrics[selectedSortMetric].toLocaleString('pt-BR')}
                      </div>
                      <div className="text-[10px] text-rose-400 tabular-nums">
                        {comp.formatted}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
