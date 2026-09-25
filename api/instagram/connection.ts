/**
 * GET    /api/instagram/connection?clientId=  — estado real da conexão (sem token)
 * DELETE /api/instagram/connection?clientId=  — desconecta e apaga o token
 *
 * Estados: NOT_CONFIGURED | DISCONNECTED | CONNECTED | SYNCING | ERROR | EXPIRED | REAUTH_REQUIRED
 */

import { requireSession } from '../../server/auth/session.js';
import { getMetaConfig } from '../../server/config/env.js';
import { ok, parseQuery, route } from '../../server/http/handler.js';
import { log } from '../../server/logging/logger.js';
import { clientRepository } from '../../server/repositories/clientRepository.js';
import { instagramConnectionRepository } from '../../server/repositories/instagramConnectionRepository.js';
import { ClientQuerySchema } from '../../server/schemas/endpointSchemas.js';

export const GET = route(async ({ request, url }) => {
  const { clientId } = parseQuery(url, ClientQuerySchema);
  const user = await requireSession(request);
  await clientRepository.requireForAgency(user.agencyId, clientId);

  const configured = getMetaConfig() !== null;
  const connection = await instagramConnectionRepository.findPublic(user.agencyId, clientId);
  const status = connection ? connection.status : configured ? 'DISCONNECTED' : 'NOT_CONFIGURED';
  return ok({ clientId, configured, status, connection });
});

export const DELETE = route(async ({ request, url, requestId }) => {
  const { clientId } = parseQuery(url, ClientQuerySchema);
  const user = await requireSession(request);
  await clientRepository.requireForAgency(user.agencyId, clientId);
  const disconnected = await instagramConnectionRepository.disconnect(user.agencyId, clientId);
  log.info('instagram.disconnected', { requestId, clientId, userId: user.id, disconnected });
  return ok({ clientId, status: 'DISCONNECTED' });
});
