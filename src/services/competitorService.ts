/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Competitor Service - Market Intelligence, Discovery & Objective Benchmarking
 * 
 * Strict rule: NEVER hardcode fake competitors.
 * Candidates require explicit discovery, criteria-based similarity, and manual approval.
 * Similarity score and metrics default to null until real evidence is verified.
 */

import { Client, Competitor, CompetitorStatus, ContentFormat } from '../types';
import { storageService } from './storageService';
import { logger } from '../utils/logger';
import { generateUUID } from '../utils/uuid';
import { apiClient, describeApiError } from './api/apiClient';

export interface CompetitorBenchmarkRow {
  name: string;
  instagram: string;
  isClient: boolean;
  followers: number | null;
  weeklyFrequency: number | null;
  avgViews: number | null;
  avgEngagementRate: number | null;
  topFormats: ContentFormat[];
  mainThemes: string[];
}

export interface CompetitorPatternInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  strategicImplication: string;
}

export const competitorService = {
  getAll(): Competitor[] {
    return storageService.competitors.getAll();
  },

  getByClient(clientId: string): Competitor[] {
    return storageService.competitors.getByClient(clientId);
  },

  getApprovedCompetitors(clientId: string): Competitor[] {
    return this.getByClient(clientId).filter(c => c.status === 'approved');
  },

  getCandidateCompetitors(clientId: string): Competitor[] {
    return this.getByClient(clientId).filter(c => c.status === 'candidate' || c.status === 'discovered');
  },

  addCompetitor(competitor: Omit<Competitor, 'id' | 'createdAt' | 'updatedAt'>): Competitor {
    return storageService.competitors.create(competitor);
  },

  updateCompetitor(id: string, updates: Partial<Competitor>): Competitor | null {
    return storageService.competitors.update(id, updates);
  },

  deleteCompetitor(id: string): boolean {
    return storageService.competitors.delete(id);
  },

  approveCandidate(id: string): void {
    this.updateCompetitor(id, { status: 'approved' });
  },

  rejectCandidate(id: string): void {
    this.updateCompetitor(id, { status: 'rejected' });
  },

  ignoreCandidate(id: string): void {
    this.updateCompetitor(id, { status: 'ignored' });
  },

  archiveCompetitor(id: string): void {
    this.updateCompetitor(id, { status: 'archived' });
  },

  generateBenchmarkTable(client: Client, clientFollowers: number | null = null, clientWeeklyFreq: number | null = null): CompetitorBenchmarkRow[] {
    const approved = this.getApprovedCompetitors(client.id);

    const clientRow: CompetitorBenchmarkRow = {
      name: `${client.name} (Cliente)`,
      instagram: client.instagram,
      isClient: true,
      followers: clientFollowers,
      weeklyFrequency: clientWeeklyFreq,
      avgViews: null,
      avgEngagementRate: null,
      topFormats: client.formats,
      mainThemes: client.pillars
    };

    const competitorRows: CompetitorBenchmarkRow[] = approved.map(c => ({
      name: c.name,
      instagram: c.instagram,
      isClient: false,
      followers: c.followers,
      weeklyFrequency: c.postingFrequencyWeekly,
      avgViews: c.avgViews,
      avgEngagementRate: c.avgEngagementRate,
      topFormats: c.topFormats,
      mainThemes: c.recentThemes
    }));

    return [clientRow, ...competitorRows];
  },

  detectCompetitorPatterns(competitors: Competitor[]): CompetitorPatternInsight[] {
    if (competitors.length === 0) return [];
    const insights: CompetitorPatternInsight[] = [];

    const formatsCount: Record<string, number> = {};
    competitors.forEach(c => {
      c.topFormats.forEach(f => {
        formatsCount[f] = (formatsCount[f] || 0) + 1;
      });
    });
    const dominantFormat = Object.entries(formatsCount).sort((a, b) => b[1] - a[1])[0];
    if (dominantFormat) {
      insights.push({
        id: `pat-${generateUUID()}`,
        type: 'FORMATO PREDOMINANTE',
        title: `Predomínio de ${dominantFormat[0]} no Nicho`,
        description: `${dominantFormat[1]} de ${competitors.length} concorrentes monitorados têm ${dominantFormat[0]} entre os formatos principais.`,
        strategicImplication: `Avaliar se ${dominantFormat[0]} merece mais espaço no calendário do cliente.`
      });
    }

    const freqList = competitors.map(c => c.postingFrequencyWeekly).filter((f): f is number => typeof f === 'number' && f > 0);
    if (freqList.length > 0) {
      const avgFreq = freqList.reduce((sum, f) => sum + f, 0) / freqList.length;
      insights.push({
        id: `pat-${generateUUID()}`,
        type: 'CADÊNCIA EDITORIAL',
        title: `Ritmo Médio de ${avgFreq.toFixed(1)} posts/semana`,
        description: 'Os concorrentes monitorados mantêm publicação regular para sustentar relevância perante o algoritmo.',
        strategicImplication: 'Manter frequência mínima com calendário estruturado e consistente.'
      });
    }

    const allThemes = competitors.flatMap(c => c.recentThemes);
    if (allThemes.length > 0) {
      insights.push({
        id: `pat-${generateUUID()}`,
        type: 'TEMAS EM ALTA',
        title: 'Temas recorrentes observados',
        description: `Pautas frequentes observadas: ${allThemes.slice(0, 3).join(', ')}.`,
        strategicImplication: 'Abordar estes temas com ângulo mais técnico e autoral para se diferenciar.'
      });
    }

    return insights;
  },

  /**
   * Calculate similarity score based on explicit verified criteria
   * If insufficient data: returns null
   */
  calculateSimilarity(client: Client, candidate: Partial<Competitor>): { score: number | null; criteria: string[]; method: string } {
    const criteria: string[] = [];
    let score = 0;
    let criteriaCount = 0;

    if (candidate.segment && candidate.segment.toLowerCase() === client.segment.toLowerCase()) {
      score += 40;
      criteriaCount++;
      criteria.push(`Mesmo segmento de atuação (${client.segment}) [peso: 40%]`);
    }

    if (candidate.notes && client.city && candidate.notes.toLowerCase().includes(client.city.toLowerCase())) {
      score += 25;
      criteriaCount++;
      criteria.push(`Mesma praça geográfica (${client.city}) [peso: 25%]`);
    }

    if (candidate.topFormats && client.formats && candidate.topFormats.some(f => client.formats.includes(f))) {
      score += 20;
      criteriaCount++;
      criteria.push('Formatos prioritários coincidentes [peso: 20%]');
    }

    if (typeof candidate.followers === 'number' && candidate.followers > 0) {
      score += 15;
      criteriaCount++;
      criteria.push('Presença ativa no Instagram comprovada [peso: 15%]');
    }

    // If no verifiable criteria matched, similarity is null
    if (criteriaCount === 0) {
      return {
        score: null,
        criteria: ['Dados insuficientes para cálculo de similaridade'],
        method: 'INSUFFICIENT_DATA'
      };
    }

    return {
      score: Math.min(100, score),
      criteria,
      method: 'WEIGHTED_MULTI_CRITERIA_V1'
    };
  },

  /**
   * Descoberta de candidatos via backend. Sem provider configurado não inventa nada.
   * Candidatos vêm com fonte, URL, evidência e data; métricas desconhecidas = null.
   */
  async discoverCandidates(client: Client): Promise<{ configured: boolean; message?: string; added: Competitor[] }> {
    try {
      const res = await apiClient.post<{
        configured: boolean;
        message?: string;
        candidates: Array<{ name: string; instagram: string; source: string; sourceUrl: string; evidence: string | null; retrievedAt: string }>;
      }>('/api/research', { kind: 'competitors', clientId: client.id, segment: client.segment || client.name, city: client.city || undefined });
      if (!res.configured) return { configured: false, message: res.message || 'Pesquisa externa não configurada.', added: [] };
      const known = new Set(this.getByClient(client.id).map((c) => c.instagram.toLowerCase()));
      const own = client.instagram.toLowerCase();
      const added = res.candidates
        .filter((c) => !known.has(c.instagram.toLowerCase()) && c.instagram.toLowerCase() !== own)
        .map((c) =>
          this.addCompetitor({
            clientId: client.id,
            name: c.name,
            instagram: c.instagram,
            website: '',
            segment: client.segment,
            similarityScore: null,
            similarityCriteria: ['Dados insuficientes para cálculo de similaridade'],
            similarityMethod: 'INSUFFICIENT_DATA',
            followers: null,
            postingFrequencyWeekly: null,
            topFormats: [],
            avgViews: null,
            avgEngagementRate: null,
            recentThemes: [],
            notes: c.evidence ? `Evidência: ${c.evidence}` : '',
            status: 'candidate',
            candidateReason: `Encontrado em ${c.source} em ${new Date(c.retrievedAt).toLocaleDateString('pt-BR')}.`,
            evidenceUrl: c.sourceUrl
          })
        );
      return { configured: true, added };
    } catch (err) {
      logger.warn('Competitor discovery failed', { error: describeApiError(err) });
      throw err;
    }
  },

  async registerCandidate(
    client: Client,
    data: {
      name: string;
      instagram: string;
      website?: string;
      followers?: number | null;
      weeklyFrequency?: number | null;
      topFormats?: ContentFormat[];
      notes?: string;
      evidenceUrl?: string;
    }
  ): Promise<Competitor> {
    const { score, criteria, method } = this.calculateSimilarity(client, {
      segment: client.segment,
      topFormats: data.topFormats,
      followers: data.followers,
      notes: data.notes
    });

    return this.addCompetitor({
      clientId: client.id,
      name: data.name,
      instagram: data.instagram.startsWith('@') ? data.instagram : `@${data.instagram}`,
      website: data.website || '',
      segment: client.segment,
      similarityScore: score,
      similarityCriteria: criteria,
      similarityMethod: method,
      followers: data.followers ?? null,
      postingFrequencyWeekly: data.weeklyFrequency ?? null,
      topFormats: data.topFormats || [],
      avgViews: null,
      avgEngagementRate: null,
      recentThemes: [],
      notes: data.notes || '',
      status: 'candidate',
      candidateReason: `Candidato sugerido para o segmento ${client.segment}.`,
      evidenceUrl: data.evidenceUrl
    });
  }
};
