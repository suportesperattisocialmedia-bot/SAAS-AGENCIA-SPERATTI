/**
 * Casos de uso de IA expostos pelas Functions /api/ai/*.
 * Cada um: sessão -> cliente da agência -> prompt versionado -> Gemini -> Zod -> auditoria.
 */

import { requireSession } from '../auth/session.js';
import type { ApiContext } from '../http/handler.js';
import { ok, readJson } from '../http/handler.js';
import { clientRepository } from '../repositories/clientRepository.js';
import { aiAnalysisRepository } from '../repositories/aiAnalysisRepository.js';
import { AnalyzeProfileRequestSchema, ClassifyContentRequestSchema, GenerateIdeasRequestSchema } from '../schemas/endpointSchemas.js';
import { CLASSIFICATION_SCHEMA, IDEAS_SCHEMA, PROFILE_DIAGNOSTIC_SCHEMA, generateStructured } from './geminiService.js';
import { PROFILE_DIAGNOSTIC_VERSION, buildProfileDiagnosticPrompt } from '../../src/ai/prompts/profileDiagnostic.js';
import { IDEA_GENERATION_VERSION, buildIdeaGenerationPrompt } from '../../src/ai/prompts/ideaGeneration.js';
import { CONTENT_CLASSIFICATION_VERSION, buildContentClassificationPrompt } from '../../src/ai/prompts/contentClassification.js';
import {
  ContentClassificationResponseSchema,
  IdeaGenerationResponseSchema,
  ProfileDiagnosticResponseSchema
} from '../../src/schemas/aiSchemas.js';

export async function analyzeProfileHandler({ request, requestId }: ApiContext): Promise<Response> {
  const user = await requireSession(request);
  const body = await readJson(request, AnalyzeProfileRequestSchema);
  await clientRepository.requireForAgency(user.agencyId, body.clientId);

  const prompt = buildProfileDiagnosticPrompt({
    client: { id: body.clientId, ...body.client },
    contentsCount: body.contentsCount,
    latestFollowers: body.latestFollowers,
    avgViews: body.avgViews,
    avgEngagementRate: body.avgEngagementRate,
    topFormats: body.topFormats
  });
  const { data, model } = await generateStructured({
    prompt,
    responseSchema: PROFILE_DIAGNOSTIC_SCHEMA,
    validator: ProfileDiagnosticResponseSchema,
    requestId,
    operation: 'analyze-profile'
  });
  const metadata = { model, promptVersion: PROFILE_DIAGNOSTIC_VERSION, requestId, analyzedAt: new Date().toISOString() };
  await aiAnalysisRepository.record({
    agencyId: user.agencyId,
    clientId: body.clientId,
    analysisType: 'PROFILE_DIAGNOSTIC',
    model,
    promptVersion: PROFILE_DIAGNOSTIC_VERSION,
    input: body,
    output: data,
    requestId
  });
  return ok({ diagnostic: data, metadata });
}

export async function generateIdeasHandler({ request, requestId }: ApiContext): Promise<Response> {
  const user = await requireSession(request);
  const body = await readJson(request, GenerateIdeasRequestSchema);
  await clientRepository.requireForAgency(user.agencyId, body.clientId);

  const prompt = buildIdeaGenerationPrompt({
    client: {
      name: body.client.name,
      instagram: body.client.instagram,
      segment: body.client.segment,
      subsegment: body.client.subsegment,
      targetAudience: body.client.targetAudience,
      persona: body.client.persona,
      pillars: body.client.pillars,
      formats: body.client.formats,
      toneOfVoice: body.client.toneOfVoice
    },
    audienceInsights: body.audienceInsights,
    topThemes: body.topThemes,
    count: body.count
  });
  const { data, model } = await generateStructured({
    prompt,
    responseSchema: IDEAS_SCHEMA,
    validator: IdeaGenerationResponseSchema.max(10),
    requestId,
    operation: 'generate-ideas'
  });
  await aiAnalysisRepository.record({
    agencyId: user.agencyId,
    clientId: body.clientId,
    analysisType: 'IDEA_GENERATION',
    model,
    promptVersion: IDEA_GENERATION_VERSION,
    input: body,
    output: data,
    requestId
  });
  return ok({ ideas: data, metadata: { model, promptVersion: IDEA_GENERATION_VERSION, requestId } });
}

export async function classifyContentHandler({ request, requestId }: ApiContext): Promise<Response> {
  const user = await requireSession(request);
  const body = await readJson(request, ClassifyContentRequestSchema);
  await clientRepository.requireForAgency(user.agencyId, body.clientId);

  const { data, model } = await generateStructured({
    prompt: buildContentClassificationPrompt(body),
    responseSchema: CLASSIFICATION_SCHEMA,
    validator: ContentClassificationResponseSchema,
    requestId,
    operation: 'classify-content'
  });
  await aiAnalysisRepository.record({
    agencyId: user.agencyId,
    clientId: body.clientId,
    analysisType: 'CONTENT_CLASSIFICATION',
    model,
    promptVersion: CONTENT_CLASSIFICATION_VERSION,
    input: body,
    output: data,
    requestId
  });
  return ok({ classification: data, metadata: { model, promptVersion: CONTENT_CLASSIFICATION_VERSION, requestId } });
}
