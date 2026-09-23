/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Competitor Service - Market Intelligence, Discovery & Objective Benchmarking
 * 
 * Strict rule: NEVER hardcode fake competitors (e.g. Thiago Esteves, L'Atelier).
 * Candidates require explicit discovery, criteria-based similarity, and manual approval.
 */

import { Client, Competitor, CompetitorStatus, ContentFormat } from '../types';
import { defaultStorageAdapter } from './storage/LocalStorageAdapter';
import { logger } from '../utils/logger';

export interface CompetitorBenchmarkRow {
  name: string;
  instagram: string;
  isClient: boolean;
  followers: number;
  weeklyFrequency: number;
  avgViews: number;
  avgEngagementRate: number;
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
  getStorageKey(): string {
    return 'gs_intel_competitors';
  },

  getAll(): Competitor[] {
    return defaultStorageAdapter.getCollection<Competitor>(this.getStorageKey());
  },

  getByClient(clientId: string): Competitor[] {
    return this.getAll().filter(c => c.clientId === clientId);
  },

  getApprovedCompetitors(clientId: string): Competitor[] {
    return this.getByClient(clientId).filter(c => c.status === 'approved');
  },

  getCandidateCompetitors(clientId: string): Competitor[] {
    return this.getByClient(clientId).filter(c => c.status === 'candidate');
  },

  addCompetitor(competitor: Omit<Competitor, 'id' | 'createdAt' | 'updatedAt'>): Competitor {
    const newItem: Competitor = {
      ...competitor,
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const all = this.getAll();
    defaultStorageAdapter.setCollection(this.getStorageKey(), [newItem, ...all]);
    logger.info(`Competitor added for client ${competitor.clientId}`, { id: newItem.id, name: newItem.name });
    return newItem;
  },

  updateCompetitor(id: string, updates: Partial<Competitor>): Competitor | null {
    const all = this.getAll();
    const index = all.findIndex(c => c.id === id);
    if (index === -1) return null;

    all[index] = {
      ...all[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    defaultStorageAdapter.setCollection(this.getStorageKey(), all);
    return all[index];
  },

  deleteCompetitor(id: string): boolean {
    const all = this.getAll();
    const filtered = all.filter(c => c.id !== id);
    if (filtered.length === all.length) return false;

    defaultStorageAdapter.setCollection(this.getStorageKey(), filtered);
    return true;
  },

  approveCandidate(id: string): void {
    this.updateCompetitor(id, { status: 'approved' });
  },

  ignoreCandidate(id: string): void {
    this.updateCompetitor(id, { status: 'ignored' });
  },

  /**
   * Objective comparison without declaring subjective winners
   */
  generateBenchmarkTable(client: Client, clientFollowers = 0, clientWeeklyFreq = 0): CompetitorBenchmarkRow[] {
    const approved = this.getApprovedCompetitors(client.id);

    const clientRow: CompetitorBenchmarkRow = {
      name: `${client.name} (Cliente)`,
      instagram: client.instagram,
      isClient: true,
      followers: clientFollowers,
      weeklyFrequency: clientWeeklyFreq,
      avgViews: 0,
      avgEngagementRate: 0,
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

  generateBenchmarkMatrix(client: Client, approvedCompetitors: Competitor[]): CompetitorBenchmarkRow[] {
    return this.generateBenchmarkTable(client);
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
        id: 'pat-1',
        type: 'FORMATO PREDOMINANTE',
        title: `Predomínio de ${dominantFormat[0]} no Nicho`,
        description: `${dominantFormat[1]} de ${competitors.length} concorrentes utilizam ${dominantFormat[0]} como principal alavanca de alcance.`,
        strategicImplication: `Priorizar ${dominantFormat[0]} com ganchos de alta retenção nos primeiros 3 segundos.`
      });
    }

    const avgFreq = competitors.reduce((sum, c) => sum + c.postingFrequencyWeekly, 0) / competitors.length;
    insights.push({
      id: 'pat-2',
      type: 'CADÊNCIA EDITORIAL',
      title: `Ritmo Médio de ${avgFreq.toFixed(1)} posts/semana`,
      description: `Os concorrentes mantêm publicação regular para sustentar relevância perante o algoritmo.`,
      strategicImplication: `Manter frequência mínima de 3 a 5 posts semanais com calendário estruturado.`
    });

    const allThemes = competitors.flatMap(c => c.recentThemes);
    if (allThemes.length > 0) {
      insights.push({
        id: 'pat-3',
        type: 'TEMAS EM ALTA',
        title: 'Foco em Solução de Dores e Prova Social',
        description: `Pautas frequentes observadas: ${allThemes.slice(0, 3).join(', ')}.`,
        strategicImplication: `Abordar estes temas com ângulo mais técnico e autoral para se diferenciar.`
      });
    }

    return insights;
  },

  async discoverCandidateCompetitors(client: Client): Promise<Competitor[]> {
    return this.getCandidateCompetitors(client.id);
  },

  /**
   * Calculate similarity score based on verifiable criteria (Segment, Geography, Persona, Formats)
   */
  calculateSimilarity(client: Client, candidate: Partial<Competitor>): { score: number; criteria: string[] } {
    const criteria: string[] = [];
    let score = 0;

    if (candidate.segment && candidate.segment.toLowerCase() === client.segment.toLowerCase()) {
      score += 40;
      criteria.push(`Mesmo segmento de atuação (${client.segment})`);
    }

    if (candidate.notes && client.city && candidate.notes.toLowerCase().includes(client.city.toLowerCase())) {
      score += 30;
      criteria.push(`Mesma praça geográfica (${client.city})`);
    }

    if (candidate.topFormats && client.formats && candidate.topFormats.some(f => client.formats.includes(f))) {
      score += 15;
      criteria.push('Formatos prioritários coincidentes');
    }

    if (candidate.followers && candidate.followers > 0) {
      score += 15;
      criteria.push('Presença ativa no Instagram comprovada');
    }

    return { score, criteria };
  },

  /**
   * Candidate discovery from user input or verified market search
   */
  async registerCandidate(
    client: Client,
    data: {
      name: string;
      instagram: string;
      website?: string;
      followers?: number;
      weeklyFrequency?: number;
      topFormats?: ContentFormat[];
      notes?: string;
      evidenceUrl?: string;
    }
  ): Promise<Competitor> {
    const { score, criteria } = this.calculateSimilarity(client, {
      segment: client.segment,
      topFormats: data.topFormats,
      followers: data.followers || 0,
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
      followers: data.followers || 0,
      postingFrequencyWeekly: data.weeklyFrequency || 0,
      topFormats: data.topFormats || ['Reels', 'Carrossel'],
      avgViews: 0,
      avgEngagementRate: 0,
      recentThemes: [],
      notes: data.notes || '',
      status: 'candidate',
      candidateReason: `Candidato sugerido para o segmento ${client.segment}.`,
      evidenceUrl: data.evidenceUrl
    });
  }
};
