/**
 * Auditoria das execuções de IA (modelo, versão do prompt, hash da entrada, saída validada).
 */

import { query } from '../db/database.js';
import { sha256 } from '../security/crypto.js';
import { log } from '../logging/logger.js';

export const aiAnalysisRepository = {
  /** Melhor esforço: falha de auditoria nunca derruba a resposta ao usuário. */
  async record(input: {
    agencyId: string;
    clientId: string;
    analysisType: string;
    model: string;
    promptVersion: string;
    input: unknown;
    output: unknown;
    requestId: string;
  }): Promise<void> {
    try {
      await query(
        `INSERT INTO ai_analyses (id, agency_id, client_id, analysis_type, model, prompt_version, input_hash, output, request_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
        [
          crypto.randomUUID(),
          input.agencyId,
          input.clientId,
          input.analysisType,
          input.model,
          input.promptVersion,
          sha256(JSON.stringify(input.input)),
          JSON.stringify(input.output),
          input.requestId
        ]
      );
    } catch (err) {
      log.warn('ai.audit_failed', { requestId: input.requestId, cause: err instanceof Error ? err : String(err) });
    }
  }
};
