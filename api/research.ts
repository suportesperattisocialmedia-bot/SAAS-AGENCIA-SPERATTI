/**
 * POST /api/research — { kind: 'audience' | 'competitors', clientId, segment, ... }
 * Sem provider externo configurado responde `configured: false` (nunca simula dados).
 */

import { requireSession } from '../server/auth/session.js';
import { ok, readJson, route } from '../server/http/handler.js';
import { RATE_LIMITS } from '../server/http/rateLimit.js';
import { clientRepository } from '../server/repositories/clientRepository.js';
import { ResearchRequestSchema } from '../server/schemas/endpointSchemas.js';
import { discoverCompetitors, runAudienceResearch } from '../server/services/researchService.js';

export const POST = route(
  async ({ request }) => {
    const user = await requireSession(request);
    const body = await readJson(request, ResearchRequestSchema);
    await clientRepository.requireForAgency(user.agencyId, body.clientId);
    const base = { agencyId: user.agencyId, clientId: body.clientId, segment: body.segment };
    if (body.kind === 'competitors') {
      return ok(await discoverCompetitors({ ...base, city: body.city }));
    }
    return ok(await runAudienceResearch({ ...base, category: body.category, query: body.query }));
  },
  { rateLimit: RATE_LIMITS.ai }
);
