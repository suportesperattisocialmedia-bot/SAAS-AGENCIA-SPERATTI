import React, { useState } from 'react';
import { Client, AccountSnapshot } from '../../types';
import { ChartArea } from '../common/ChartArea';
import { reportService } from '../../services/reportService';
import {
  Download} from 'lucide-react';
import { formatMetric } from '../../utils/metrics';

interface HistoryTabProps {
  client: Client;
  snapshots: AccountSnapshot[];
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  client,
  snapshots
}) => {
  const [filterDays, setFilterDays] = useState<number>(30);
  const [activeChartMetric, setActiveChartMetric] = useState<keyof AccountSnapshot>('followers');

  const filteredSnapshots = filterDays === 0
    ? snapshots
    : snapshots.slice(-filterDays);

  // Chart data
  const chartData = filteredSnapshots.map(s => ({
    date: s.date,
    label: s.date.split('-').slice(1).reverse().join('/'),
    value: Number(s[activeChartMetric]) || 0
  }));

  const metricsSelectOptions: Array<{ id: keyof AccountSnapshot; label: string }> = [
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161618] border border-white/[0.06] rounded-[24px] p-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <span>Registro Histórico Diário de Snapshots</span>
            <span className="text-[10px] tabular-nums px-2 py-0.5 rounded-full border border-white/[0.1] text-neutral-400 bg-white/[0.03]">
              {snapshots.length} dias registrados
            </span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Todos os registros do cliente, do mais antigo ao mais recente
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/[0.06] tabular-nums text-xs">
            {[7, 14, 30, 90, 0].map(d => (
              <button
                key={d}
                onClick={() => setFilterDays(d)}
                className={`px-2.5 py-1 rounded-2xl transition-colors ${
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
            className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 border border-white/[0.1] rounded-full text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Selector & Trend Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-400 font-semibold">
            Evolução Diária da Métrica Selecionada
          </span>

          <div className="flex items-center gap-2 text-xs tabular-nums">
            <span className="text-neutral-500">Métrica:</span>
            <select aria-label="Métrica do gráfico"
              value={activeChartMetric}
              onChange={(e) => setActiveChartMetric(e.target.value as any)}
              className="bg-[#161618] border border-white/[0.06] text-amber-300 px-2 py-1 rounded-[24px] focus:outline-hidden"
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
      <div className="bg-[#161618] border border-white/[0.06] rounded-[24px] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
          <span className="text-sm text-neutral-300 font-semibold">
            Tabela Completa de Snapshots
          </span>
          <span className="text-[11px] tabular-nums text-neutral-500">
            Mais recentes primeiro
          </span>
        </div>

        <div className="overflow-x-auto max-h-[480px] custom-scrollbar">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="sticky top-0 bg-[#161618] z-10">
              <tr className="border-b border-white/[0.06] text-neutral-500 text-[11px]">
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
            <tbody className="divide-y divide-white/[0.05] text-neutral-300">
              {[...filteredSnapshots].reverse().map(snap => (
                <tr key={snap.id} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="py-2.5 font-bold text-neutral-200">
                    {snap.date}
                  </td>
                  <td className="py-2.5 text-right font-bold text-amber-300 tabular-nums">
                    {formatMetric(snap.followers)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatMetric(snap.views)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatMetric(snap.reach)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatMetric(snap.likes)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatMetric(snap.comments)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatMetric(snap.shares)}
                  </td>
                  <td className="py-2.5 text-right text-emerald-400 font-semibold tabular-nums">
                    {formatMetric(snap.saves)}
                  </td>
                  <td className="py-2.5 text-right text-emerald-400 font-bold tabular-nums">
                    {formatMetric(snap.engagementRate, { suffix: '%' })}
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
