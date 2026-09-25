/**
 * Gemini (Google GenAI) — chamadas exclusivamente server-side.
 * Toda resposta estruturada é parseada com segurança e validada com Zod antes de sair do backend.
 */

import { GoogleGenAI, Type, type Schema } from '@google/genai';
import type { z } from 'zod';
import { getGeminiConfig } from '../config/env.js';
import { AppError, Errors } from '../http/errors.js';
import { log } from '../logging/logger.js';

export type GenerateJson = (input: { model: string; prompt: string; responseSchema: Schema }) => Promise<string>;

interface GlobalWithGemini {
  __speratti_gemini__?: { key: string; client: GoogleGenAI };
}
const globalRef = globalThis as unknown as GlobalWithGemini;

function defaultGenerator(apiKey: string): GenerateJson {
  let cached = globalRef.__speratti_gemini__;
  if (!cached || cached.key !== apiKey) {
    cached = { key: apiKey, client: new GoogleGenAI({ apiKey }) };
    globalRef.__speratti_gemini__ = cached;
  }
  const client = cached.client;
  return async ({ model, prompt, responseSchema }) => {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema }
    });
    return response.text ?? '';
  };
}

let generatorOverride: GenerateJson | null = null;

/** Permite injetar um gerador em testes (nunca usado em produção). */
export function setGeminiGeneratorForTests(generator: GenerateJson | null): void {
  generatorOverride = generator;
}

/**
 * Traduz o erro do Google em uma mensagem útil para o usuário, sem expor detalhes internos.
 */
const RECOMMENDED_MODEL = 'gemini-3.8-flash';

export function describeGeminiError(err: unknown, model: string): { status: number; message: string; reason: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const status = typeof (err as { status?: unknown })?.status === 'number' ? (err as { status: number }).status : 0;
  const has = (re: RegExp) => re.test(raw);
  if (has(/API_KEY_INVALID|API key not valid|API key expired/i)) {
    return { status: 502, reason: 'KEY_INVALID', message: 'A chave do Gemini (GEMINI_API_KEY) é inválida ou expirou. Gere uma nova em aistudio.google.com/apikey e atualize na Vercel.' };
  }
  if (status === 429 || has(/RESOURCE_EXHAUSTED|quota/i)) {
    return { status: 429, reason: 'QUOTA', message: 'A cota gratuita do Gemini acabou por agora. Aguarde alguns minutos ou ative o faturamento no Google AI Studio.' };
  }
  if (status === 404 || has(/is not found|not supported for generateContent|NOT_FOUND/i)) {
    return { status: 502, reason: 'MODEL_NOT_FOUND', message: `O modelo "${model}" não está disponível para esta chave. Ajuste GEMINI_MODEL na Vercel (recomendado: ${RECOMMENDED_MODEL}).` };
  }
  if (status === 403 || has(/PERMISSION_DENIED|SERVICE_DISABLED|has not been used/i)) {
    return { status: 502, reason: 'PERMISSION', message: 'A chave do Gemini não tem permissão para a API Generative Language. Crie a chave pelo Google AI Studio.' };
  }
  if (has(/location is not supported|FAILED_PRECONDITION/i)) {
    return { status: 502, reason: 'REGION', message: 'O Gemini recusou a requisição por restrição de região/conta.' };
  }
  if (status >= 500 || has(/UNAVAILABLE|overloaded|DEADLINE/i)) {
    return { status: 503, reason: 'UNAVAILABLE', message: 'O Gemini está temporariamente indisponível. Tente novamente em instantes.' };
  }
  return { status: 502, reason: 'UNKNOWN', message: 'Falha ao processar a solicitação com a IA. Tente novamente.' };
}

