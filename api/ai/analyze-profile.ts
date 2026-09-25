/**
 * POST /api/ai/analyze-profile — executado somente no backend (GEMINI_API_KEY nunca chega ao navegador).
 */

import { route } from '../../server/http/handler.js';
import { RATE_LIMITS } from '../../server/http/rateLimit.js';
import { analyzeProfileHandler } from '../../server/services/aiRoutes.js';

export const POST = route(analyzeProfileHandler, { rateLimit: RATE_LIMITS.ai });
