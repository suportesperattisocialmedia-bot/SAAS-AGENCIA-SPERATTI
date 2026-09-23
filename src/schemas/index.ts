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
  status: z.enum([
    'NOT_CONNECTED',
    'CONNECTING',
    'CONNECTED',
    'TOKEN_EXPIRED',
    'PERMISSION_ERROR',
    'SYNCING',
    'SYNCED',
    'ERROR'
  ]).default('NOT_CONNECTED'),
  isConnected: z.boolean().default(false),
  connectedAt: z.string().optional(),
  lastSyncAt: z.string().optional(),
  nextSyncScheduled: z.string().optional(),
  appId: z.string().optional(),
  accountId: z.string().optional(),
  pageId: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  errorStatus: z.string().nullable().optional()
});

export const AccountSnapshotSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  followers: z.number().nonnegative(),
  reach: z.number().nonnegative(),
  views: z.number().nonnegative(),
  likes: z.number().nonnegative(),
  comments: z.number().nonnegative(),
  shares: z.number().nonnegative(),
  saves: z.number().nonnegative(),
  profileVisits: z.number().nonnegative(),
  websiteClicks: z.number().nonnegative(),
  postsPublished: z.number().nonnegative(),
  engagementRate: z.number().nonnegative(),
  source: SnapshotSourceSchema.default('MANUAL'),
  sourceTimestamp: z.string().default(() => new Date().toISOString())
});

export const MetricSnapshotSchema = AccountSnapshotSchema;

export const ContentSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  instagramMediaId: z.string().optional(),
  title: z.string().min(1),
  caption: z.string().default(''),
  publishedAt: z.string(),
  format: ContentFormatSchema,
  pillar: z.string().default('Geral'),
  objective: z.string().default('Engajamento'),
  hook: z.string().default(''),
  hookCategory: z.string().optional(),
  cta: z.string().default(''),
  tone: z.string().optional(),
  intent: z.string().optional(),
  metrics: z.object({
    views: z.number().nonnegative().default(0),
    likes: z.number().nonnegative().default(0),
    comments: z.number().nonnegative().default(0),
    shares: z.number().nonnegative().default(0),
    saves: z.number().nonnegative().default(0),
    reach: z.number().nonnegative().default(0),
    engagementRate: z.number().nonnegative().default(0)
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
  similarityScore: z.number().min(0).max(100).default(0),
  similarityCriteria: z.array(z.string()).optional(),
  followers: z.number().nonnegative().default(0),
  postingFrequencyWeekly: z.number().nonnegative().default(0),
  topFormats: z.array(ContentFormatSchema).default([]),
  avgViews: z.number().nonnegative().default(0),
  avgEngagementRate: z.number().nonnegative().default(0),
  recentThemes: z.array(z.string()).default([]),
  notes: z.string().default(''),
  status: z.enum(['approved', 'candidate', 'ignored']).default('candidate'),
  candidateReason: z.string().optional(),
  evidenceUrl: z.string().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString())
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
    followers: z.number().default(0),
    followersDiffPct: z.number().nullable().default(null),
    views: z.number().default(0),
    viewsDiffPct: z.number().nullable().default(null),
    reach: z.number().default(0),
    reachDiffPct: z.number().nullable().default(null),
    engagementRate: z.number().default(0),
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
