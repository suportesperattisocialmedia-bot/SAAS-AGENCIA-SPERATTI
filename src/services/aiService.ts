/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * AI Service — todas as chamadas de IA passam pelo backend (/api/ai/*).
 *
 * Regra: se a IA falhar ou não estiver configurada, o erro é mostrado ao usuário.
 * Não existe mais "diagnóstico de fallback" que se passa por análise de IA.
 * A classificação local de conteúdo é explicitamente rotulada como cálculo determinístico.
 */

import {
  Client,
  Content,
  ContentAiAnalysis,
  ContentIdea,
  AudienceInsight,
  Competitor,
  AccountSnapshot
} from '../types';
import { apiClient } from './api/apiClient';
import { storageService } from './storageService';
import { clientProfile } from './sessionService';
import { logger } from '../utils/logger';
import { generateUUID } from '../utils/uuid';
import { avgMetric, formatMetric, isMetric, medianMetric } from '../utils/metrics';
import type { ProfileDiagnosticResponse, IdeaGenerationResponse } from '../schemas/aiSchemas';

export type ProfileDiagnosticResult = ProfileDiagnosticResponse & { analyzedAt?: string; model?: string };

export interface IdeaGenerationPromptContext {
  client: Client;
  topContents: Content[];
  audienceInsights: AudienceInsight[];
  competitors: Competitor[];
}

interface AiMetadata {
  model: string;
  promptVersion: string;
  requestId: string;
}

export const aiService = {
  /** Diagnóstico estratégico do perfil via Gemini (backend). Lança erro em caso de falha. */
  async analyzeProfile(client: Client, contents: Content[], snapshots: AccountSnapshot[]): Promise<ProfileDiagnosticResult> {
    const latestFollowers = [...snapshots].reverse().find((s) => isMetric(s.followers))?.followers ?? null;
    const topFormats = Array.from(new Set(contents.map((c) => c.format)));

    logger.info(`Analyzing profile for client ${client.name}...`);
    const response = await apiClient.post<{ diagnostic: ProfileDiagnosticResponse; metadata: AiMetadata & { analyzedAt: string } }>(
      '/api/ai/analyze-profile',
      {
        clientId: client.id,
        client: clientProfile(client),
        contentsCount: contents.length,
        latestFollowers,
        avgViews: avgMetric(contents.map((c) => c.metrics.views)),
        avgEngagementRate: avgMetric(contents.map((c) => c.metrics.engagementRate), 2),
        topFormats
      },
      { timeoutMs: 60000 }
    );

    const result: ProfileDiagnosticResult = { ...response.diagnostic, analyzedAt: response.metadata.analyzedAt, model: response.metadata.model };
    storageService.aiAnalyses.create({
      clientId: client.id,
      analysisType: 'PROFILE_DIAGNOSTIC',
      model: response.metadata.model,
      promptVersion: response.metadata.promptVersion,
      inputDataHash: `req:${response.metadata.requestId}`,
      output: result,
      confidence: 'MEDIUM',
      sourceDataIds: contents.map((c) => c.id).slice(0, 10)
    });
    return result;
  },

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

  /** Geração de ideias via Gemini (backend). Lança erro em caso de falha. */
  async generateIdeas(context: IdeaGenerationPromptContext, count = 3): Promise<ContentIdea[]> {
    const { client, audienceInsights, topContents } = context;
    const res = await apiClient.post<{ ideas: IdeaGenerationResponse; metadata: AiMetadata }>(
      '/api/ai/generate-ideas',
      {
        clientId: client.id,
        client: clientProfile(client),
        audienceInsights: audienceInsights.slice(0, 50).map((a) => ({ title: a.title, category: a.category })),
        topThemes: Array.from(new Set(topContents.map((c) => c.pillar))).slice(0, 30),
        count
      },
      { timeoutMs: 60000 }
    );

    const now = new Date().toISOString();
    const ideas: ContentIdea[] = res.ideas.map((idea) => ({
      ...idea,
      source: idea.source || `IA (${res.metadata.model})`,
      id: `idea-${generateUUID()}`,
      clientId: client.id,
      status: 'IDEIA',
      notes: '',
      createdAt: now,
      updatedAt: now
    }));

    storageService.aiAnalyses.create({
      clientId: client.id,
      analysisType: 'IDEA_GENERATION',
      model: res.metadata.model,
      promptVersion: res.metadata.promptVersion,
      inputDataHash: `req:${res.metadata.requestId}`,
      output: ideas,
      confidence: 'MEDIUM',
      sourceDataIds: audienceInsights.map((a) => a.id)
    });
    return ideas;
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
