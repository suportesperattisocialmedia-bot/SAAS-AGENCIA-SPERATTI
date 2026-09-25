/**
 * POST /api/ai/generate-ideas — executado somente no backend (GEMINI_API_KEY nunca chega ao navegador).
 */

import { route } from '../../server/http/handler.js';
import { RATE_LIMITS } from '../../server/http/rateLimit.js';
import { generateIdeasHandler } from '../../server/services/aiRoutes.js';

export const POST = route(generateIdeasHandler, { rateLimit: RATE_LIMITS.ai });
