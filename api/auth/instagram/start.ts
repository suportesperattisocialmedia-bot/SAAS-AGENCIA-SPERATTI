/**
 * GET /api/auth/instagram/start?clientId=...&mode=redirect|json
 * Inicia o OAuth: valida sessão e cliente, gera state seguro e redireciona à Meta.
 */

import { requireSession } from '../../../server/auth/session.js';
import { ok, parseQuery, redirect, route } from '../../../server/http/handler.js';
import { RATE_LIMITS } from '../../../server/http/rateLimit.js';
import { InstagramStartQuerySchema } from '../../../server/schemas/endpointSchemas.js';
import { startInstagramOAuth } from '../../../server/services/instagramOAuthService.js';

export const GET = route(
  async ({ request, url, requestId }) => {
    const { clientId, mode } = parseQuery(url, InstagramStartQuerySchema);
    const user = await requireSession(request);
    const result = await startInstagramOAuth(user, clientId, requestId);
    return mode === 'json' ? ok(result) : redirect(result.authorizationUrl);
  },
  { rateLimit: RATE_LIMITS.oauth }
);
