/**
 * POST /api/instagram/sync            — executa a sincronização (idempotente)
 * GET  /api/instagram/sync?clientId=  — dados persistidos: conteúdos, snapshots e logs
 */

import { requireSession } from '../../server/auth/session.js';
import { ok, parseQuery, readJson, route } from '../../server/http/handler.js';
import { RATE_LIMITS } from '../../server/http/rateLimit.js';
import { clientRepository } from '../../server/repositories/clientRepository.js';
import { contentRepository, syncLogRepository } from '../../server/repositories/contentRepository.js';
import { ClientQuerySchema, SyncInstagramRequestSchema } from '../../server/schemas/endpointSchemas.js';
import { syncInstagram } from '../../server/services/instagramSyncService.js';

export const POST = route(
  async ({ request, requestId }) => {
    const user = await requireSession(request);
    const body = await readJson(request, SyncInstagramRequestSchema);
    const summary = await syncInstagram({ agencyId: user.agencyId, clientId: body.clientId, trigger: body.trigger, requestId });
    return ok({ summary });
  },
  { rateLimit: RATE_LIMITS.sync }
);

export const GET = route(async ({ request, url }) => {
  const { clientId } = parseQuery(url, ClientQuerySchema);
  const user = await requireSession(request);
  await clientRepository.requireForAgency(user.agencyId, clientId);
  const [contents, snapshots, syncLogs] = await Promise.all([
    contentRepository.listContents(user.agencyId, clientId),
    contentRepository.listAccountSnapshots(user.agencyId, clientId),
    syncLogRepository.list(user.agencyId, clientId)
  ]);
  return ok({ clientId, contents, snapshots, syncLogs });
});
