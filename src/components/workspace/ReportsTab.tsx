import React, { useState } from 'react';
import { Client, Report, Content, MetricSnapshot } from '../../types';
import { reportService } from '../../services/reportService';
import { notificationService } from '../../services/notificationService';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Bookmark,
  Share2,
  Eye
} from 'lucide-react';

interface ReportsTabProps {
  client: Client;
  contents: Content[];
  snapshots: MetricSnapshot[];
  reports: Report[];
  onRefresh: () => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  client,
  contents,
  snapshots,
  reports,
  onRefresh
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30 | 90>(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(reports[0] || null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await reportService.generateReport(client, selectedPeriod);
      setActiveReport(generated);
      notificationService.addNotification(
        'Relatório Executivo Gerado',
        `Relatório de ${selectedPeriod} dias para ${client.name} gerado com sucesso.`,
        'success'
      );
      onRefresh();
    } catch {
      notificationService.showToast('Erro ao gerar relatório.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action Controls (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <span>Central de Relatórios Executivos</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-700 text-neutral-400 bg-neutral-950">
              Gabriel Speratti Standard
            </span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Relatórios com hierarquia executiva, KPIs de crescimento, oportunidades e próximos passos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period buttons */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 font-mono text-xs">
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setSelectedPeriod(d as any)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedPeriod === d
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Gerando...' : 'Gerar Relatório'}</span>
          </button>

          {activeReport && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-mono transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* CSV Export Bar (Hidden on Print) */}
      <div className="no-print flex flex-wrap items-center gap-2 p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl text-xs font-mono">
        <span className="text-neutral-500 text-[11px] flex items-center gap-1">
          <Download className="w-3 h-3 text-neutral-400" /> Exportações CSV:
        </span>
        <button
          onClick={() => reportService.exportHistoryCsv(client.id)}
          className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-colors"
        >
          Histórico Diário (.csv)
        </button>
        <button
          onClick={() => reportService.exportContentsCsv(client.id)}
          className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-colors"
        >
          Catálogo de Conteúdos (.csv)
        </button>
        <button
          onClick={() => reportService.exportIdeasCsv(client.id)}
          className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-colors"
        >
          Banco de Ideias (.csv)
        </button>
        <button
          onClick={() => reportService.exportCompetitorsCsv(client.id)}
          className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:border-neutral-700 transition-colors"
        >
          Concorrentes Mapeados (.csv)
        </button>
      </div>

      {/* Active Executive Report Container (Optimized for Screen & Print) */}
      {activeReport ? (
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-8 print:p-0 print:border-none print:bg-white print:text-black">
          {/* Executive Cover & Header */}
          <div className="border-b border-neutral-800 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold font-mono tracking-widest text-amber-400 uppercase">
                  Gabriel Speratti | Social Intelligence
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-700 text-neutral-400 bg-neutral-950">
                  RELATÓRIO EXECUTIVO OFICIAL
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-neutral-100 tracking-tight">
                {activeReport.title}
              </h2>
              <div className="text-sm font-mono text-neutral-400 mt-1">
                Cliente: <span className="text-neutral-200 font-bold">{activeReport.clientName}</span> ({activeReport.clientInstagram})
              </div>
            </div>

            <div className="text-right font-mono text-xs text-neutral-400 self-start sm:self-auto">
              <div className="text-neutral-300 font-semibold">{activeReport.periodLabel}</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Emitido em {new Date(activeReport.generatedAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          {/* Section: Resumo Executivo */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold font-mono uppercase text-amber-400 tracking-wider">
              01. Resumo Executivo
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4">
              {activeReport.executiveSummary}
            </p>
          </div>

          {/* Section: KPIs Consolidados */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold font-mono uppercase text-amber-400 tracking-wider">
              02. Indicadores Principais de Performance (KPIs)
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">Seguidores Finais</span>
                <div className="text-lg font-bold text-neutral-100 tabular-nums">
                  {activeReport.kpis.followers.toLocaleString('pt-BR')}
                </div>
                <div className="text-[11px] text-emerald-400 mt-1">
                  {activeReport.kpis.followersDiffPct >= 0 ? '+' : ''}{activeReport.kpis.followersDiffPct}% vs anterior
                </div>
              </div>

              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">Visualizações Totais</span>
                <div className="text-lg font-bold text-neutral-100 tabular-nums">
                  {activeReport.kpis.views.toLocaleString('pt-BR')}
                </div>
                <div className="text-[11px] text-emerald-400 mt-1">
                  {activeReport.kpis.viewsDiffPct >= 0 ? '+' : ''}{activeReport.kpis.viewsDiffPct}% vs anterior
                </div>
              </div>

              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">Alcance Único</span>
                <div className="text-lg font-bold text-neutral-100 tabular-nums">
                  {activeReport.kpis.reach.toLocaleString('pt-BR')}
                </div>
                <div className="text-[11px] text-emerald-400 mt-1">
                  {activeReport.kpis.reachDiffPct >= 0 ? '+' : ''}{activeReport.kpis.reachDiffPct}% vs anterior
                </div>
              </div>

              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">Taxa de Engajamento</span>
                <div className="text-lg font-bold text-emerald-400 tabular-nums">
                  {activeReport.kpis.engagementRate}%
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  {activeReport.kpis.postsCount} posts no período
                </div>
              </div>
            </div>
          </div>

          {/* Section: Melhores Conteúdos vs Menores Desempenhos */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold font-mono uppercase text-amber-400 tracking-wider">
              03. Conteúdos de Maior Destaque no Período
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activeReport.topContents.map((content, idx) => (
                <div
                  key={content.id}
                  className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-neutral-500">{content.format}</span>
                  </div>
                  <h5 className="font-bold text-neutral-200 line-clamp-2">{content.title}</h5>
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-1 border-t border-neutral-800/60">
                    <span>{content.metrics.views.toLocaleString('pt-BR')} views</span>
                    <span className="text-emerald-400 font-bold">{content.metrics.saves} salvos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Diagnóstico Analítico & Oportunidades */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-2 text-xs">
              <h4 className="font-bold font-mono uppercase text-neutral-200">
                04. Interpretação Estratégica da Agência
              </h4>
              <p className="text-neutral-300 leading-relaxed">
                {activeReport.analysisText}
              </p>
            </div>

            <div className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-2 text-xs">
              <h4 className="font-bold font-mono uppercase text-amber-400">
                05. Oportunidades Mapeadas
              </h4>
              <ul className="space-y-1.5 text-neutral-300">
                {activeReport.opportunities.map((op, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 font-mono font-bold">•</span>
                    <span>{op}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section: Recomendações e Próximos Passos */}
          <div className="p-5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3 text-xs">
            <h4 className="font-bold font-mono uppercase text-emerald-400">
              06. Próximos Passos Operacionais Prioritários
            </h4>
            <div className="space-y-2">
              {activeReport.nextSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 bg-neutral-900 rounded border border-neutral-800/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-neutral-200">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Signoff Footer */}
          <div className="pt-6 border-t border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-500">
            <div>Gabriel Speratti · Estratégia de Social Intelligence</div>
            <div>Documento Confidencial · Uso Exclusivo da Agência</div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-neutral-900/40 border border-neutral-800 rounded-xl space-y-3">
          <FileText className="w-8 h-8 text-neutral-500 mx-auto" />
          <h4 className="text-sm font-semibold text-neutral-300">Nenhum relatório gerado ainda</h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Selecione o período desejado e clique em &quot;Gerar Relatório&quot; para produzir a análise executiva completa.
          </p>
        </div>
      )}
    </div>
  );
};
