import { formatDateTimeBR } from '../../utils/dates';
import React from 'react';
import { Client, Content, MetricSnapshot } from '../../types';
import { ProfileDiagnosticResult } from '../../services/aiService';
import {
  Sparkles,
  User,
  Layers,
  TrendingUp,
  Target,
  RefreshCw
} from 'lucide-react';

interface DiagnosticTabProps {
  client: Client;
  contents: Content[];
  snapshots: MetricSnapshot[];
  diagnostic: ProfileDiagnosticResult | null;
  onRunDiagnostic: () => void;
  isAnalyzing: boolean;
}

export const DiagnosticTab: React.FC<DiagnosticTabProps> = ({
  client,
  diagnostic,
  onRunDiagnostic,
  isAnalyzing
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-neutral-100">
              Diagnóstico Estratégico Profundo da Conta
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-purple-500/30 text-purple-400 bg-purple-950/20">
              ANÁLISE POR IA EXTERNA
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Auditoria multidimensional do perfil {client.instagram}: Perfil, Conteúdo, Performance e Estratégia
          </p>
        </div>

        <button
          onClick={onRunDiagnostic}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 shadow-xs shrink-0 self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{diagnostic ? 'Gerar nova análise' : 'Gerar análise completa'}</span>
        </button>
      </div>

      {diagnostic ? (
        <div className="space-y-6">
          {([
            {
              icon: User,
              title: '01. Diagnóstico do Perfil e Apresentação',
              fields: [
                ['Foto & Identidade Visual', diagnostic.profileSection.photoAnalysis],
                ['Nome & Nome de Usuário', diagnostic.profileSection.usernameAndName],
                ['Clareza da Bio', diagnostic.profileSection.bioClarity],
                ['Proposta de Valor', diagnostic.profileSection.valueProposition],
                ['CTA & Link da Bio', diagnostic.profileSection.ctaAndLink],
                ['Estrutura de Destaques', diagnostic.profileSection.highlightsStructure],
                ['Autoridade Percebida', diagnostic.profileSection.perceivedAuthority]
              ]
            },
            {
              icon: Layers,
              title: '02. Diagnóstico de Conteúdo e Formatos',
              fields: [
                ['Frequência de Postagem', diagnostic.contentSection.publishingFrequency],
                ['Formatos Predominantes', diagnostic.contentSection.predominantFormats],
                ['Pilares Editoriais', diagnostic.contentSection.editorialPillars],
                ['Identidade Visual', diagnostic.contentSection.visualIdentityAndAesthetics],
                ['Uso de Ganchos', diagnostic.contentSection.hookUsage],
                ['Qualidade das Legendas', diagnostic.contentSection.captionQuality],
                ['Eficácia dos CTAs', diagnostic.contentSection.ctaEffectiveness],
                ['Temas de Melhor Desempenho', diagnostic.contentSection.topPerformingThemes]
              ]
            },
            {
              icon: TrendingUp,
              title: '03. Diagnóstico de Performance Real',
              fields: [
                ['Engajamento', diagnostic.performanceSection.engagementAnalysis],
                ['Alcance e Visualizações', diagnostic.performanceSection.reachAndImpressions],
                ['Salvamentos e Compartilhamentos', diagnostic.performanceSection.savesAndShares],
                ['Retenção do Público', diagnostic.performanceSection.audienceRetention],
                ['Conteúdos de Melhor Resultado', diagnostic.performanceSection.bestContentObservations],
                ['Conteúdos de Pior Resultado', diagnostic.performanceSection.worstContentObservations]
              ]
            }
          ] as Array<{ icon: typeof User; title: string; fields: Array<[string, string]> }>).map(({ icon: Icon, title, fields }) => (
            <div key={title} className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                <Icon className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold font-mono uppercase text-neutral-200 tracking-wider">{title}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {fields.map(([label, value]) => (
                  <div key={label} className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase">{label}</span>
                    {value?.trim() ? (
                      <p className="text-neutral-300 leading-relaxed whitespace-pre-line">{value}</p>
                    ) : (
                      <p className="text-neutral-600 italic">Não abordado nesta análise.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Section 4: ESTRATÉGIA */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Target className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold font-mono uppercase text-neutral-200 tracking-wider">
                04. Estratégia de Posicionamento, Funil e Vendas
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {([
                ['Forças', diagnostic.strategySection.strengths],
                ['Vulnerabilidades', diagnostic.strategySection.vulnerabilities],
                ['Oportunidades Imediatas', diagnostic.strategySection.immediateOpportunities],
                ['Pilares de Alto Impacto', diagnostic.strategySection.highImpactPillars],
                ['Formatos Recomendados', diagnostic.strategySection.recommendedFormats],
                ['Próximas Ações', diagnostic.nextActions]
              ] as Array<[string, string[]]>).map(([label, items]) => (
                <div key={label} className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1.5">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">{label}</span>
                  {items.length === 0 ? (
                    <p className="text-neutral-500">Sem itens.</p>
                  ) : (
                    <ul className="list-disc pl-4 space-y-1 text-neutral-300 leading-relaxed">
                      {items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-neutral-500">
              Análise gerada por IA{diagnostic.model ? ` (${diagnostic.model})` : ''}
              {diagnostic.analyzedAt ? ` em ${formatDateTimeBR(diagnostic.analyzedAt)}` : ''}. Trate como hipótese estratégica e valide com os dados.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-neutral-900/40 border border-neutral-800 rounded-xl space-y-3">
          <Sparkles className="w-8 h-8 text-neutral-500 mx-auto" />
          <h4 className="text-sm font-semibold text-neutral-300">Nenhum diagnóstico gerado ainda</h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Clique em "Gerar análise completa", copie o prompt, use na IA que preferir (ChatGPT, Gemini, Claude) e cole a resposta de volta aqui.
          </p>
        </div>
      )}
    </div>
  );
};
