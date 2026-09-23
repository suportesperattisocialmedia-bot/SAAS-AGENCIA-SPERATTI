import React from 'react';
import { Client, Content, MetricSnapshot } from '../../types';
import { ProfileDiagnosticResult } from '../../services/aiService';
import {
  Sparkles,
  User,
  Layers,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
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
  contents,
  snapshots,
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
              INSIGHT DA IA
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
          <span>{isAnalyzing ? 'Executando Análise...' : 'Reanalisar Perfil Agora'}</span>
        </button>
      </div>

      {diagnostic ? (
        <div className="space-y-6">
          {/* Section 1: PERFIL */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
              <User className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold font-mono uppercase text-neutral-200 tracking-wider">
                01. Diagnóstico do Perfil e Apresentação
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Foto & Identidade Visual</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.profileSection.photoAnalysis}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Nome & Nome de Usuário</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.profileSection.usernameAndName}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Clareza da Bio</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.profileSection.bioClarity}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">CTA & Link da Bio</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.profileSection.ctaAndLink}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Estrutura de Destaques</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.profileSection.highlightsStructure}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Autoridade Percebida</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.profileSection.perceivedAuthority}</p>
              </div>
            </div>
          </div>

          {/* Section 2: CONTEÚDO */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Layers className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold font-mono uppercase text-neutral-200 tracking-wider">
                02. Diagnóstico de Conteúdo e Formatos
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Frequência de Postagem</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.contentSection.publishingFrequency}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Equilíbrio de Formatos</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.contentSection.formatBalance}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Eficácia dos Ganchos</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.contentSection.hookEffectiveness}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Qualidade das Legendas</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.contentSection.captionQuality}</p>
              </div>
            </div>
          </div>

          {/* Section 3: PERFORMANCE */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold font-mono uppercase text-neutral-200 tracking-wider">
                03. Diagnóstico de Performance Real
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Crescimento de Base</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.performanceSection.observedGrowth}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Qualidade do Engajamento</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.performanceSection.engagementQuality}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Taxa de Salvamento e Compartilhamento</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.performanceSection.saveAndShareRatio}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Média de Visualizações</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.performanceSection.topAudienceDraw}</p>
              </div>
            </div>
          </div>

          {/* Section 4: ESTRATÉGIA */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Target className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold font-mono uppercase text-neutral-200 tracking-wider">
                04. Estratégia de Posicionamento, Funil e Vendas
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Posicionamento de Autoridade</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.strategySection.authorityStatus}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Prontidão para Venda de Alto Ticket</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.strategySection.salesReadiness}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase">Equilíbrio de Funil</span>
                <p className="text-neutral-300 leading-relaxed">{diagnostic.strategySection.funnelBalance}</p>
              </div>

              <div className="p-3 bg-neutral-950/60 border border-amber-500/30 bg-amber-950/10 rounded-lg space-y-1">
                <span className="text-[10px] font-mono text-amber-400 uppercase font-semibold">Maior Oportunidade Identificada</span>
                <p className="text-amber-200 leading-relaxed">{diagnostic.strategySection.biggestOpportunity}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-neutral-900/40 border border-neutral-800 rounded-xl space-y-3">
          <Sparkles className="w-8 h-8 text-neutral-500 mx-auto" />
          <h4 className="text-sm font-semibold text-neutral-300">Nenhum diagnóstico gerado ainda</h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Clique no botão acima para iniciar a auditoria completa de perfil e conteúdo com a IA.
          </p>
        </div>
      )}
    </div>
  );
};
