/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * AI Service — regras determinísticas locais. A análise por IA é feita pelo fluxo
 * manual (src/ai/manualPrompts.ts): prompt copiado para uma IA externa e resposta importada.
 */

import { Client, Content, ContentAiAnalysis, AudienceInsight, Competitor, AccountSnapshot } from '../types';
import { storageService } from './storageService';
import { formatMetric, isMetric, medianMetric } from '../utils/metrics';
import type { ProfileDiagnosticResponse } from '../schemas/aiSchemas';

export type ProfileDiagnosticResult = ProfileDiagnosticResponse & { analyzedAt?: string; model?: string };

export interface IdeaGenerationPromptContext {
  client: Client;
  topContents: Content[];
  audienceInsights: AudienceInsight[];
  competitors: Competitor[];
}


export const aiService = {
  /**
   * Leitura determinística (não é IA) de um conteúdo comparado à mediana da conta.
   * Só usa métricas disponíveis; se faltarem dados, diz isso explicitamente.
   */
  classifyContent(content: Content, _client: Client, allClientContents: Content[] = []): ContentAiAnalysis {
    const medianSaves = medianMetric(allClientContents.map((c) => c.metrics.saves));
    const medianShares = medianMetric(allClientContents.map((c) => c.metrics.shares));
    const saves = content.metrics.saves;
    const shares = content.metrics.shares;
    const aboveSaves = isMetric(saves) && isMetric(medianSaves) && saves > 0 && saves >= medianSaves;
    const aboveShares = isMetric(shares) && isMetric(medianShares) && shares > 0 && shares >= medianShares;
    const hasData = isMetric(saves) || isMetric(shares);

    return {
      summary: `Leitura comparativa de "${content.title}" (${content.format}), pilar ${content.pillar}.`,
      whyItWorked:
        aboveSaves || aboveShares
          ? `Acima da mediana da conta (salvamentos ${formatMetric(saves)} vs ${formatMetric(medianSaves)}; compartilhamentos ${formatMetric(shares)} vs ${formatMetric(medianShares)}).`
          : undefined,
      whyItMayHaveUnderperformed:
        hasData && !aboveSaves && !aboveShares && allClientContents.length > 3
          ? `Abaixo da mediana de salvamentos da conta (${formatMetric(medianSaves)}).`
          : undefined,
      strengths: aboveSaves ? ['Salvamentos acima da mediana da conta'] : [],
      weaknesses: hasData && !aboveShares ? ['Compartilhamentos abaixo da mediana da conta'] : [],
      opportunity: hasData ? 'Testar o mesmo tema em outro formato e comparar o resultado.' : 'Sincronize os insights da Meta para habilitar a comparação.',
      hypothesisNote: 'Cálculo determinístico sobre métricas reais; não é uma inferência de IA.',
      isHypothesis: true,
      confidence: hasData && allClientContents.length >= 5 ? 'MEDIUM' : 'LOW',
      evidence: [
        `Formato: ${content.format}`,
        `Alcance: ${formatMetric(content.metrics.reach)}`,
        `Salvamentos: ${formatMetric(saves)}`,
        `Compartilhamentos: ${formatMetric(shares)}`
      ]
    };
  },

  /** Próximas ações determinísticas (regras sobre o estado real do workspace). */
  generateNextActions(client: Client, contents: Content[], _snapshots?: AccountSnapshot[]): string[] {
    const actions: string[] = [];
    const account = storageService.instagram.getByClientId(client.id);
    if (!account?.isConnected) {
      actions.push('Conectar o Instagram do cliente para sincronizar métricas reais.');
    }
    if (contents.length < 5) {
      actions.push('Sincronizar ou catalogar as primeiras publicações para criar a base de comparação.');
    }
    if (client.pillars.length === 0) {
      actions.push('Definir os pilares editoriais no cadastro do cliente.');
    }
    if (client.pillars[0]) {
      actions.push(`Planejar conteúdos para o pilar ${client.pillars[0]} com foco na dor principal da persona.`);
    }
    actions.push('Revisar o calendário semanal e confirmar a frequência combinada.');
    return actions.slice(0, 4);
  }
};
