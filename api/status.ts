/**
 * GET /api/status — health check público. Não expõe secrets, apenas se cada
 * integração está configurada.
 */

import { SERVICE_NAME, getEnvironment, getGeminiConfig, getMetaConfig, getSessionSecret, getVersion, isResearchConfigured } from '../server/config/env.js';
import { isDatabaseConfigured, pingDatabase } from '../server/db/database.js';
import { json, route } from '../server/http/handler.js';

export const GET = route(async ({ url }) => {
  const checkDb = url.searchParams.get('db') !== '0';
  const database = checkDb ? await pingDatabase() : { ok: false, latencyMs: null, migrated: null };
  const gemini = getGeminiConfig();

  return json({
    ok: true,
    service: SERVICE_NAME,
    environment: getEnvironment(),
    timestamp: new Date().toISOString(),
    version: getVersion(),
    integrations: {
      database: {
        configured: isDatabaseConfigured(),
        reachable: checkDb ? database.ok : null,
        migrated: database.migrated,
        latencyMs: database.latencyMs
      },
      session: { configured: getSessionSecret() !== null },
      instagram: { configured: getMetaConfig() !== null },
      gemini: { configured: gemini !== null, model: gemini?.model ?? null },
      research: { configured: isResearchConfigured() }
    }
  });
});
