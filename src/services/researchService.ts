/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Research Service & Audience Intelligence Provider
 * 
 * Strict rule: Never pretend verification. Only mark isHypothesis: false when
 * real URL / evidence snippet is attached. If external search is unconfigured,
 * state it explicitly instead of fabricating results.
 */

import { AudienceInsight, AudienceInsightCategory, Client } from '../types';
import { storageService } from './storageService';
import { apiClient, describeApiError } from './api/apiClient';
import { logger } from '../utils/logger';

export const AUDIENCE_CATEGORIES: AudienceInsightCategory[] = [
  'Dores',
  'Desejos',
  'Medos',
  'Objeções',
  'Dúvidas',
  'Perguntas Frequentes',
  'Interesses',
  'Tendências',
  'Oportunidades'
];

export interface ResearchResultItem {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceType: 'search_engine' | 'social_media' | 'scientific_article' | 'industry_report' | 'user_feedback';
  publishedAt: string;
  retrievedAt: string;
  snippet: string;
  evidence: string;
  query: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ResearchProvider {
  search(query: string, category: AudienceInsightCategory): Promise<{
    configured: boolean;
    message?: string;
    items: ResearchResultItem[];
  }>;
}

export const researchService = {
  getAll(): AudienceInsight[] {
    return storageService.audience.getAll();
  },

  getByClient(clientId: string, categoryFilter?: AudienceInsightCategory): AudienceInsight[] {
    const all = storageService.audience.getByClient(clientId);
    if (!categoryFilter) return all;
    return all.filter(item => item.category === categoryFilter);
  },

  addInsight(insight: Omit<AudienceInsight, 'id' | 'createdAt'>): AudienceInsight {
    return storageService.audience.create(insight);
  },

  updateInsight(id: string, updates: Partial<AudienceInsight>): AudienceInsight | null {
    const all = this.getAll();
    const index = all.findIndex(i => i.id === id);
    if (index === -1) return null;

    const merged = { ...all[index], ...updates };
    // update through storage
    storageService.audience.delete(id);
    return storageService.audience.create(merged);
  },

  removeInsight(id: string): boolean {
    return storageService.audience.delete(id);
  },

  /**
   * Pesquisa externa real via backend (/api/research). Sem provider configurado,
   * retorna configured=false e nenhum dado é inventado. Fontes encontradas são
   * salvas como HIPÓTESE (confiança baixa) com URL, trecho e data de coleta.
   */
  async runAudienceDiscovery(client: Client, targetCategory: AudienceInsightCategory = 'Dores'): Promise<{
    success: boolean;
    configured: boolean;
    message?: string;
    newInsights: AudienceInsight[];
  }> {
    try {
      const res = await apiClient.post<{
        configured: boolean;
        message?: string;
        sources: Array<{ title: string; sourceUrl: string; source: string; evidence: string | null; publishedAt: string | null; retrievedAt: string }>;
      }>('/api/research', { kind: 'audience', clientId: client.id, segment: client.segment || client.name, category: targetCategory });

      if (!res.configured) {
        return { success: true, configured: false, message: res.message || 'Pesquisa externa não configurada.', newInsights: [] };
      }
      const known = new Set(this.getByClient(client.id).map((i) => i.sourceUrl).filter(Boolean));
      const newInsights = res.sources
        .filter((src) => !known.has(src.sourceUrl))
        .map((src) =>
          this.addInsight({
            clientId: client.id,
            category: targetCategory,
            title: src.title.slice(0, 200),
            description: src.evidence || 'Trecho não disponível na fonte.',
            source: src.source,
            sourceUrl: src.sourceUrl,
            sourceDate: src.publishedAt || src.retrievedAt,
            evidence: src.evidence || undefined,
            context: `Coletado em ${new Date(src.retrievedAt).toLocaleString('pt-BR')}`,
            interpretation: 'Fonte pública ainda não validada pela equipe.',
            isHypothesis: true,
            confidence: 'LOW'
          })
        );
      return { success: true, configured: true, newInsights };
    } catch (err) {
      logger.warn('Audience discovery API query failed', { error: describeApiError(err) });
      return { success: false, configured: true, message: describeApiError(err, 'Falha ao consultar a pesquisa externa.'), newInsights: [] };
    }
  },

  /**
   * Registers a verified fact or hypothesis from internal strategist analysis
   */
  registerInsight(
    client: Client,
    data: {
      category: AudienceInsightCategory;
      title: string;
      description: string;
      interpretation: string;
      isHypothesis: boolean;
      confidence: 'LOW' | 'MEDIUM' | 'HIGH';
      source: string;
      sourceUrl?: string;
      evidence?: string;
    }
  ): AudienceInsight {
    return this.addInsight({
      clientId: client.id,
      category: data.category,
      title: data.title,
      description: data.description,
      interpretation: data.interpretation,
      isHypothesis: data.isHypothesis,
      confidence: data.confidence,
      source: data.source,
      sourceUrl: data.sourceUrl,
      sourceDate: new Date().toISOString(),
      evidence: data.evidence
    });
  }
};
