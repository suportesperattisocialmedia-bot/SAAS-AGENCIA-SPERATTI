/**
 * GET /api/workspace  — todos os documentos do workspace da agência (com versão)
 * PUT /api/workspace  — grava uma coleção { key, baseVersion, data }; 409 se outra
 *                       gravação aconteceu antes (o app mescla e tenta de novo)
 */

import { requireSession } from '../server/auth/session.js';
import { json, ok, readJson, route } from '../server/http/handler.js';
import { RATE_LIMITS } from '../server/http/rateLimit.js';
import { workspaceRepository } from '../server/repositories/workspaceRepository.js';
import { WorkspaceSaveRequestSchema } from '../server/schemas/endpointSchemas.js';

/** Métricas importadas de anos de CSV cabem com folga; acima disso algo está errado. */
const MAX_WORKSPACE_BYTES = 4 * 1024 * 1024;

export const GET = route(
  async ({ request }) => {
    const user = await requireSession(request);
    return ok({ documents: await workspaceRepository.list(user.agencyId) });
  },
  { rateLimit: RATE_LIMITS.workspace }
);

export const PUT = route(
  async ({ request, requestId }) => {
    const user = await requireSession(request);
    const body = await readJson(request, WorkspaceSaveRequestSchema, MAX_WORKSPACE_BYTES);
    const result = await workspaceRepository.save(user.agencyId, body.key, body.data, body.baseVersion);
    if (result.ok) return ok({ document: result.doc });
    return json(
      {
        ok: false,
        error: { code: 'VERSION_CONFLICT', message: 'Os dados mudaram em outro aparelho. Mesclando.', requestId },
        data: { document: result.current }
      },
      { status: 409 }
    );
  },
  { rateLimit: RATE_LIMITS.workspace }
);
