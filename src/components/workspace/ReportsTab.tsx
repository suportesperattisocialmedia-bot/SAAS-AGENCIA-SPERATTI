import React, { useState } from 'react';
import { Client, Report, Content, AccountSnapshot } from '../../types';
import { reportService } from '../../services/reportService';
import { notificationService, notificationStore } from '../../services/notifications/NotificationStore';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Bookmark,
  Share2,
  Eye
} from 'lucide-react';
import { formatMetric } from '../../utils/metrics';

interface ReportsTabProps {
  client: Client;
  contents: Content[];
  snapshots: AccountSnapshot[];
  reports: Report[];
  onRefresh: () => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  client,
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
      notificationStore.notify(
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

  const handleExportPdf = async () => {
    if (!activeReport) return;
    try {
      await reportService.exportToPdf(activeReport, client);
    } catch {
      notificationService.showToast('Não foi possível gerar o PDF.', 'error');
    }
  };

  const handleExportCsv = () => {
    reportService.exportHistoryCsv(client.id);
  };

  const formatDiff = (diff: number | null | undefined) => {
    if (diff === null || diff === undefined) {
      return <span className="text-neutral-500 font-normal">Sem base anterior</span>;
    }
    const isPos = diff >= 0;
    return (
      <span className={isPos ? 'text-emerald-400' : 'text-rose-400'}>
        {isPos ? '+' : ''}{diff}% vs anterior
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Action Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Gerador de Relatórios Executivos</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Documentos consolidados de inteligência de marketing para apresentação a clientes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-1 text-xs">
            {([7, 14, 30, 90] as const).map(days => (
              <button
                key={days}
                onClick={() => setSelectedPeriod(days)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  selectedPeriod === days
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold rounded-xl text-xs transition-colors shadow-md shadow-amber-500/10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Calculando...' : 'Gerar Relatório'}</span>
          </button>

          {activeReport && (
            <>
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs transition-colors"
                title="Baixar relatório em PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs transition-colors"
                title="Exportar Métricas em CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Report Document View */}
      {activeReport ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-10 space-y-8 print:border-none print:p-0 print:bg-white print:text-black">
          {/* Header Banner */}
          <div className="border-b border-neutral-800 pb-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
            <div>
              <div className="text-[11px] font-mono text-amber-400 tracking-wider uppercase">
                GABRIEL SPERATTI · SOCIAL INTELLIGENCE
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-100 tracking-tight mt-1">
                {activeReport.title}
              </h1>
              <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400 font-mono">
                <span>{activeReport.clientName}</span>
                <span>·</span>
                <span className="text-amber-400">{activeReport.clientInstagram}</span>
                <span>·</span>
                <span>{activeReport.periodLabel}</span>
              </div>
            </div>

            <div className="text-[10px] text-neutral-500 font-mono text-right">
              Gerado em: {new Date(activeReport.generatedAt).toLocaleDateString('pt-BR')}
            </div>
          </div>

          {/* Section: Resumo Executivo */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
              01. Resumo Executivo da Operação
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 font-sans">
              {activeReport.executiveSummary}
            </p>
          </div>

          {/* Section: KPIs */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
              02. Indicadores Principais de Performance (KPIs)
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">Seguidores Finais</span>
                <div className="text-lg font-bold text-neutral-100 tabular-nums">
                  {formatMetric(activeReport.kpis.followers)}
                </div>
                <div className="text-[11px] mt-1 font-sans">
                  {formatDiff(activeReport.kpis.followersDiffPct)}
                </div>
              </div>

              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">Visualizações Totais</span>
                <div className="text-lg font-bold text-neutral-100 tabular-nums">
                  {formatMetric(activeReport.kpis.views)}
                </div>
                <div className="text-[11px] mt-1 font-sans">
                  {formatDiff(activeReport.kpis.viewsDiffPct)}
                </div>
              </div>

              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">Alcance Único</span>
                <div className="text-lg font-bold text-neutral-100 tabular-nums">
                  {formatMetric(activeReport.kpis.reach)}
                </div>
                <div className="text-[11px] mt-1 font-sans">
                  {formatDiff(activeReport.kpis.reachDiffPct)}
                </div>
              </div>

              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">Taxa de Engajamento</span>
                <div className="text-lg font-bold text-emerald-400 tabular-nums">
                  {formatMetric(activeReport.kpis.engagementRate, { suffix: '%' })}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 font-sans">
                  {activeReport.kpis.postsCount} posts no período
                </div>
              </div>
            </div>
          </div>

          {/* Section: Melhores Conteúdos */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
              03. Top Conteúdos de Maior Destaque
            </h3>
            {activeReport.topContents && activeReport.topContents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {activeReport.topContents.map((content, idx) => (
                  <div
                    key={content.id || idx}
                    className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] text-amber-400 font-mono">
                      <span>{content.format}</span>
                      <span className="text-neutral-500">{content.pillar}</span>
                    </div>
                    <div className="text-xs font-semibold text-neutral-200 line-clamp-2">
                      {content.title}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono pt-2 border-t border-neutral-800/60">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-sky-400" />
                        {formatMetric(content.metrics.views)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-purple-400" />
                        {content.metrics.saves}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 className="w-3 h-3 text-amber-400" />
                        {content.metrics.shares}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-400">
                Nenhum conteúdo registrado para o período.
              </div>
            )}
          </div>

          {/* Section: Análise Qualitativa e Recomendações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-800">
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
                04. Análise Estratégica
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
                {activeReport.analysisText}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
                05. Oportunidades & Próximas Ações
              </h3>
              <ul className="space-y-2 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
                {(activeReport.nextSteps || activeReport.recommendations || []).map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-neutral-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>Gabriel Speratti | Social Intelligence</span>
            <span>Relatório Confidencial · Uso Exclusivo</span>
          </div>
        </div>
      ) : (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-12 text-center space-y-3">
          <FileText className="w-8 h-8 text-neutral-600 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-200">
            Nenhum relatório gerado ainda
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Clique no botão acima para compilar os dados do período selecionado em um documento estratégico executivo.
          </p>
        </div>
      )}
    </div>
  );
};
