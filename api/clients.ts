/**
 * GET    /api/clients            — clientes da agência autenticada
 * POST   /api/clients            — upsert (registro do cliente no servidor)
 * DELETE /api/clients?clientId=  — remoção lógica + revogação da conexão Instagram
 */

import { requireSession } from '../server/auth/session.js';
import { ok, parseQuery, readJson, route } from '../server/http/handler.js';
import { Errors } from '../server/http/errors.js';
import { clientRepository } from '../server/repositories/clientRepository.js';
import { ClientQuerySchema, UpsertClientRequestSchema } from '../server/schemas/endpointSchemas.js';

export const GET = route(async ({ request }) => {
  const user = await requireSession(request);
  return ok({ clients: await clientRepository.listByAgency(user.agencyId) });
});

export const POST = route(async ({ request }) => {
  const user = await requireSession(request);
  const body = await readJson(request, UpsertClientRequestSchema);
  const client = await clientRepository.upsert(user.agencyId, {
    id: body.id,
    name: body.profile.name,
    instagramHandle: body.profile.instagram,
    segment: body.profile.segment,
    profile: body.profile,
    status: body.status
  });
  return ok({ client });
});

export const DELETE = route(async ({ request, url }) => {
  const user = await requireSession(request);
  const { clientId } = parseQuery(url, ClientQuerySchema);
  const removed = await clientRepository.softDelete(user.agencyId, clientId);
  if (!removed) throw Errors.notFound('Cliente');
  return ok({ removed: true });
});
