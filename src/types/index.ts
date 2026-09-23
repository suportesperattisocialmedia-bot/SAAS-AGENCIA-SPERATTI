/**
 * Gabriel Speratti | Social Intelligence
 * Domain Entities & Core Types
 */

export type ClientStatus = 'active' | 'archived' | 'onboarding';

export interface Client {
  id: string;
  name: string;
  company: string;
  instagram: string;
  website: string;
  whatsapp: string;
  city: string;
  segment: string;
  subsegment: string;
  targetAudience: string;
  persona: string;
  averageTicket: string;
  products: string;
  services: string;
  objectives: string[];
  pillars: string[];
  formats: string[];
  toneOfVoice: string;
  differentiators: string;
  notes: string;
  competitors: string[];
  createdAt: string;
  updatedAt: string;
  status: ClientStatus;
  onboardingStep: number;
  avatarUrl?: string;
}

export interface InstagramAccount {
  clientId: string;
  handle: string;
  isConnected: boolean;
  connectedAt?: string;
  lastSyncAt?: string;
  nextSyncScheduled?: string;
  appId?: string;
  accountId?: string;
  permissions: string[];
  errorStatus?: string | null;
  syncState?: 'idle' | 'syncing' | 'synced' | 'error';
}

export interface MetricSnapshot {
  id: string;
  clientId: string;
  timestamp: string; // ISO date string YYYY-MM-DD
  followers: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profileVisits: number;
  postsCount: number;
  engagementRate: number;
}

export type ContentFormat = 'Reels' | 'Carrossel' | 'Foto' | 'Stories' | 'Live';

export interface ContentMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  engagementRate: number;
}

export interface ContentAiAnalysis {
  summary: string;
  whyItWorked: string;
  whyItMayHaveUnderperformed: string;
  strengths: string[];
  weaknesses: string[];
  opportunity: string;
  hypothesisNote: string;
}

export interface Content {
  id: string;
  clientId: string;
  instagramPostId?: string;
  title: string;
  caption: string;
  publishedAt: string;
  format: ContentFormat;
  pillar: string;
  objective: string;
  hook: string;
  hookCategory?: string;
  cta: string;
  tone?: string;
  intent?: string;
  metrics: ContentMetrics;
  aiAnalysis?: ContentAiAnalysis;
}

export type CompetitorStatus = 'approved' | 'candidate' | 'ignored';

export interface Competitor {
  id: string;
  clientId: string;
  name: string;
  instagram: string;
  website: string;
  segment: string;
  similarityScore: number;
  followers: number;
  postingFrequencyWeekly: number;
  topFormats: string[];
  avgViews: number;
  avgEngagementRate: number;
  recentThemes: string[];
  notes: string;
  status: CompetitorStatus;
  candidateReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type AudienceInsightCategory = 
  | 'Dores'
  | 'Desejos'
  | 'Medos'
  | 'Objeções'
  | 'Dúvidas'
  | 'Perguntas Frequentes'
  | 'Interesses'
  | 'Tendências'
  | 'Oportunidades';

export interface AudienceInsight {
  id: string;
  clientId: string;
  category: AudienceInsightCategory;
  title: string;
  description: string;
  source: string;
  sourceDate: string;
  context: string;
  interpretation: string;
  isHypothesis: boolean;
  createdAt: string;
}

export type ContentPillar = string;
export type ContentIdeaStatus = IdeaStatus | 'PRODUÇÃO';

export type IdeaStatus = 
  | 'IDEIA'
  | 'PLANEJADO'
  | 'ROTEIRO'
  | 'EM PRODUÇÃO'
  | 'PRODUÇÃO'
  | 'EDITANDO'
  | 'APROVAÇÃO'
  | 'AGENDADO'
  | 'PUBLICADO'
  | 'ANALISADO';

export type WeekDay =
  | 'Segunda'
  | 'Terça'
  | 'Quarta'
  | 'Quinta'
  | 'Sexta'
  | 'Sábado'
  | 'Domingo'
  | 'Segunda-feira'
  | 'Terça-feira'
  | 'Quarta-feira'
  | 'Quinta-feira'
  | 'Sexta-feira'
  | string;

export interface ContentIdea {
  id: string;
  clientId: string;
  title: string;
  description: string;
  pillar: string;
  objective: string;
  format: ContentFormat;
  hook: string;
  hookCategory: string;
  cta: string;
  source: string;
  potential: 'Alto' | 'Médio' | 'Muito Alto';
  whyDoThis: string;
  targetAudienceSnippet: string;
  status: IdeaStatus;
  notes: string;
  calendarDay?: WeekDay;
  scheduledTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarItem {
  id: string;
  clientId: string;
  ideaId?: string;
  contentIdeaId?: string;
  dayOfWeek: WeekDay;
  timeSlot?: string;
  title: string;
  format: ContentFormat;
  pillar: string;
  objective?: string;
  hook?: string;
  cta?: string;
  status?: IdeaStatus;
  notes?: string;
  orderIndex?: number;
}

export type HookCategory = 
  | 'Curiosidade'
  | 'Polêmica'
  | 'Contrarian'
  | 'Erro'
  | 'História'
  | 'Resultado'
  | 'Autoridade'
  | 'Dor'
  | 'Desejo'
  | 'Comparação'
  | 'Lista'
  | 'Caso real'
  | 'Pergunta'
  | 'Quebra de crença';

export interface HookTemplate {
  id: string;
  category: HookCategory;
  title: string;
  formula: string;
  example: string;
  bestForPillars: string[];
  historicalAvgViewsDiff?: string;
  recommendedFormat?: string;
  psychologicalTrigger?: string;
}

export type AlertType = 
  | 'QUEDA DE PERFORMANCE'
  | 'CRESCIMENTO'
  | 'CONTEÚDO ACIMA DA MÉDIA'
  | 'FREQUÊNCIA'
  | 'OPORTUNIDADE'
  | 'CONCORRENTE'
  | 'TENDÊNCIA';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical' | 'warning' | 'success' | 'info';

export type AlertStatus = 'NOVO' | 'VISUALIZADO' | 'RESOLVIDO' | 'new' | 'read' | 'resolved';

export interface Alert {
  id: string;
  clientId?: string;
  clientName?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  calculatedMetricComparison?: string;
  status: AlertStatus;
  createdAt: string;
}

export interface Report {
  id: string;
  clientId: string;
  clientName: string;
  clientInstagram: string;
  title: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  executiveSummary: string;
  kpis: {
    followers: number;
    followersDiffPct: number;
    views: number;
    viewsDiffPct: number;
    reach: number;
    reachDiffPct: number;
    engagementRate: number;
    engagementDiffPct: number;
    postsCount: number;
  };
  topContents: Content[];
  worstContents: Content[];
  analysisText: string;
  aiInsights: string[];
  opportunities: string[];
  recommendations: string[];
  nextSteps: string[];
  generatedAt: string;
}

export interface AppSettings {
  instagramApiConfigured: boolean;
  aiApiConfigured: boolean;
  storageType: 'localStorage' | 'indexedDB' | 'supabase_ready';
  agencyName: string;
  ownerName: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}
