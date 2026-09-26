/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Zod Schemas for Runtime Data Integrity & Type Safety
 */

import { z } from 'zod';

export const ContentFormatSchema = z.enum(['Reels', 'Carrossel', 'Foto', 'Stories', 'Live']);

export const WeekDaySchema = z.enum(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']);

export const PipelineStatusSchema = z.enum([
  'IDEIA',
  'PLANEJADO',
  'ROTEIRO',
  'EM_PRODUCAO',
  'EDITANDO',
  'APROVACAO',
  'AGENDADO',
  'PUBLICADO',
  'ANALISADO'
]);

export const AlertStatusSchema = z.enum(['NEW', 'READ', 'RESOLVED']);

export const AlertSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const SnapshotSourceSchema = z.enum(['META_API', 'IMPORT', 'MANUAL', 'DEMO']);

export const ClientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  company: z.string().default(''),
  instagram: z.string().min(1, 'Instagram é obrigatório').transform(val => {
    const trimmed = val.trim();
    return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  }),
  website: z.string().default(''),
  whatsapp: z.string().default(''),
  city: z.string().default(''),
  segment: z.string().min(1, 'Segmento é obrigatório'),
  subsegment: z.string().default(''),
  targetAudience: z.string().default(''),
  persona: z.string().default(''),
  averageTicket: z.string().default(''),
  products: z.string().default(''),
  services: z.string().default(''),
  objectives: z.array(z.string()).default([]),
  pillars: z.array(z.string()).default([]),
  formats: z.array(ContentFormatSchema).default(['Reels', 'Carrossel']),
  toneOfVoice: z.string().default(''),
  differentiators: z.string().default(''),
  notes: z.string().default(''),
  status: z.enum(['active', 'archived', 'onboarding']).default('active'),
  onboardingStep: z.number().int().min(1).max(10).default(1),
  avatarUrl: z.string().optional(),
  lastSyncAt: z.string().optional(),
  healthStatus: z.enum(['healthy', 'attention', 'critical', 'not_connected']).default('not_connected'),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString())
});

export const InstagramAccountSchema = z.object({
  clientId: z.string().min(1),
  handle: z.string().min(1),
  // Valores legados (antes da conexão OAuth real) são normalizados para os estados atuais.
  status: z.preprocess(
    (value) => {
      const legacy: Record<string, string> = { NOT_CONNECTED: 'DISCONNECTED', TOKEN_EXPIRED: 'EXPIRED', PERMISSION_ERROR: 'REAUTH_REQUIRED', SYNCED: 'CONNECTED' };
      return typeof value === 'string' && legacy[value] ? legacy[value] : value;
    },
    z.enum(['NOT_CONFIGURED', 'DISCONNECTED', 'CONNECTING', 'CONNECTED', 'SYNCING', 'ERROR', 'EXPIRED', 'REAUTH_REQUIRED'])
  ).default('DISCONNECTED'),
  isConnected: z.boolean().default(false),
  connectedAt: z.string().optional(),
  lastSyncAt: z.string().optional(),
  nextSyncScheduled: z.string().optional(),
  appId: z.string().optional(),
  accountId: z.string().optional(),
  pageId: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  errorStatus: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  tokenExpiresAt: z.string().nullable().optional()
});

export const AccountSnapshotSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  followers: z.number().nonnegative().nullable(),
  reach: z.number().nonnegative().nullable(),
  views: z.number().nonnegative().nullable(),
  likes: z.number().nonnegative().nullable(),
  comments: z.number().nonnegative().nullable(),
  shares: z.number().nonnegative().nullable(),
  saves: z.number().nonnegative().nullable(),
  profileVisits: z.number().nonnegative().nullable(),
  websiteClicks: z.number().nonnegative().nullable(),
  postsPublished: z.number().nonnegative().nullable(),
  engagementRate: z.number().nonnegative().nullable(),
  source: SnapshotSourceSchema.default('MANUAL'),
  sourceTimestamp: z.string().default(() => new Date().toISOString())
});

export const MetricSnapshotSchema = AccountSnapshotSchema;

export const ContentSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  instagramMediaId: z.string().optional(),
  mediaType: z.string().optional(),
  permalink: z.string().optional(),
  mediaUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  title: z.string().min(1),
  caption: z.string().default(''),
  publishedAt: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  format: ContentFormatSchema,
  pillar: z.string().default('Geral'),
  objective: z.string().default('Engajamento'),
  hook: z.string().default(''),
  hookCategory: z.string().optional(),
  cta: z.string().default(''),
  tone: z.string().optional(),
  intent: z.string().optional(),
  metrics: z.object({
    views: z.number().nonnegative().nullable().default(null),
    likes: z.number().nonnegative().nullable().default(null),
    comments: z.number().nonnegative().nullable().default(null),
    shares: z.number().nonnegative().nullable().default(null),
    saves: z.number().nonnegative().nullable().default(null),
    reach: z.number().nonnegative().nullable().default(null),
    engagementRate: z.number().nonnegative().nullable().default(null)
  }),
  aiAnalysis: z.object({
    summary: z.string(),
    whyItWorked: z.string().optional(),
    whyItMayHaveUnderperformed: z.string().optional(),
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    opportunity: z.string().default(''),
    hypothesisNote: z.string().default(''),
    isHypothesis: z.boolean().default(true),
    confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    evidence: z.array(z.string()).default([])
  }).optional()
});