export function safeJsonParse(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

export async function generateStructured<S extends z.ZodType>(input: {
  prompt: string;
  responseSchema: Schema;
  validator: S;
  requestId: string;
  operation: string;
}): Promise<{ data: z.infer<S>; model: string }> {
  const config = getGeminiConfig();
  if (!config) throw Errors.geminiNotConfigured();
  const generate = generatorOverride ?? defaultGenerator(config.apiKey);

  let text: string;
  const started = Date.now();
  try {
    text = await generate({ model: config.model, prompt: input.prompt, responseSchema: input.responseSchema });
  } catch (err) {
    const described = describeGeminiError(err, config.model);
    log.error('gemini.request_failed', {
      requestId: input.requestId,
      operation: input.operation,
      model: config.model,
      reason: described.reason,
      cause: err instanceof Error ? err : String(err)
    });
    throw new AppError('AI_EXECUTION_ERROR', described.status, described.message, { cause: err });
  }

  const parsed = safeJsonParse(text);
  const validated = input.validator.safeParse(parsed);
  if (!validated.success) {
    log.warn('gemini.response_invalid', {
      requestId: input.requestId,
      operation: input.operation,
      model: config.model,
      issues: validated.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`)
    });
    throw new AppError('AI_RESPONSE_VALIDATION_FAILED', 502, 'A resposta da IA não passou na validação de estrutura. Tente novamente.');
  }
  log.info('gemini.request_ok', { requestId: input.requestId, operation: input.operation, model: config.model, durationMs: Date.now() - started });
  return { data: validated.data, model: config.model };
}

// ---------- Schemas de resposta enviados ao Gemini ----------

const str = { type: Type.STRING };
const strArray = { type: Type.ARRAY, items: { type: Type.STRING } };

export const PROFILE_DIAGNOSTIC_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    profileSection: {
      type: Type.OBJECT,
      properties: {
        photoAnalysis: str,
        usernameAndName: str,
        bioClarity: str,
        ctaAndLink: str,
        highlightsStructure: str,
        valueProposition: str,
        perceivedAuthority: str
      },
      required: ['photoAnalysis', 'bioClarity', 'valueProposition', 'perceivedAuthority']
    },
    contentSection: {
      type: Type.OBJECT,
      properties: {
        publishingFrequency: str,
        predominantFormats: str,
        editorialPillars: str,
        visualIdentityAndAesthetics: str,
        captionQuality: str,
        hookUsage: str,
        ctaEffectiveness: str,
        topPerformingThemes: str
      },
      required: ['publishingFrequency', 'editorialPillars', 'captionQuality', 'hookUsage', 'ctaEffectiveness']
    },
    performanceSection: {
      type: Type.OBJECT,
      properties: {
        engagementAnalysis: str,
        reachAndImpressions: str,
        savesAndShares: str,
        audienceRetention: str,
        bestContentObservations: str,
        worstContentObservations: str
      },
      required: ['engagementAnalysis', 'savesAndShares', 'bestContentObservations']
    },
    strategySection: {
      type: Type.OBJECT,
      properties: {
        strengths: strArray,
        vulnerabilities: strArray,
        immediateOpportunities: strArray,
        highImpactPillars: strArray,
        recommendedFormats: strArray
      },
      required: ['strengths', 'vulnerabilities', 'immediateOpportunities', 'recommendedFormats']
    },
    nextActions: strArray
  },
  required: ['profileSection', 'contentSection', 'performanceSection', 'strategySection', 'nextActions']
};

export const IDEAS_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: str,
      description: str,
      pillar: str,
      objective: str,
      format: { type: Type.STRING, enum: ['Reels', 'Carrossel', 'Foto', 'Stories', 'Live'] },
      hook: str,
      hookCategory: str,
      cta: str,
      source: str,
      potential: { type: Type.STRING, enum: ['Alto', 'Médio', 'Muito Alto'] },
      whyDoThis: str,
      targetAudienceSnippet: str
    },
    required: ['title', 'description', 'pillar', 'objective', 'format', 'hook', 'cta', 'whyDoThis', 'potential']
  }
};

export const CLASSIFICATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    pillar: str,
    hookCategory: str,
    hypothesisReason: str,
    isHypothesis: { type: Type.BOOLEAN },
    confidence: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    improvementTip: str
  },
  required: ['pillar', 'hookCategory', 'hypothesisReason', 'isHypothesis', 'confidence', 'improvementTip']
};
