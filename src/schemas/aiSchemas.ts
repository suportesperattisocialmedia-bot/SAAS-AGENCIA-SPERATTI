/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Zod Schemas for Gemini AI Responses & Validations
 * Enforces strict typing with ZERO `z.any()`.
 */

import { z } from 'zod';

export const ProfileDiagnosticResponseSchema = z.object({
  profileSection: z.object({
    photoAnalysis: z.string(),
    usernameAndName: z.string().optional().default(''),
    bioClarity: z.string(),
    ctaAndLink: z.string().optional().default(''),
    highlightsStructure: z.string().optional().default(''),
    valueProposition: z.string(),
    perceivedAuthority: z.string()
  }),
  contentSection: z.object({
    publishingFrequency: z.string(),
    predominantFormats: z.string().optional().default(''),
    editorialPillars: z.string(),
    visualIdentityAndAesthetics: z.string().optional().default(''),
    captionQuality: z.string(),
    hookUsage: z.string(),
    ctaEffectiveness: z.string(),
    topPerformingThemes: z.string().optional().default('')
  }),
  performanceSection: z.object({
    engagementAnalysis: z.string(),
    reachAndImpressions: z.string().optional().default(''),
    savesAndShares: z.string(),
    audienceRetention: z.string().optional().default(''),
    bestContentObservations: z.string(),
    worstContentObservations: z.string().optional().default('')
  }),
  strategySection: z.object({
    strengths: z.array(z.string()),
    vulnerabilities: z.array(z.string()),
    immediateOpportunities: z.array(z.string()),
    highImpactPillars: z.array(z.string()).optional().default([]),
    recommendedFormats: z.array(z.string())
  }),
  nextActions: z.array(z.string())
});

export type ProfileDiagnosticResponse = z.infer<typeof ProfileDiagnosticResponseSchema>;

export const ContentClassificationResponseSchema = z.object({
  pillar: z.string(),
  hookCategory: z.string(),
  hypothesisReason: z.string(),
  isHypothesis: z.boolean().default(true),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  improvementTip: z.string()
});

export type ContentClassificationResponse = z.infer<typeof ContentClassificationResponseSchema>;

export const IdeaItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  pillar: z.string(),
  objective: z.string(),
  format: z.enum(['Reels', 'Carrossel', 'Foto', 'Stories', 'Live']),
  hook: z.string(),
  hookCategory: z.string().optional().default('Autoridade'),
  cta: z.string(),
  source: z.string().optional().default('Planejamento Estratégico AI'),
  potential: z.enum(['Alto', 'Médio', 'Muito Alto']).default('Alto'),
  whyDoThis: z.string(),
  targetAudienceSnippet: z.string().optional().default('')
});

export const IdeaGenerationResponseSchema = z.array(IdeaItemSchema);
export type IdeaGenerationResponse = z.infer<typeof IdeaGenerationResponseSchema>;

export const AudienceAnalysisResponseSchema = z.object({
  pains: z.array(z.object({
    title: z.string(),
    explanation: z.string(),
    provenance: z.enum(['FATO', 'HIPOTESE', 'RECOMENDACAO']).default('HIPOTESE'),
    confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM')
  })),
  desires: z.array(z.object({
    title: z.string(),
    explanation: z.string(),
    provenance: z.enum(['FATO', 'HIPOTESE', 'RECOMENDACAO']).default('HIPOTESE')
  })),
  objections: z.array(z.object({
    title: z.string(),
    counterArgument: z.string()
  }))
});

export type AudienceAnalysisResponse = z.infer<typeof AudienceAnalysisResponseSchema>;

export const StrategyRecommendationResponseSchema = z.object({
  primaryGoal: z.string(),
  priorityPillars: z.array(z.string()),
  recommendedCadenceWeekly: z.number(),
  shortTermTactics: z.array(z.string()),
  riskMitigation: z.array(z.string())
});

export type StrategyRecommendationResponse = z.infer<typeof StrategyRecommendationResponseSchema>;
