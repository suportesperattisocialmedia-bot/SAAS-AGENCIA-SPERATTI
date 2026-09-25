/**
 * OAuth state persistido no PostgreSQL (funciona com várias instâncias serverless).
 * - O valor do state é aleatório (32 bytes) e só o hash SHA-256 é armazenado.
 * - Expira em 10 minutos e é consumido atomicamente (proteção contra replay).
 */

import { query, type Queryable } from '../db/database.js';
import { randomToken, sha256 } from '../security/crypto.js';

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export type StateValidationError = 'STATE_MISSING' | 'STATE_NOT_FOUND' | 'STATE_EXPIRED' | 'STATE_ALREADY_USED';

export interface ConsumedState {
  stateId: string;
  agencyId: string;
  userId: string | null;
  clientId: string;
  nonce: string;
  createdAt: string;
  expiresAt: string;
}

export type StateValidationResult = { valid: true; state: ConsumedState } | { valid: false; error: StateValidationError };

interface StateRow {
  id: string;
  agency_id: string;
  user_id: string | null;
  client_id: string;
  nonce: string;
  created_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
}

export const oauthStateRepository = {
  async create(
    input: { agencyId: string; userId: string | null; clientId: string },
    db?: Queryable,
    now = new Date()
  ): Promise<{ state: string; stateId: string; expiresAt: Date }> {
    const state = randomToken(32);
    const stateId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + OAUTH_STATE_TTL_MS);
    await query(
      `INSERT INTO oauth_states (id, state_hash, agency_id, user_id, client_id, nonce, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [stateId, sha256(state), input.agencyId, input.userId, input.clientId, randomToken(16), now, expiresAt],
      db
    );
    // Limpeza oportunista de states vencidos há mais de 1 dia.
    await query("DELETE FROM oauth_states WHERE expires_at < now() - interval '1 day'", [], db);
    return { state, stateId, expiresAt };
  },

  /** Valida e consome o state em uma única instrução (atômico entre instâncias). */
  async consume(state: string | null | undefined, db?: Queryable, now = new Date()): Promise<StateValidationResult> {
    if (!state || state.length < 20 || state.length > 200) return { valid: false, error: state ? 'STATE_NOT_FOUND' : 'STATE_MISSING' };
    const hash = sha256(state);

    const consumed = await query<StateRow>(
      `UPDATE oauth_states SET consumed_at = $2
       WHERE state_hash = $1 AND consumed_at IS NULL AND expires_at > $2
       RETURNING id, agency_id, user_id, client_id, nonce, created_at, expires_at, consumed_at`,
      [hash, now],
      db
    );
    const row = consumed.rows[0];
    if (row) {
      return {
        valid: true,
        state: {
          stateId: row.id,
          agencyId: row.agency_id,
          userId: row.user_id,
          clientId: row.client_id,
          nonce: row.nonce,
          createdAt: row.created_at.toISOString(),
          expiresAt: row.expires_at.toISOString()
        }
      };
    }

    const existing = await query<StateRow>('SELECT consumed_at, expires_at FROM oauth_states WHERE state_hash = $1', [hash], db);
    const found = existing.rows[0];
    if (!found) return { valid: false, error: 'STATE_NOT_FOUND' };
    if (found.consumed_at) return { valid: false, error: 'STATE_ALREADY_USED' };
    return { valid: false, error: 'STATE_EXPIRED' };
  }
};
