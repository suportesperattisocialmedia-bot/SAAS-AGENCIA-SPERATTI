import React, { useState } from 'react';
import { Client, MetricSnapshot } from '../../types';
import { ChartArea } from '../common/ChartArea';
import { reportService } from '../../services/reportService';
import {
  History,
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface HistoryTabProps {
  client: Client;
  snapshots: MetricSnapshot[];
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  client,
  snapshots
}) => {
  const [filterDays, setFilterDays] = useState<number>(30);
  const [activeChartMetric, setActiveChartMetric] = useState<keyof MetricSnapshot>('followers');

  const filteredSnapshots = filterDays === 0
    ? snapshots
    : snapshots.slice(-filterDays);

  // Chart data
  const chartData = filteredSnapshots.map(s => ({
    date: s.timestamp,
    label: s.timestamp.split('-').slice(1).reverse().join('/'),
    value: Number(s[activeChartMetric]) || 0
  }));

  const metricsSelectOptions: Array<{ id: keyof MetricSnapshot; label: string }> = [
    { id: 'followers', label: 'Seguidores' },
    { id: 'views', label: 'Visualizações' },
    { id: 'reach', label: 'Alcance' },
    { id: 'likes', label: 'Curtidas' },
    { id: 'comments', label: 'Comentários' },
    { id: 'shares', label: 'Compartilhamentos' },
    { id: 'saves', label: 'Salvamentos' },
    { id: 'engagementRate', label: 'Engajamento %' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <span>Registro Histórico Diário de Snapshots</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-700 text-neutral-400 bg-neutral-950">
              {snapshots.length} dias registrados
            </span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Dados preservados cronologicamente sem sobrescrita de datas passadas
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 font-mono text-xs">
            {[7, 14, 30, 90, 0].map(d => (
              <button
                key={d}
                onClick={() => setFilterDays(d)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterDays === d
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {d === 0 ? 'Tudo' : `${d}d`}
              </button>
            ))}
          </div>

          <button
            onClick={() => reportService.exportHistoryCsv(client.id)}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Selector & Trend Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase text-neutral-400 font-semibold">
            Evolução Diária da Métrica Selecionada
          </span>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-neutral-500">Métrica:</span>
            <select
              value={activeChartMetric}
              onChange={(e) => setActiveChartMetric(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-800 text-amber-300 px-2 py-1 rounded focus:outline-hidden"
            >
              {metricsSelectOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <ChartArea
          data={chartData}
          title={`Evolução de ${metricsSelectOptions.find(o => o.id === activeChartMetric)?.label || ''}`}
          subtitle={`Amostra de ${filteredSnapshots.length} snapshots sincronizados`}
          primaryLabel={metricsSelectOptions.find(o => o.id === activeChartMetric)?.label}
          valueFormatter={(val) => activeChartMetric === 'engagementRate' ? `${val}%` : val.toLocaleString('pt-BR')}
          height={240}
        />
      </div>

      {/* Complete Snapshots Table */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
          <span className="text-xs font-mono uppercase text-neutral-300 font-semibold">
            Tabela Completa de Snapshots
          </span>
          <span className="text-[11px] font-mono text-neutral-500">
            Mais recentes primeiro
          </span>
        </div>

        <div className="overflow-x-auto max-h-[480px] custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-neutral-900 z-10">
              <tr className="border-b border-neutral-800 text-neutral-500 uppercase text-[10px]">
                <th className="pb-2 font-semibold">Data</th>
                <th className="pb-2 font-semibold text-right">Seguidores</th>
                <th className="pb-2 font-semibold text-right">Views</th>
                <th className="pb-2 font-semibold text-right">Alcance</th>
                <th className="pb-2 font-semibold text-right">Curtidas</th>
                <th className="pb-2 font-semibold text-right">Comentários</th>
                <th className="pb-2 font-semibold text-right">Shares</th>
                <th className="pb-2 font-semibold text-right">Salvos</th>
                <th className="pb-2 font-semibold text-right">Engajamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              {[...filteredSnapshots].reverse().map(snap => (
                <tr key={snap.id} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="py-2.5 font-bold text-neutral-200">
                    {snap.timestamp}
                  </td>
                  <td className="py-2.5 text-right font-bold text-amber-300 tabular-nums">
                    {snap.followers.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {snap.views.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {snap.reach.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {snap.likes.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {snap.comments.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {snap.shares.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 text-right text-emerald-400 font-semibold tabular-nums">
                    {snap.saves.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 text-right text-emerald-400 font-bold tabular-nums">
                    {snap.engagementRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
