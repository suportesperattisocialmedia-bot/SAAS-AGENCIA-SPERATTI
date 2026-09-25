/**
 * GET    /api/session  — usuário autenticado (ou null)
 * POST   /api/session  — login { email, password }
 * DELETE /api/session  — logout
 */

import { clearSessionCookie, createSessionCookie, getSessionUser } from '../server/auth/session.js';
import { getSessionSecret } from '../server/config/env.js';
import { isDatabaseConfigured } from '../server/db/database.js';
import { Errors } from '../server/http/errors.js';
import { ok, readJson, route } from '../server/http/handler.js';
import { RATE_LIMITS } from '../server/http/rateLimit.js';
import { LoginRequestSchema } from '../server/schemas/endpointSchemas.js';
import { authenticate } from '../server/services/authService.js';

export const GET = route(async ({ request }) => {
  if (!isDatabaseConfigured() || !getSessionSecret()) {
    return ok({ authenticated: false, user: null, configured: false });
  }
  const user = await getSessionUser(request);
  return ok({ authenticated: Boolean(user), user, configured: true });
});

export const POST = route(
  async ({ request, requestId }) => {
    if (!isDatabaseConfigured()) throw Errors.databaseNotConfigured();
    if (!getSessionSecret()) throw Errors.sessionNotConfigured();
    const body = await readJson(request, LoginRequestSchema);
    const user = await authenticate(body.email, body.password, requestId);
    return ok({ authenticated: true, user }, { headers: { 'Set-Cookie': createSessionCookie(user) } });
  },
  { rateLimit: RATE_LIMITS.login }
);

export const DELETE = route(async () => ok({ authenticated: false }, { headers: { 'Set-Cookie': clearSessionCookie() } }));