export const CompetitorSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1),
  instagram: z.string().min(1),
  website: z.string().default(''),
  segment: z.string().default(''),
  similarityScore: z.number().min(0).max(100).nullable().default(null),
  similarityCriteria: z.array(z.string()).optional(),
  similarityMethod: z.string().optional(),
  followers: z.number().nonnegative().nullable().default(null),
  postingFrequencyWeekly: z.number().nonnegative().nullable().default(null),
  topFormats: z.array(ContentFormatSchema).default([]),
  avgViews: z.number().nonnegative().nullable().default(null),
  avgEngagementRate: z.number().nonnegative().nullable().default(null),
  recentThemes: z.array(z.string()).default([]),
  notes: z.string().default(''),
  status: z.enum(['approved', 'candidate', 'ignored', 'discovered', 'rejected', 'archived']).default('candidate'),
  candidateReason: z.string().optional(),
  evidenceUrl: z.string().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString())
});

export const SyncLogSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  startedAt: z.string(),
  finishedAt: z.string(),
  status: z.enum(['SUCCESS', 'PARTIAL', 'ERROR']),
  trigger: z.enum(['MANUAL', 'AUTO_OPEN', 'SCHEDULED']),
  recordsFetched: z.number().nonnegative().default(0),
  recordsCreated: z.number().nonnegative().default(0),
  recordsUpdated: z.number().nonnegative().default(0),
  errors: z.array(z.string()).default([]),
  provider: z.string().default('meta_instagram'),
  requestId: z.string().default('')
});

export const AIAnalysisRecordSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  analysisType: z.enum(['PROFILE_DIAGNOSTIC', 'CONTENT_CLASSIFICATION', 'IDEA_GENERATION', 'AUDIENCE_ANALYSIS', 'STRATEGY_RECOMMENDATION']),
  createdAt: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  inputDataHash: z.string(),
  output: z.unknown(),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  sourceDataIds: z.array(z.string()).default([])
});

export const ResearchInsightSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  query: z.string(),
  sourceType: z.enum(['search_engine', 'industry_report', 'scientific_article', 'social_media', 'verified_web']),
  sourceName: z.string(),
  sourceUrl: z.string().optional(),
  title: z.string(),
  snippet: z.string(),
  evidence: z.string().optional(),
  publishedAt: z.string().optional(),
  retrievedAt: z.string(),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  category: z.enum([
    'Dores',
    'Desejos',
    'Medos',
    'Objeções',
    'Dúvidas',
    'Perguntas Frequentes',
    'Interesses',
    'Tendências',
    'Oportunidades'
  ]),
  isHypothesis: z.boolean().default(false)
});

export const AudienceInsightSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  category: z.enum([
    'Dores',
    'Desejos',
    'Medos',
    'Objeções',
    'Dúvidas',
    'Perguntas Frequentes',
    'Interesses',
    'Tendências',
    'Oportunidades'
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  source: z.string().min(1),
  sourceUrl: z.string().optional(),
  sourceDate: z.string().default(() => new Date().toISOString()),
  evidence: z.string().optional(),
  context: z.string().optional(),
  interpretation: z.string().default(''),
  isHypothesis: z.boolean().default(false),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  createdAt: z.string().default(() => new Date().toISOString())
});

export const ContentIdeaSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  pillar: z.string().default(''),
  objective: z.string().default(''),
  format: ContentFormatSchema.default('Reels'),
  hook: z.string().default(''),
  hookCategory: z.string().default('Curiosidade'),
  cta: z.string().default(''),
  source: z.string().default(''),
  potential: z.enum(['Alto', 'Médio', 'Muito Alto']).default('Alto'),
  whyDoThis: z.string().default(''),
  targetAudienceSnippet: z.string().default(''),
  status: PipelineStatusSchema.default('IDEIA'),
  notes: z.string().default(''),
  calendarDay: WeekDaySchema.optional(),
  scheduledTime: z.string().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString())
});

export const CalendarItemSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  ideaId: z.string().optional(),
  dayOfWeek: WeekDaySchema,
  timeSlot: z.string().optional(),
  title: z.string().min(1),
  format: ContentFormatSchema,
  pillar: z.string().default('Geral'),
  objective: z.string().optional(),
  hook: z.string().optional(),
  cta: z.string().optional(),
  status: PipelineStatusSchema.optional().default('PLANEJADO'),
  notes: z.string().optional(),
  orderIndex: z.number().int().default(0)
});

export const AlertSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  type: z.enum([
    'QUEDA DE PERFORMANCE',
    'CRESCIMENTO',
    'CONTEÚDO ACIMA DA MÉDIA',
    'FREQUÊNCIA',
    'OPORTUNIDADE',
    'CONCORRENTE',
    'TENDÊNCIA',
    'ERRO_SINCRONIZACAO',
    'TOKEN_EXPIRADO'
  ]),
  severity: AlertSeveritySchema,
  title: z.string().min(1),
  message: z.string().min(1),
  evidence: z.string().optional(),
  calculatedMetricComparison: z.string().optional(),
  status: AlertStatusSchema.default('NEW'),
  createdAt: z.string().default(() => new Date().toISOString())
});

export const ReportSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  clientInstagram: z.string().min(1),
  title: z.string().min(1),
  periodLabel: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  executiveSummary: z.string().default(''),
  kpis: z.object({
    followers: z.number().nullable().default(null),
    followersDiffPct: z.number().nullable().default(null),
    views: z.number().nullable().default(null),
    viewsDiffPct: z.number().nullable().default(null),
    reach: z.number().nullable().default(null),
    reachDiffPct: z.number().nullable().default(null),
    engagementRate: z.number().nullable().default(null),
    engagementDiffPct: z.number().nullable().default(null),
    postsCount: z.number().default(0)
  }),
  topContents: z.array(ContentSchema).default([]),
  worstContents: z.array(ContentSchema).default([]),
  analysisText: z.string().default(''),
  aiInsights: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
  generatedAt: z.string().default(() => new Date().toISOString())
});
