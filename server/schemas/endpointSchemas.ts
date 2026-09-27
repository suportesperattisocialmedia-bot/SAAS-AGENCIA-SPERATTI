/**
 * Schemas Zod de request/response de todas as rotas da API. Nenhum z.any().
 */

import { z } from 'zod';

export const ClientIdSchema = z
  .string()
  .trim()
  .min(1, 'clientId é obrigatório')
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/, 'clientId inválido');

const shortText = (max = 500) => z.string().trim().max(max);

export const ClientProfileSchema = z.object({
  name: shortText(160).min(1),
  company: shortText(160).optional().default(''),
  instagram: shortText(80).optional().default(''),
  segment: shortText(160).optional().default(''),
  subsegment: shortText(160).optional().default(''),
  targetAudience: shortText(1000).optional().default(''),
  persona: shortText(1000).optional().default(''),
  averageTicket: shortText(80).optional().default(''),
  monthlyDeliverables: z.number().int().min(1).max(300).optional(),
  isOwnProfile: z.boolean().optional(),
  pillars: z.array(shortText(120)).max(20).optional().default([]),
  objectives: z.array(shortText(160)).max(20).optional().default([]),
  formats: z.array(shortText(40)).max(10).optional().default([]),
  toneOfVoice: shortText(500).optional().default(''),
  differentiators: shortText(1500).optional().default('')
});

// ---------- Sessão ----------
export const LoginRequestSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200)
});

// ---------- Clientes ----------
export const UpsertClientRequestSchema = z.object({
  id: ClientIdSchema,
  status: z.enum(['active', 'archived', 'onboarding']).optional().default('active'),
  profile: ClientProfileSchema
});
export const ClientQuerySchema = z.object({ clientId: ClientIdSchema });

// ---------- Instagram ----------
export const InstagramStartQuerySchema = z.object({
  clientId: ClientIdSchema,
  mode: z.enum(['redirect', 'json']).optional().default('redirect')
});

export const InstagramCallbackQuerySchema = z.object({
  code: z.string().max(2048).optional(),
  state: z.string().max(512).optional(),
  error: z.string().max(200).optional(),
  error_reason: z.string().max(200).optional(),
  error_description: z.string().max(1000).optional()
});

export const SyncInstagramRequestSchema = z.object({
  clientId: ClientIdSchema,
  trigger: z.enum(['MANUAL', 'AUTO_OPEN', 'SCHEDULED']).optional().default('MANUAL')
});

// ---------- IA ----------
export const AnalyzeProfileRequestSchema = z.object({
  clientId: ClientIdSchema,
  client: ClientProfileSchema,
  contentsCount: z.number().int().nonnegative().max(100000).optional().default(0),
  latestFollowers: z.number().int().nonnegative().nullable().optional().default(null),
  avgViews: z.number().nonnegative().nullable().optional().default(null),
  avgEngagementRate: z.number().nonnegative().max(1000).nullable().optional().default(null),
  topFormats: z.array(shortText(40)).max(10).optional().default([])
});

export const GenerateIdeasRequestSchema = z.object({
  clientId: ClientIdSchema,
  client: ClientProfileSchema,
  audienceInsights: z
    .array(z.object({ title: shortText(300), category: shortText(60) }))
    .max(50)
    .optional()
    .default([]),
  topThemes: z.array(shortText(120)).max(30).optional().default([]),
  count: z.number().int().min(1).max(10).optional().default(3)
});

const nullableMetric = z.number().nonnegative().nullable();

export const ClassifyContentRequestSchema = z.object({
  clientId: ClientIdSchema,
  caption: z.string().max(5000),
  format: shortText(40),
  metrics: z.object({
    views: nullableMetric,
    reach: nullableMetric,
    likes: nullableMetric,
    comments: nullableMetric,
    shares: nullableMetric,
    saves: nullableMetric,
    engagementRate: nullableMetric
  }),
  clientPillars: z.array(shortText(120)).max(20).optional().default([])
});

// ---------- Pesquisa ----------
export const ResearchRequestSchema = z.object({
  kind: z.enum(['audience', 'competitors']),
  clientId: ClientIdSchema,
  segment: shortText(160).min(1),
  category: shortText(60).optional(),
  city: shortText(120).optional(),
  query: shortText(300).optional()
});

/** Coleções do app que podem ser sincronizadas com a nuvem (mesmas do backup + biblioteca). */
export const WORKSPACE_KEYS = [
  'gs_intel_clients',
  'gs_intel_instagram',
  'gs_intel_snapshots',
  'gs_intel_contents',
  'gs_intel_content_metric_snapshots',
  'gs_intel_competitors',
  'gs_intel_audience',
  'gs_intel_ideas',
  'gs_intel_calendar',
  'gs_intel_alerts',
  'gs_intel_reports',
  'gs_intel_sync_logs',
  'gs_intel_ai_analyses',
  'gs_intel_research_insights',
  'gs_intel_research_runs',
  'gs_intel_tasks',
  'gs_intel_snippets',
  'gs_fin_contracts',
  'gs_fin_invoices',
  'gs_fin_projects',
  'gs_fin_expenses'
] as const;

export const WorkspaceSaveRequestSchema = z.object({
  key: z.enum(WORKSPACE_KEYS),
  baseVersion: z.number().int().min(0),
  data: z.array(z.record(z.string(), z.unknown())).max(50_000)
});

// Portal de aprovação do cliente
export const ApprovalTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,128}$/, 'Link inválido.');

export const CreateApprovalLinkRequestSchema = z.object({
  clientId: ClientIdSchema,
  clientName: z.string().trim().min(1).max(120),
  days: z.number().int().min(1).max(90).default(30)
});

export const RevokeApprovalLinkRequestSchema = z.object({ id: z.string().uuid() });

export const PortalDecisionRequestSchema = z.object({
  token: ApprovalTokenSchema,
  taskId: z.string().min(1).max(100),
  decision: z.enum(['approved', 'changes']),
  comment: z.string().trim().max(2000).optional()
}).refine((v) => v.decision === 'approved' || (v.comment && v.comment.length > 0), {
  message: 'Descreva o que precisa ser ajustado.',
  path: ['comment']
});
