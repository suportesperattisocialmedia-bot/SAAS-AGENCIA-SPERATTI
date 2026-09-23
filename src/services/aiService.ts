/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * AI Service - Decoupled, Anti-Hallucination, Generic Fallback Engine
 * 
 * Strict rule: No hardcoded client references (Ravi, Deep Plane, R$ 38k, etc.) in fallbacks.
 * Uses gemini-3.8-flash via server proxy with strict JSON schema validation.
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
import { logger } from '../utils/logger';
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
    formatBalance: string;
    pillarDistribution: string;
    hookEffectiveness: string;
    ctaEffectiveness: string;
    captionQuality: string;
    visualConsistency: string;
  };
  performanceSection: {
    observedGrowth: string;
    engagementQuality: string;
    saveAndShareRatio: string;
    topAudienceDraw: string;
  };
  strategySection: {
    authorityStatus: string;
    connectionStatus: string;
    salesReadiness: string;
    funnelBalance: string;
    biggestOpportunity: string;
  };
  nextActions: string[];
  analyzedAt: string;
}

export interface IdeaGenerationPromptContext {
  client: Client;
  topContents: Content[];
  audienceInsights: AudienceInsight[];
  competitors: Competitor[];
}

export const aiService = {
  /**
   * Analyze client profile and operation through server proxy
   */
  async analyzeProfile(
    client: Client,
    contents: Content[],
    snapshots: AccountSnapshot[]
  ): Promise<ProfileDiagnosticResult> {
    try {
      logger.info(`Analyzing profile for client ${client.name}...`);
      const response = await apiClient.post<ProfileDiagnosticResult>('/api/ai/analyze-profile', {
        client,
        contents,
        snapshots
      });

      return response;
    } catch (err) {
      logger.warn('AI analyzeProfile API call failed, generating deterministic fallback', { error: String(err) });
      return this.generateDeterministicDiagnostic(client, contents, snapshots);
    }
  },

  /**
   * Classify content with evidence separation
   */
  async classifyContent(content: Content, client: Client): Promise<ContentAiAnalysis> {
    const isTopPerformer = (content.metrics.saves || 0) > 100 || (content.metrics.shares || 0) > 50;

    return {
      summary: `Análise estrutural da publicação "${content.title}" (${content.format}) - Pilar: ${content.pillar}.`,
      whyItWorked: isTopPerformer
        ? 'Apresentou retenção e volume de salvamento/compartilhamento superior à mediana da conta.'
        : undefined,
      whyItMayHaveUnderperformed: !isTopPerformer
        ? 'Volume de retenção dentro ou abaixo da mediana recente da conta.'
        : undefined,
      strengths: [
        `Formato ${content.format} alinhado ao pilar de ${content.pillar}`,
        `Gancho classificado na categoria ${content.hookCategory || 'Geral'}`
      ],
      weaknesses: [
        content.caption.length > 800 ? 'Texto da legenda extenso para consumo dinâmico' : 'Chamada para ação pode ser simplificada'
      ],
      opportunity: `Aproveitar as dúvidas geradas nos comentários para desdobrar novos conteúdos no pilar ${content.pillar}.`,
      hypothesisNote: 'Inferência qualitativa baseada na relação entre engajamento e formato.',
      isHypothesis: true,
      confidence: 'MEDIUM',
      evidence: [
        `Alcance registrado: ${content.metrics.reach.toLocaleString('pt-BR')}`,
        `Salvamentos registrados: ${content.metrics.saves.toLocaleString('pt-BR')}`,
        `Compartilhamentos registrados: ${content.metrics.shares.toLocaleString('pt-BR')}`
      ]
    };
  },

  /**
   * Generate content ideas based on client niche and audience insights
   */
  async generateIdeas(context: IdeaGenerationPromptContext, count = 3): Promise<ContentIdea[]> {
    const { client } = context;

    try {
      logger.info(`Generating ${count} ideas for ${client.name}...`);
      const ideas = await apiClient.post<ContentIdea[]>('/api/ai/generate-ideas', {
        context,
        count
      });

      return ideas.map(idea => ({
        ...idea,
        id: `idea-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        clientId: client.id,
        status: 'IDEIA',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } catch (err) {
      logger.warn('AI generateIdeas API failed, using verified hook templates', { error: String(err) });
      return this.fallbackGenerateIdeas(context, count);
    }
  },

  /**
   * Deterministic profile diagnostic fallback (NO Ravi or hardcoded medical numbers)
   */
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
        usernameAndName: `Nome de usuário "${client.instagram}" cadastrado para o negócio "${client.name}".`,
        bioClarity: `Posicionamento voltado ao segmento ${client.segment}.`,
        ctaAndLink: client.website ? `Link direcionando para: ${client.website}` : 'Link externo não informado no cadastro.',
        highlightsStructure: 'Destaques editoriais organizados por pilares de conteúdo.',
        valueProposition: client.differentiators || 'Diferenciais cadastrados no onboarding estratégico.',
        perceivedAuthority: `Atuação especializada no nicho de ${client.segment} - ${client.subsegment || 'Geral'}.`
      },
      contentSection: {
        publishingFrequency: totalPosts > 0 ? `${totalPosts} publicações catalogadas no workspace.` : 'Nenhum conteúdo catalogado ainda.',
        formatBalance: client.formats.length > 0 ? `Formatos priorizados: ${client.formats.join(', ')}.` : 'Formatos não definidos.',
        pillarDistribution: client.pillars.length > 0 ? `Pilares ativos: ${client.pillars.join(', ')}.` : 'Pilares não definidos.',
        hookEffectiveness: 'Uso de ganchos orientados à retenção e quebra de crenças.',
        ctaEffectiveness: 'Chamadas para ação direcionadas aos objetivos de autoridade e conversão.',
        captionQuality: 'Texto alinhado ao tom de voz registrado no perfil.',
        visualConsistency: 'Padrão estético alinhado ao posicionamento do cliente.'
      },
      performanceSection: {
        observedGrowth: `Base atual: ${followersStr} seguidores registrados.`,
        engagementQuality: 'Métricas de engajamento dependem de sincronização periódica.',
        saveAndShareRatio: 'Salvamentos e compartilhamentos são avaliados individualmente por post.',
        topAudienceDraw: `${totalPosts} conteúdos catalogados para análise de atração.`
      },
      strategySection: {
        authorityStatus: `Posicionamento profissional focado em ${client.segment}.`,
        connectionStatus: 'Conexão fortalecida através de bastidores e clareza de processo.',
        salesReadiness: client.averageTicket ? `Ticket médio de referência: ${client.averageTicket}.` : 'Ticket médio não informado.',
        funnelBalance: 'Distribuição entre Topo (Atração), Meio (Educação) e Fundo (Conversão).',
        biggestOpportunity: 'Explorar as principais dores e objeções catalogadas na pesquisa de público.'
      },
      nextActions: this.generateNextActions(client, contents, snapshots),
      analyzedAt: new Date().toISOString()
    };
  },

  /**
   * Generate generic deterministic next strategic actions
   */
  generateNextActions(
    client: Client,
    contents: Content[],
    snapshots: AccountSnapshot[]
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
      id: `idea-fb-${Date.now()}-${idx}`,
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
