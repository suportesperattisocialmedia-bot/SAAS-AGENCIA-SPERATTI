/**
 * Gabriel Speratti | Social Intelligence
 * Domain Entities & Core Types (Prompt V2 Standardized)
 */

export type ClientStatus = 'active' | 'archived' | 'onboarding';

export type HealthStatus = 'healthy' | 'attention' | 'critical' | 'not_connected';

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
  formats: ContentFormat[];
  toneOfVoice: string;
  differentiators: string;
  notes: string;
  status: ClientStatus;
  onboardingStep: number; // 1 to 10
  avatarUrl?: string;
  lastSyncAt?: string;
  healthStatus: HealthStatus;
  createdAt: string;
  updatedAt: string;
}

export type InstagramConnectionStatus = 
  | 'NOT_CONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'TOKEN_EXPIRED'
  | 'PERMISSION_ERROR'
  | 'SYNCING'
  | 'SYNCED'
  | 'ERROR';

export interface InstagramAccount {
  clientId: string;
  handle: string;
  status: InstagramConnectionStatus;
  isConnected: boolean;
  connectedAt?: string;
  lastSyncAt?: string;
  nextSyncScheduled?: string;
  appId?: string;
  accountId?: string;
  pageId?: string;
  permissions: string[];
  errorStatus?: string | null;
}

export type SnapshotSource = 'META_API' | 'IMPORT' | 'MANUAL' | 'DEMO';

export interface AccountSnapshot {
  id: string;
  clientId: string;
  date: string; // ISO date string YYYY-MM-DD
  followers: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profileVisits: number;
  websiteClicks: number;
  postsPublished: number;
  engagementRate: number;
  source: SnapshotSource;
  sourceTimestamp: string;
}

// Backward compatibility alias
export type MetricSnapshot = AccountSnapshot;

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
  whyItWorked?: string;
  whyItMayHaveUnderperformed?: string;
  strengths: string[];
  weaknesses: string[];
  opportunity: string;
  hypothesisNote: string;
  isHypothesis: boolean;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  evidence: string[];
}

export interface Content {
  id: string;
  clientId: string;
  instagramMediaId?: string;
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

export interface ContentMetricSnapshot {
  id: string;
  contentId: string;
  timestamp: string;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profileActivity: number;
  engagementRate: number;
  source: SnapshotSource;
}

export type CompetitorStatus = 'approved' | 'candidate' | 'ignored';

export interface Competitor {
  id: string;
  clientId: string;
  name: string;
  instagram: string;
  website: string;
  segment: string;
  similarityScore: number; // 0 to 100 based on verified criteria
  similarityCriteria?: string[];
  followers: number;
  postingFrequencyWeekly: number;
  topFormats: ContentFormat[];
  avgViews: number;
  avgEngagementRate: number;
  recentThemes: string[];
  notes: string;
  status: CompetitorStatus;
  candidateReason?: string;
  evidenceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorSnapshot {
  id: string;
  competitorId: string;
  date: string;
  followers: number;
  postingFrequency: number;
  recentPosts: number;
  topFormats: ContentFormat[];
  themes: string[];
  avgViews: number;
  avgEngagement: number;
  source: SnapshotSource;
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
  sourceUrl?: string;
  sourceDate: string;
  evidence?: string;
  context?: string;
  interpretation: string;
  isHypothesis: boolean;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
}

export type ContentPillar = string;

export type PipelineStatus = 
  | 'IDEIA'
  | 'PLANEJADO'
  | 'ROTEIRO'
  | 'EM_PRODUCAO'
  | 'EDITANDO'
  | 'APROVACAO'
  | 'AGENDADO'
  | 'PUBLICADO'
  | 'ANALISADO';

// Alias
export type IdeaStatus = PipelineStatus;
export type ContentIdeaStatus = PipelineStatus;

export type WeekDay = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';

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
  status: PipelineStatus;
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
  dayOfWeek: WeekDay;
  timeSlot?: string;
  title: string;
  format: ContentFormat;
  pillar: string;
  objective?: string;
  hook?: string;
  cta?: string;
  status?: PipelineStatus;
  notes?: string;
  orderIndex: number;
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
  recommendedFormat?: ContentFormat;
  psychologicalTrigger?: string;
}

export type AlertType = 
  | 'QUEDA DE PERFORMANCE'
  | 'CRESCIMENTO'
  | 'CONTEÚDO ACIMA DA MÉDIA'
  | 'FREQUÊNCIA'
  | 'OPORTUNIDADE'
  | 'CONCORRENTE'
  | 'TENDÊNCIA'
  | 'ERRO_SINCRONIZACAO'
  | 'TOKEN_EXPIRADO';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus = 'NEW' | 'READ' | 'RESOLVED';

export interface Alert {
  id: string;
  clientId?: string;
  clientName?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  evidence?: string;
  calculatedMetricComparison?: string;
  status: AlertStatus;
  createdAt: string;
}

export interface PeriodComparison {
  current: number;
  previous: number | null;
  absoluteDiff: number | null;
  percentDiff: number | null;
  hasSufficientData: boolean;
  provenance: 'REAL_DATA' | 'CALCULATED_DATA';
}

export interface PeriodAnalytics {
  periodDays: number;
  startDate: string;
  endDate: string;
  followersGrowth: PeriodComparison;
  totalViews: PeriodComparison;
  totalReach: PeriodComparison;
  avgEngagementRate: PeriodComparison;
  totalLikes: PeriodComparison;
  totalComments: PeriodComparison;
  totalShares: PeriodComparison;
  totalSaves: PeriodComparison;
  postsPublished: PeriodComparison;
  hasPreviousPeriod: boolean;
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
    followersDiffPct: number | null;
    views: number;
    viewsDiffPct: number | null;
    reach: number;
    reachDiffPct: number | null;
    engagementRate: number;
    engagementDiffPct: number | null;
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
  appMode: 'PRODUCTION' | 'DEMO';
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
