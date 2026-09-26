/**
 * Portal de aprovação do cliente.
 *
 * Público (link com token, sem conta):
 *   GET  /api/portal?token=                    — entregas aguardando aprovação
 *   POST /api/portal?action=decide             — { token, taskId, decision, comment? }
 *
 * Agência (sessão):
 *   GET  /api/portal?clientId=                 — links ativos do cliente
 *   POST /api/portal?action=create             — { clientId, clientName, days? } (revoga o anterior)
 *   POST /api/portal?action=revoke             — { id }
 */

import { requireSession } from '../server/auth/session.js';
import { ok, parseWith, readJson, route } from '../server/http/handler.js';
import { Errors } from '../server/http/errors.js';
import { RATE_LIMITS } from '../server/http/rateLimit.js';
import {
  ApprovalTokenSchema,
  ClientIdSchema,
  CreateApprovalLinkRequestSchema,
  PortalDecisionRequestSchema,
  RevokeApprovalLinkRequestSchema
} from '../server/schemas/endpointSchemas.js';
import { portalService } from '../server/services/portalService.js';

export const GET = route(
  async ({ request, url }) => {
    const token = url.searchParams.get('token');
    if (token !== null) {
      return ok(await portalService.view(parseWith(ApprovalTokenSchema, token)));
    }
    const user = await requireSession(request);
    const clientId = parseWith(ClientIdSchema, url.searchParams.get('clientId') ?? '');
    return ok({ links: await portalService.listLinks(user.agencyId, clientId) });
  },
  { rateLimit: RATE_LIMITS.portal }
);

export const POST = route(
  async ({ request, url }) => {
    const action = url.searchParams.get('action');
    if (action === 'decide') {
      const body = await readJson(request, PortalDecisionRequestSchema);
      return ok({ task: await portalService.decide(body) });
    }
    const user = await requireSession(request);
    if (action === 'create') {
      const body = await readJson(request, CreateApprovalLinkRequestSchema);
      return ok({ link: await portalService.createLink(user.agencyId, body) });
    }
    if (action === 'revoke') {
      const body = await readJson(request, RevokeApprovalLinkRequestSchema);
      if (!(await portalService.revokeLink(user.agencyId, body.id))) throw Errors.notFound('Link');
      return ok({ revoked: true });
    }
    throw Errors.invalid('Ação inválida. Use create, revoke ou decide.');
  },
  { rateLimit: RATE_LIMITS.portal }
);
