/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Backend Request Validation Schemas
 * Strictly validates all endpoint payloads. ZERO z.any().
 */

import { z } from 'zod';

export const ClientPayloadSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  company: z.string().optional().default(''),
  instagram: z.string().min(1),
  segment: z.string().min(1),
  subsegment: z.string().optional().default(''),
  targetAudience: z.string().optional().default(''),
  persona: z.string().optional().default(''),
  averageTicket: z.string().optional().default(''),
  pillars: z.array(z.string()).optional().default([]),
  objectives: z.array(z.string()).optional().default([]),
  formats: z.array(z.string()).optional().default([]),
  toneOfVoice: z.string().optional().default(''),
  differentiators: z.string().optional().default('')
});

export const SyncInstagramRequestSchema = z.object({
  clientId: z.string().min(1, 'clientId é obrigatório'),
  trigger: z.enum(['MANUAL', 'AUTO_OPEN', 'SCHEDULED']).optional().default('MANUAL')
});

export const DisconnectInstagramRequestSchema = z.object({
  clientId: z.string().min(1, 'clientId é obrigatório')
});

export const AnalyzeProfileRequestSchema = z.object({
  client: ClientPayloadSchema,
  contentsCount: z.number().int().nonnegative().optional().default(0),
  latestFollowers: z.number().int().nullable().optional().default(null),
  avgViews: z.number().nullable().optional().default(null),
  avgEngagementRate: z.number().nullable().optional().default(null),
  topFormats: z.array(z.string()).optional().default([])
});

export const GenerateIdeasRequestSchema = z.object({
  context: z.object({
    client: ClientPayloadSchema,
    audienceInsights: z.array(z.object({
      title: z.string(),
      category: z.string()
    })).optional().default([]),
    topThemes: z.array(z.string()).optional().default([])
  }),
  count: z.number().int().min(1).max(10).optional().default(3)
});

export const ClassifyContentRequestSchema = z.object({
  caption: z.string(),
  format: z.string(),
  metrics: z.object({
    views: z.number(),
    reach: z.number(),
    likes: z.number(),
    comments: z.number(),
    shares: z.number(),
    saves: z.number(),
    engagementRate: z.number()
  }),
  clientPillars: z.array(z.string()).optional().default([])
});

export const ResearchRequestSchema = z.object({
  clientId: z.string().min(1),
  segment: z.string().min(1),
  category: z.string().min(1),
  query: z.string().optional()
});

export const CompetitorDiscoveryRequestSchema = z.object({
  clientId: z.string().min(1),
  segment: z.string().min(1),
  city: z.string().optional().default('Brasil')
});
