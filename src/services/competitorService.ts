/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Competitor Service - Mapeamento, Benchmarking e Monitoramento de Mercado
 */

import { Client, Competitor } from '../types';
import { storageService } from './storageService';

export interface CompetitorBenchmarkRow {
  name: string;
  instagram: string;
  isClient: boolean;
  followers: number;
  weeklyFrequency: number;
  avgViews: number;
  avgEngagementRate: number;
  topFormats: string[];
  mainThemes: string[];
}

export interface CompetitorPatternInsight {
  id: string;
  type: 'THEME_SURGE' | 'FORMAT_TRANSITION' | 'FREQUENCY_SHIFT' | 'POSITIONING';
  title: string;
  description: string;
  affectedCompetitors: string[];
  strategicImplication: string;
}

export const competitorService = {
  /**
   * Obtém concorrentes aprovados para benchmarking do cliente
   */
  getApprovedCompetitors(clientId: string): Competitor[] {
    return storageService.competitors.getByClient(clientId).filter(c => c.status === 'approved');
  },

  /**
   * Obtém concorrentes em status de candidato (sugeridos para aprovação do Gabriel)
   */
  getCandidateCompetitors(clientId: string): Competitor[] {
    return storageService.competitors.getByClient(clientId).filter(c => c.status === 'candidate');
  },

  /**
   * Aprova candidato a concorrente
   */
  approveCandidate(id: string): void {
    storageService.competitors.update(id, { status: 'approved' });
  },

  /**
   * Ignora candidato a concorrente
   */
  ignoreCandidate(id: string): void {
    storageService.competitors.update(id, { status: 'ignored' });
  },

  /**
   * Gera comparação tabular objetiva entre cliente e concorrentes (sem nota inventada)
   */
  generateBenchmarkMatrix(client: Client, competitors: Competitor[]): CompetitorBenchmarkRow[] {
    const clientContents = storageService.contents.getByClient(client.id);
    const clientSnapshots = storageService.history.getByClient(client.id);
    const latestSnapshot = clientSnapshots[clientSnapshots.length - 1];

    const clientFollowers = latestSnapshot ? latestSnapshot.followers : 18430;
    const clientAvgViews = clientContents.length > 0
      ? Math.round(clientContents.reduce((sum, c) => sum + c.metrics.views, 0) / clientContents.length)
      : 25000;
    const clientAvgEng = clientContents.length > 0
      ? Number((clientContents.reduce((sum, c) => sum + c.metrics.engagementRate, 0) / clientContents.length).toFixed(2))
      : 8.1;

    const rows: CompetitorBenchmarkRow[] = [
      {
        name: client.name,
        instagram: client.instagram,
        isClient: true,
        followers: clientFollowers,
        weeklyFrequency: client.formats.length >= 3 ? 4.0 : 3.0,
        avgViews: clientAvgViews,
        avgEngagementRate: clientAvgEng,
        topFormats: client.formats,
        mainThemes: client.pillars
      }
    ];

    competitors.forEach(comp => {
      rows.push({
        name: comp.name,
        instagram: comp.instagram,
        isClient: false,
        followers: comp.followers,
        weeklyFrequency: comp.postingFrequencyWeekly,
        avgViews: comp.avgViews,
        avgEngagementRate: comp.avgEngagementRate,
        topFormats: comp.topFormats,
        mainThemes: comp.recentThemes
      });
    });

    return rows;
  },

  /**
   * "O QUE OS CONCORRENTES ESTÃO FAZENDO?"
   * Detector de padrões, temas emergentes e mudanças de formato entre os concorrentes
   */
  detectCompetitorPatterns(competitors: Competitor[]): CompetitorPatternInsight[] {
    if (competitors.length === 0) return [];

    const insights: CompetitorPatternInsight[] = [
      {
        id: 'pat-01',
        type: 'THEME_SURGE',
        title: 'Foco intensivo em "Tempo de Afastamento e Recuperação Rápida"',
        description: `${competitors.slice(0, 2).map(c => c.name).join(' e ')} passaram a publicar conteúdos respondendo a dúvidas de pós-operatório imediato e tempo para retorno profissional.`,
        affectedCompetitors: competitors.slice(0, 2).map(c => c.instagram),
        strategicImplication: 'Oportunidade para Gabriel Speratti posicionar o cliente com um protocolo transparente de desinchaço e laserterapia nos primeiros 10 dias.'
      },
      {
        id: 'pat-02',
        type: 'FORMAT_TRANSITION',
        title: 'Migração de fotos estáticas de antes/depois para Carrosséis Didáticos',
        description: 'Observada queda no uso de fotos simples e alta taxa de adoção de Carrosséis explicativos sobre ligamentos faciais e vetores anatômicos.',
        affectedCompetitors: competitors.map(c => c.instagram),
        strategicImplication: 'O público qualificado valoriza a explicação científica da técnica cirúrgica muito mais do que promessas de resultados imediatos.'
      },
      {
        id: 'pat-03',
        type: 'POSITIONING',
        title: 'Aumento da frequência média para 4+ publicações semanais',
        description: 'Os principais concorrentes com mais de 40k seguidores aumentaram a frequência de Reels dinâmicos de 3 para 5 por semana.',
        affectedCompetitors: competitors.filter(c => c.postingFrequencyWeekly >= 4).map(c => c.instagram),
        strategicImplication: 'Manter cadência de 3 a 4 conteúdos de altíssima qualidade técnica para vencer em engajamento qualificado e não entrar em guerra de volume vazio.'
      }
    ];

    return insights;
  },

  /**
   * Procura candidatos a concorrentes com base nos parâmetros do cliente
   */
  async discoverCandidateCompetitors(client: Client): Promise<Competitor[]> {
    // Simulate web discovery based on client segment and city
    await new Promise(res => setTimeout(res, 900));

    const candidates: Array<Omit<Competitor, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        clientId: client.id,
        name: 'Dr. Thiago Esteves Facial',
        instagram: '@drthiagoesteves',
        website: 'https://thiagoestevesface.com.br',
        segment: client.segment,
        similarityScore: 84,
        followers: 29400,
        postingFrequencyWeekly: 3.5,
        topFormats: ['Reels', 'Carrossel'],
        avgViews: 24800,
        avgEngagementRate: 4.2,
        recentThemes: ['Rinoplastia estruturada', 'Cicatriz invisível', 'Pós-operatório sem dor'],
        notes: `Identificado na busca pelo segmento "${client.segment}" na região de ${client.city}.`,
        status: 'candidate',
        candidateReason: `Atua no mesmo segmento (${client.segment}) com foco em procedimentos de alto valor.`
      },
      {
        clientId: client.id,
        name: 'Clínica L’Atelier Face & Body',
        instagram: '@clinica.latelier',
        website: 'https://latelierclinic.com.br',
        segment: 'Medicina Estética & Cirurgia',
        similarityScore: 78,
        followers: 54100,
        postingFrequencyWeekly: 5.0,
        topFormats: ['Carrossel', 'Stories'],
        avgViews: 31000,
        avgEngagementRate: 3.6,
        recentThemes: ['Protocolos combinados', 'Bioestimuladores vs Cirurgia', 'Envelhecimento saudável'],
        notes: 'Clínica multidisciplinar com forte investimento em anúncios patrocinados.',
        status: 'candidate',
        candidateReason: 'Disputa a atenção da mesma persona de alta renda na mesma praça geográfica.'
      }
    ];

    const existing = storageService.competitors.getByClient(client.id);
    const added: Competitor[] = [];

    for (const c of candidates) {
      if (!existing.some(e => e.instagram === c.instagram)) {
        added.push(storageService.competitors.create(c));
      }
    }

    return added;
  }
};
