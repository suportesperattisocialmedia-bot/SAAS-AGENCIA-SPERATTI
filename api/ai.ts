/**
 * POST /api/ai?action=analyze-profile|generate-ideas|classify-content
 * Rotas opcionais de IA (Gemini), executadas só no backend. Unificadas em uma Function
 * para caber no limite de Functions do plano da Vercel.
 */

import { Errors } from '../server/http/errors.js';
import { route } from '../server/http/handler.js';
import { RATE_LIMITS } from '../server/http/rateLimit.js';
import { analyzeProfileHandler, classifyContentHandler, generateIdeasHandler } from '../server/services/aiRoutes.js';

const HANDLERS = {
  'analyze-profile': analyzeProfileHandler,
  'generate-ideas': generateIdeasHandler,
  'classify-content': classifyContentHandler
} as const;

export const POST = route(
  async (ctx) => {
    const action = ctx.url.searchParams.get('action') ?? '';
    const handler = HANDLERS[action as keyof typeof HANDLERS];
    if (!handler) throw Errors.invalid('Ação de IA inválida. Use analyze-profile, generate-ideas ou classify-content.');
    return handler(ctx);
  },
  { rateLimit: RATE_LIMITS.ai }
);
