/**
 * InstagramConnection — conexão OAuth por cliente. O access token é salvo
 * apenas criptografado (AES-256-GCM) e nunca sai deste módulo em texto claro,
 * exceto para uso interno do InstagramProvider.
 */

import { query, type Queryable } from '../db/database.js';
import { decryptSecret, encryptSecret } from '../security/crypto.js';

export type ConnectionStatus = 'CONNECTED' | 'SYNCING' | 'ERROR' | 'EXPIRED' | 'REAUTH_REQUIRED' | 'DISCONNECTED';

/** Visão pública (segura para o frontend) — sem token. */
export interface PublicConnection {
  id: string;
  clientId: string;
  instagramAccountId: string;
  username: string | null;
  status: ConnectionStatus;
  scopes: string[];
  tokenExpiresAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConnectionRow {
  id: string;
  agency_id: string;
  client_id: string;
  instagram_account_id: string;
  facebook_page_id: string | null;
  username: string | null;
  access_token_encrypted: string;
  token_expires_at: Date | null;
  scopes: string[];
  status: ConnectionStatus;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
  last_sync_at: Date | null;
}

function effectiveStatus(row: ConnectionRow, now: Date): ConnectionStatus {
  if (row.status === 'DISCONNECTED') return 'DISCONNECTED';
  if (row.token_expires_at && row.token_expires_at.getTime() <= now.getTime()) return 'EXPIRED';
  return row.status;
}

function toPublic(row: ConnectionRow, now = new Date()): PublicConnection {
  return {
    id: row.id,
    clientId: row.client_id,
    instagramAccountId: row.instagram_account_id,
    username: row.username,
    status: effectiveStatus(row, now),
    scopes: row.scopes ?? [],
    tokenExpiresAt: row.token_expires_at?.toISOString() ?? null,
    lastSyncAt: row.last_sync_at?.toISOString() ?? null,
    lastError: row.last_error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export const instagramConnectionRepository = {
  async upsert(
    input: {
      agencyId: string;
      clientId: string;
      instagramAccountId: string;
      facebookPageId: string | null;
      username: string | null;
      accessToken: string;
      tokenExpiresAt: Date | null;
      scopes: string[];
    },
    db?: Queryable
  ): Promise<PublicConnection> {
    const res = await query<ConnectionRow>(
      `INSERT INTO instagram_connections
         (id, agency_id, client_id, instagram_account_id, facebook_page_id, username, access_token_encrypted, token_expires_at, scopes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CONNECTED')
       ON CONFLICT (client_id) DO UPDATE SET
         instagram_account_id = EXCLUDED.instagram_account_id,
         facebook_page_id = EXCLUDED.facebook_page_id,
         username = EXCLUDED.username,
         access_token_encrypted = EXCLUDED.access_token_encrypted,
         token_expires_at = EXCLUDED.token_expires_at,
         scopes = EXCLUDED.scopes,
         status = 'CONNECTED',
         last_error = NULL,
         updated_at = now()
       WHERE instagram_connections.agency_id = EXCLUDED.agency_id
       RETURNING *`,
      [
        crypto.randomUUID(),
        input.agencyId,
        input.clientId,
        input.instagramAccountId,
        input.facebookPageId,
        input.username,
        encryptSecret(input.accessToken),
        input.tokenExpiresAt,
        input.scopes
      ],
      db
    );
    if (!res.rows[0]) throw new Error('Conexão pertence a outra agência.');
    return toPublic(res.rows[0]);
  },

  async findPublic(agencyId: string, clientId: string, db?: Queryable): Promise<PublicConnection | null> {
    const res = await query<ConnectionRow>('SELECT * FROM instagram_connections WHERE agency_id = $1 AND client_id = $2', [agencyId, clientId], db);
    const row = res.rows[0];
    if (!row || row.status === 'DISCONNECTED') return null;
    return toPublic(row);
  },

  /** Uso exclusivo do backend: devolve o token descriptografado para chamadas à Graph API. */
  async getCredentials(
    agencyId: string,
    clientId: string,
    db?: Queryable
  ): Promise<{ connection: PublicConnection; accessToken: string } | null> {
    const res = await query<ConnectionRow>('SELECT * FROM instagram_connections WHERE agency_id = $1 AND client_id = $2', [agencyId, clientId], db);
    const row = res.rows[0];
    if (!row || row.status === 'DISCONNECTED' || !row.access_token_encrypted) return null;
    return { connection: toPublic(row), accessToken: decryptSecret(row.access_token_encrypted) };
  },

  async setStatus(agencyId: string, clientId: string, status: ConnectionStatus, lastError: string | null = null, db?: Queryable): Promise<void> {
    await query(
      `UPDATE instagram_connections SET status = $3, last_error = $4, updated_at = now(),
         last_sync_at = CASE WHEN $3 = 'CONNECTED' AND $4::text IS NULL THEN now() ELSE last_sync_at END
       WHERE agency_id = $1 AND client_id = $2`,
      [agencyId, clientId, status, lastError],
      db
    );
  },

  async updateToken(agencyId: string, clientId: string, accessToken: string, tokenExpiresAt: Date | null, db?: Queryable): Promise<void> {
    await query(
      `UPDATE instagram_connections SET access_token_encrypted = $3, token_expires_at = $4, updated_at = now()
       WHERE agency_id = $1 AND client_id = $2 AND status <> 'DISCONNECTED'`,
      [agencyId, clientId, encryptSecret(accessToken), tokenExpiresAt],
      db
    );
  },

  /** Desconecta e apaga o token (o registro permanece para auditoria). */
  async disconnect(agencyId: string, clientId: string, db?: Queryable): Promise<boolean> {
    const res = await query(
      `UPDATE instagram_connections SET status = 'DISCONNECTED', access_token_encrypted = '', token_expires_at = NULL, updated_at = now()
       WHERE agency_id = $1 AND client_id = $2 AND status <> 'DISCONNECTED'`,
      [agencyId, clientId],
      db
    );
    return (res.rowCount ?? 0) > 0;
  }
};
