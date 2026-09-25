/**
 * GET /api/auth/instagram/callback — destino do META_REDIRECT_URI.
 * Valida o state, troca o code por token no backend, persiste a conexão
 * (token criptografado) e redireciona ao frontend sem expor o token.
 */

import { readCookie, SESSION_COOKIE, verifySessionToken } from '../../../server/auth/session.js';
import { getSessionSecret } from '../../../server/config/env.js';
import { AppError } from '../../../server/http/errors.js';
import { redirect, route } from '../../../server/http/handler.js';
import { RATE_LIMITS } from '../../../server/http/rateLimit.js';
import { log } from '../../../server/logging/logger.js';
import { InstagramCallbackQuerySchema } from '../../../server/schemas/endpointSchemas.js';
import { buildFrontendRedirect, handleInstagramCallback, type CallbackOutcome } from '../../../server/services/instagramOAuthService.js';

export const GET = route(
  async ({ request, url, requestId }) => {
    const parsed = InstagramCallbackQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return redirect(buildFrontendRedirect({ ok: false, reason: 'INVALID_CALLBACK' }, request.url));
    }
    const query = parsed.data;

    const token = readCookie(request, SESSION_COOKIE);
    const session = token && getSessionSecret() ? verifySessionToken(token) : null;

    let outcome: CallbackOutcome;
    try {
      outcome = await handleInstagramCallback(
        {
          code: query.code ?? null,
          state: query.state ?? null,
          error: query.error ?? query.error_reason ?? null,
          sessionAgencyId: session?.aid ?? null
        },
        requestId
      );
    } catch (err) {
      // Nunca deixar o usuário numa página JSON de erro: volta ao app com um código seguro.
      log.error('oauth.instagram.callback.error', { requestId, cause: err instanceof Error ? err : String(err) });
      outcome = { ok: false, reason: err instanceof AppError ? err.code : 'INTERNAL_ERROR' };
    }
    return redirect(buildFrontendRedirect(outcome, request.url));
  },
  { rateLimit: RATE_LIMITS.oauth }
);
