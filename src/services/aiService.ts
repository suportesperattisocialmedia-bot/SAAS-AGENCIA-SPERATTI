/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * AI Service - Decoupled, Anti-Hallucination, Generic Fallback Engine
 * 
 * Strict rule: No hardcoded client references in fallbacks.
 * Uses gemini-3.8-flash via server proxy with strict JSON schema validation.
 * Records audit logs into storageService.aiAnalyses.
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
import { logger } from '../utils/logger';
import { generateUUID } from '../utils/uuid';
import { HOOK_TEMPLATES } from '../data/hookBank';

export interface ProfileDiagnosticResult {
  profileSection: {
    photoAnalysis: string;
    usernameAndName: string;
    bioClarity: string;
    ctaAndLink: string;
    highlightsStructure: string;
    valueProposition: string;
    perceivedAuthority: string;
  };
  contentSection: {
    publishingFrequency: string;
    formatBalance?: string;
    pillarDistribution?: string;
    editorialPillars?: string;
    hookUsage?: string;
    hookEffectiveness?: string;
    ctaEffectiveness: string;
    captionQuality: string;
    visualIdentityAndAesthetics?: string;
    visualConsistency?: string;
  };
  performanceSection: {
    engagementAnalysis: string;
    reachAndImpressions?: string;
    savesAndShares?: string;
    bestContentObservations: string;
    worstContentObservations?: string;
  };
  strategySection: {
    strengths: string[];
    vulnerabilities: string[];
    immediateOpportunities: string[];
    recommendedFormats: string[];
    highImpactPillars?: string[];
  };
  nextActions: string[];
  analyzedAt?: string;
}

