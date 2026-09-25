/**
 * POST /api/ai/classify-content — executado somente no backend (GEMINI_API_KEY nunca chega ao navegador).
 */

import { route } from '../../server/http/handler.js';
import { RATE_LIMITS } from '../../server/http/rateLimit.js';
import { classifyContentHandler } from '../../server/services/aiRoutes.js';

export const POST = route(classifyContentHandler, { rateLimit: RATE_LIMITS.ai });
