import React, { useState } from 'react';
import { Client, Content } from '../../types';
import { Modal } from '../common/Modal';
import {
  Sparkles,
  Eye,
  Bookmark,
  Share2,
  CheckCircle2} from 'lucide-react';
import { formatMetric } from '../../utils/metrics';

interface ContentTabProps {
  client: Client;
  contents: Content[];
  onAddContent?: (content: any) => void;
}

export const ContentTab: React.FC<ContentTabProps> = ({
  contents
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedPillar, setSelectedPillar] = useState<string>('all');
  const [activeContent, setActiveContent] = useState<Content | null>(null);

  const filteredContents = contents.filter(c => {
    if (selectedFormat !== 'all' && c.format !== selectedFormat) return false;
    if (selectedPillar !== 'all' && c.pillar !== selectedPillar) return false;
    return true;
  });

  const formats = ['all', ...Array.from(new Set(contents.map(c => c.format)))];
  const pillars = ['all', ...Array.from(new Set(contents.map(c => c.pillar)))];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header and Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161618] border border-white/[0.06] rounded-[24px] p-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-100">
            Catálogo e Classificação de Conteúdos
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {filteredContents.length} de {contents.length} publicações importadas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
          {/* Format Filter */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] px-2.5 py-1 rounded-2xl border border-white/[0.06]">
            <span className="text-neutral-500 text-[11px]">Formato:</span>
            <select aria-label="Filtrar por formato"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="bg-transparent text-amber-300 font-semibold focus:outline-hidden cursor-pointer"
            >
              {formats.map(f => (
                <option key={f} value={f} className="bg-[#161618] text-neutral-200">
                  {f === 'all' ? 'Todos os Formatos' : f}
                </option>
              ))}
            </select>
          </div>

          {/* Pillar Filter */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] px-2.5 py-1 rounded-2xl border border-white/[0.06]">
            <span className="text-neutral-500 text-[11px]">Pilar:</span>
            <select aria-label="Filtrar por pilar"
              value={selectedPillar}
              onChange={(e) => setSelectedPillar(e.target.value)}
              className="bg-transparent text-amber-300 font-semibold focus:outline-hidden cursor-pointer"
            >
              {pillars.map(p => (
                <option key={p} value={p} className="bg-[#161618] text-neutral-200">
                  {p === 'all' ? 'Todos os Pilares' : p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContents.map(content => (
          <div
            key={content.id}
            onClick={() => setActiveContent(content)}
            className="bg-[#161618] border border-white/[0.06] hover:border-white/[0.14] rounded-[24px] p-4 flex flex-col justify-between transition-all cursor-pointer group hover:bg-neutral-850"
          >
            <div>
              {/* Card Header Tags */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] tabular-nums px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 border border-white/[0.1]">
                    {content.format}
                  </span>
                  <span className="text-[10px] tabular-nums px-2 py-0.5 rounded-full bg-amber-950/30 text-amber-400 border border-amber-500/30">
                    {content.pillar}
                  </span>
                </div>

                <span className="text-[11px] tabular-nums text-neutral-500">
                  {new Date(content.publishedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}
                </span>
              </div>

              {/* Title & Hook */}
              <h4 className="text-xs font-bold text-neutral-200 group-hover:text-amber-300 transition-colors line-clamp-2 mb-2">
                {content.title}
              </h4>

              <div className="p-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-xs mb-3">
                <div className="text-[9px] text-neutral-500 mb-0.5">Gancho</div>
                <p className="text-neutral-300 text-[11px] italic line-clamp-2">
                  &quot;{content.hook}&quot;
                </p>
              </div>
            </div>

            {/* Metrics Footer */}
            <div>
              <div className="grid grid-cols-4 gap-1 py-2 px-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center tabular-nums text-xs">
                <div>
                  <div className="text-[9px] text-neutral-500 flex items-center justify-center gap-0.5">
                    <Eye className="w-2.5 h-2.5" /> Views
                  </div>
                  <div className="text-neutral-200 font-semibold tabular-nums text-[11px]">
                    {formatMetric(content.metrics.views)}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] text-neutral-500 flex items-center justify-center gap-0.5">
                    <Bookmark className="w-2.5 h-2.5" /> Salvos
                  </div>
                  <div className="text-neutral-200 font-semibold tabular-nums text-[11px]">
                    {formatMetric(content.metrics.saves)}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] text-neutral-500 flex items-center justify-center gap-0.5">
                    <Share2 className="w-2.5 h-2.5" /> Shares
                  </div>
                  <div className="text-neutral-200 font-semibold tabular-nums text-[11px]">
                    {formatMetric(content.metrics.shares)}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] text-neutral-500">Eng %</div>
                  <div className="text-emerald-400 font-semibold tabular-nums text-[11px]">
                    {formatMetric(content.metrics.engagementRate, { suffix: '%' })}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500 tabular-nums">
                <span>Objetivo: {content.objective}</span>
                <span className="text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Ver análise →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content AI Diagnosis Modal */}
      {activeContent && (
        <Modal
          isOpen={Boolean(activeContent)}
          onClose={() => setActiveContent(null)}
          title={`Diagnóstico: "${activeContent.title}"`}
          subtitle={`Classificação Estratégica · ${activeContent.format} · ${activeContent.pillar}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            {/* Real Metrics Header */}
            <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>Métricas Reais Observadas</span>
                <span className="text-sky-400 border border-sky-500/30 px-1.5 py-0.2 rounded-full bg-sky-950/20">DADO REAL</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center tabular-nums pt-1">
                <div className="p-2 bg-[#161618] rounded-[24px] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-500">Views</div>
                  <div className="text-xs font-bold text-neutral-100">{formatMetric(activeContent.metrics.views)}</div>
                </div>
                <div className="p-2 bg-[#161618] rounded-[24px] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-500">Alcance</div>
                  <div className="text-xs font-bold text-neutral-100">{formatMetric(activeContent.metrics.reach)}</div>
                </div>
                <div className="p-2 bg-[#161618] rounded-[24px] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-500">Salvos</div>
                  <div className="text-xs font-bold text-neutral-100">{formatMetric(activeContent.metrics.saves)}</div>
                </div>
                <div className="p-2 bg-[#161618] rounded-[24px] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-500">Shares</div>
                  <div className="text-xs font-bold text-neutral-100">{formatMetric(activeContent.metrics.shares)}</div>
                </div>
                <div className="p-2 bg-[#161618] rounded-[24px] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-500">Curtidas</div>
                  <div className="text-xs font-bold text-neutral-100">{formatMetric(activeContent.metrics.likes)}</div>
                </div>
                <div className="p-2 bg-[#161618] rounded-[24px] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-500">Engajamento</div>
                  <div className="text-xs font-bold text-emerald-400">{formatMetric(activeContent.metrics.engagementRate, { suffix: '%' })}</div>
                </div>
              </div>
            </div>

            {/* Hook, CTA & Caption */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                <span className="text-[11px] text-neutral-500">Gancho de Retenção</span>
                <p className="text-neutral-200 mt-1 italic">&quot;{activeContent.hook}&quot;</p>
              </div>

              <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                <span className="text-[11px] text-neutral-500">Chamada para Ação (CTA)</span>
                <p className="text-neutral-200 mt-1 tabular-nums">{activeContent.cta}</p>
              </div>
            </div>

            {/* AI Diagnosis Insights */}
            {activeContent.aiAnalysis && (
              <div className="space-y-4 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-bold text-purple-300">
                    Leitura comparativa (cálculo automático)
                  </span>
                  <span className="text-[10px] tabular-nums px-1.5 py-0.2 rounded-full border border-purple-500/30 text-purple-400 bg-purple-950/20">
                    HIPÓTESE
                  </span>
                </div>

                <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl space-y-1">
                  <span className="text-[11px] text-neutral-500">Por que funcionou</span>
                  <p className="text-neutral-300 leading-relaxed">{activeContent.aiAnalysis.whyItWorked}</p>
                </div>

                {activeContent.aiAnalysis.whyItMayHaveUnderperformed && (
                  <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl space-y-1">
                    <span className="text-[11px] text-neutral-500">Oportunidade de Ajuste</span>
                    <p className="text-neutral-300 leading-relaxed">{activeContent.aiAnalysis.whyItMayHaveUnderperformed}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-white/[0.03] border border-emerald-500/20 bg-emerald-950/10 rounded-2xl">
                    <span className="text-[11px] text-emerald-400 font-semibold">Pontos Fortes</span>
                    <ul className="mt-1 space-y-1 text-neutral-300">
                      {activeContent.aiAnalysis.strengths.map((s, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-white/[0.03] border border-amber-500/20 bg-amber-950/10 rounded-2xl">
                    <span className="text-[11px] text-amber-400 font-semibold">Oportunidade Imediata</span>
                    <p className="mt-1 text-amber-200 leading-relaxed">{activeContent.aiAnalysis.opportunity}</p>
                  </div>
                </div>

                <div className="text-[11px] tabular-nums text-neutral-500 border-t border-white/[0.06] pt-2">
                  * {activeContent.aiAnalysis.hypothesisNote}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