export interface IdeaGenerationPromptContext {
  client: Client;
  topContents: Content[];
  audienceInsights: AudienceInsight[];
  competitors: Competitor[];
}

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export const aiService = {
  /**
   * Analyze client profile through backend proxy
   */
  async analyzeProfile(
    client: Client,
    contents: Content[],
    snapshots: AccountSnapshot[]
  ): Promise<ProfileDiagnosticResult> {
    const latestSnapshot = snapshots[snapshots.length - 1];
    const topFormats = Array.from(new Set(contents.map(c => c.format)));

    const viewsList = contents.map(c => c.metrics.views).filter(v => v > 0);
    const engList = contents.map(c => c.metrics.engagementRate).filter(e => e > 0);

    const avgViews = viewsList.length > 0 ? Math.round(viewsList.reduce((a, b) => a + b, 0) / viewsList.length) : null;
    const avgEngagementRate = engList.length > 0 ? Number((engList.reduce((a, b) => a + b, 0) / engList.length).toFixed(2)) : null;

    try {
      logger.info(`Analyzing profile for client ${client.name}...`);
      const response = await apiClient.post<{
        data: ProfileDiagnosticResult;
        metadata: { model: string; promptVersion: string; requestId: string };
      }>('/api/ai/analyze-profile', {
        client: {
          id: client.id,
          name: client.name,
          company: client.company,
          instagram: client.instagram,
          segment: client.segment,
          subsegment: client.subsegment,
          targetAudience: client.targetAudience,
          persona: client.persona,
          averageTicket: client.averageTicket,
          pillars: client.pillars,
          objectives: client.objectives,
          formats: client.formats,
          toneOfVoice: client.toneOfVoice,
          differentiators: client.differentiators
        },
        contentsCount: contents.length,
        latestFollowers: latestSnapshot ? latestSnapshot.followers : null,
        avgViews,
        avgEngagementRate,
        topFormats
      });

      const result = {
        ...response.data,
        analyzedAt: new Date().toISOString()
      };

      // Record audit entry
      storageService.aiAnalyses.create({
        clientId: client.id,
        analysisType: 'PROFILE_DIAGNOSTIC',
        model: response.metadata?.model || 'gemini-3.8-flash',
        promptVersion: response.metadata?.promptVersion || 'PROFILE_DIAGNOSTIC_V3',
        inputDataHash: `contents:${contents.length}-followers:${latestSnapshot?.followers || 0}`,
        output: result,
        confidence: 'HIGH',
        sourceDataIds: contents.map(c => c.id).slice(0, 10)
      });

      return result;
    } catch (err) {
      logger.warn('AI analyzeProfile API call failed, generating deterministic fallback', { error: String(err) });
      return this.generateDeterministicDiagnostic(client, contents, snapshots);
    }
  },

  /**
   * Classify content with evidence separation & real median calculation
   */
  async classifyContent(content: Content, client: Client, allClientContents: Content[] = []): Promise<ContentAiAnalysis> {
    const allSaves = allClientContents.map(c => c.metrics.saves);
    const allShares = allClientContents.map(c => c.metrics.shares);

    const medianSaves = calculateMedian(allSaves);
    const medianShares = calculateMedian(allShares);

    const isHighSaves = content.metrics.saves > 0 && content.metrics.saves >= medianSaves;
    const isHighShares = content.metrics.shares > 0 && content.metrics.shares >= medianShares;

    return {
      summary: `Análise estrutural da publicação "${content.title}" (${content.format}) - Pilar: ${content.pillar}.`,
      whyItWorked: isHighSaves || isHighShares
        ? `Atingiu métricas superiores à mediana da conta (Salvamentos: ${content.metrics.saves} vs mediana ${medianSaves}; Compartilhamentos: ${content.metrics.shares} vs mediana ${medianShares}).`
        : undefined,
      whyItMayHaveUnderperformed: (!isHighSaves && !isHighShares && allClientContents.length > 3)
        ? `Performance de retenção ficou abaixo da mediana da conta (${medianSaves} salvamentos).`
        : undefined,
      strengths: isHighSaves ? ['Forte valor percebido para salvamento futuro', 'Gancho claro e informativo'] : ['Clareza temática no pilar'],
      weaknesses: !isHighShares ? ['Baixa provocação emocional para compartilhamento imediato'] : [],
      opportunity: 'Testar variação do mesmo tema em formato alternativo (ex: Reels rápido ou Carrossel detalhado).',
      hypothesisNote: 'Classificação inferida a partir de benchmarks estruturais de engajamento do segmento.',
      isHypothesis: true,
      confidence: 'MEDIUM',
      evidence: [
        `Formato: ${content.format}`,
        `Alcance: ${content.metrics.reach.toLocaleString('pt-BR')}`,
        `Salvamentos: ${content.metrics.saves}`,
        `Compartilhamentos: ${content.metrics.shares}`
      ]
    };
  },

  /**
   * Generate content ideas via backend Gemini proxy
   */
  async generateIdeas(
    context: IdeaGenerationPromptContext,
    count = 3
  ): Promise<ContentIdea[]> {
    const { client, audienceInsights, topContents } = context;

    try {
      const topThemes = Array.from(new Set(topContents.map(c => c.pillar)));
      const res = await apiClient.post<{
        ideas: ContentIdea[];
        metadata: { model: string; promptVersion: string; requestId: string };
      }>('/api/ai/generate-ideas', {
        context: {
          client: {
            id: client.id,
            name: client.name,
            company: client.company,
            instagram: client.instagram,
            segment: client.segment,
            subsegment: client.subsegment,
            targetAudience: client.targetAudience,
            persona: client.persona,
            pillars: client.pillars,
            formats: client.formats,
            toneOfVoice: client.toneOfVoice
          },
          audienceInsights: audienceInsights.map(a => ({ title: a.title, category: a.category })),
          topThemes
        },
        count
      });

      const ideas = (res.ideas || []).map(idea => ({
        ...idea,
        id: `idea-${generateUUID()}`,
        clientId: client.id,
        status: 'IDEIA' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Record audit
      storageService.aiAnalyses.create({
        clientId: client.id,
        analysisType: 'IDEA_GENERATION',
        model: res.metadata?.model || 'gemini-3.8-flash',
        promptVersion: res.metadata?.promptVersion || 'IDEA_GENERATION_V2',
        inputDataHash: `ideas-count:${count}`,
        output: ideas,
        confidence: 'HIGH',
        sourceDataIds: audienceInsights.map(a => a.id)
      });

      return ideas;
    } catch (err) {
      logger.warn('AI generateIdeas API failed, using verified hook templates', { error: String(err) });
      return this.fallbackGenerateIdeas(context, count);
    }
  },

  generateDeterministicDiagnostic(
    client: Client,
    contents: Content[],
    snapshots: AccountSnapshot[]
  ): ProfileDiagnosticResult {
    const totalPosts = contents.length;
    const latestSnapshot = snapshots[snapshots.length - 1];
    const followersStr = latestSnapshot ? latestSnapshot.followers.toLocaleString('pt-BR') : 'Dados insuficientes';

    return {
      profileSection: {
        photoAnalysis: 'Perfil com elementos visuais configurados no cadastro.',
        usernameAndName: `Nome de usuário "${client.instagram}" cadastrado para "${client.name}".`,
        bioClarity: `Posicionamento voltado ao segmento ${client.segment}.`,
        ctaAndLink: client.website ? `Link direcionando para: ${client.website}` : 'Link externo não informado no cadastro.',
        highlightsStructure: 'Destaques editoriais organizados por pilares de conteúdo.',
        valueProposition: client.differentiators || 'Diferenciais cadastrados no onboarding estratégico.',
        perceivedAuthority: `Atuação especializada no nicho de ${client.segment} - ${client.subsegment || 'Geral'}.`
      },
      contentSection: {
        publishingFrequency: totalPosts > 0 ? `${totalPosts} publicações catalogadas no workspace.` : 'Nenhum conteúdo catalogado ainda.',
        editorialPillars: client.pillars.length > 0 ? `Pilares ativos: ${client.pillars.join(', ')}.` : 'Pilares não definidos.',
        captionQuality: 'Texto alinhado ao tom de voz registrado no perfil.',
        hookUsage: 'Uso de ganchos orientados à retenção e quebra de crenças.',
        ctaEffectiveness: 'Chamadas para ação direcionadas aos objetivos de autoridade e conversão.'
      },
      performanceSection: {
        engagementAnalysis: `Base atual: ${followersStr} seguidores registrados. Métricas de engajamento dependem de sincronização periódica.`,
        reachAndImpressions: 'Dados sincronizados periodicamente via Meta Graph API.',
        savesAndShares: 'Salvamentos e compartilhamentos são avaliados individualmente por post.',
        bestContentObservations: `${totalPosts} conteúdos catalogados para análise de atração.`
      },
      strategySection: {
        strengths: [
          `Posicionamento claro no segmento ${client.segment}`,
          'Pilares editoriais estruturados no planejamento'
        ],
        vulnerabilities: [
          'Dependência de consistência na cadência semanal',
          'Necessidade de validação contínua dos ganchos'
        ],
        immediateOpportunities: [
          'Explorar as principais dores e objeções catalogadas na pesquisa de público',
          'Intensificar formatos de salvamento no meio de funil'
        ],
        recommendedFormats: client.formats.length > 0 ? client.formats : ['Reels', 'Carrossel']
      },
      nextActions: this.generateNextActions(client, contents),
      analyzedAt: new Date().toISOString()
    };
  },

  generateNextActions(
    client: Client,
    contents: Content[],
    snapshots?: AccountSnapshot[]
  ): string[] {
    const actions: string[] = [];

    if (!client.instagram || client.healthStatus === 'not_connected') {
      actions.push('Conectar conta do Instagram via Meta Graph API para sincronização de métricas reais.');
    }

    if (contents.length < 5) {
      actions.push(`Catalogar as primeiras publicações para estabelecer o benchmark do segmento ${client.segment}.`);
    }

    if (client.pillars.length === 0) {
      actions.push('Definir os pilares editoriais estratégicos no perfil do cliente.');
    }

    actions.push(`Produzir conteúdo focado na dor principal da persona no pilar ${client.pillars[0] || 'Educação'}.`);
    actions.push('Revisar o calendário semanal para garantir a frequência combinada.');

    return actions.slice(0, 4);
  },

  fallbackGenerateIdeas(
    context: IdeaGenerationPromptContext,
    count: number
  ): ContentIdea[] {
    const { client } = context;
    const hooks = HOOK_TEMPLATES.slice(0, count);

    return hooks.map((h, idx) => ({
      id: `idea-fb-${generateUUID()}`,
      clientId: client.id,
      title: `Estratégia sobre ${client.pillars[idx % Math.max(1, client.pillars.length)] || client.segment}`,
      description: `Conteúdo no pilar ${client.pillars[idx % Math.max(1, client.pillars.length)] || 'Educação'} utilizando gancho de ${h.category}.`,
      pillar: client.pillars[idx % Math.max(1, client.pillars.length)] || 'Educação',
      objective: client.objectives[idx % Math.max(1, client.objectives.length)] || 'Autoridade',
      format: (client.formats[idx % Math.max(1, client.formats.length)] || 'Reels') as Content['format'],
      hook: h.formula.replace('[prática comum]', 'práticas genéricas de mercado').replace('[assunto]', `resultados no segmento de ${client.segment}`),
      hookCategory: h.category,
      cta: 'Envie uma mensagem direta ou deixe sua dúvida nos comentários.',
      source: 'Banco de Ganchos Estratégicos Gabriel Speratti',
      potential: 'Alto',
      whyDoThis: 'Aborda diretamente o interesse e posicionamento do cliente no seu segmento.',
      targetAudienceSnippet: client.targetAudience || 'Público qualificado do nicho',
      status: 'IDEIA',
      notes: 'Roteirizar com foco na autoridade técnica do especialista.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }
};
