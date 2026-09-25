/**
 * Repositório de clientes com isolamento por agência.
 * Nenhuma leitura/escrita é feita sem agency_id vindo da sessão autenticada.
 */

import { query, type Queryable } from '../db/database.js';
import { Errors } from '../http/errors.js';

export interface ClientRecord {
  id: string;
  agencyId: string;
  name: string;
  instagramHandle: string;
  segment: string;
  profile: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ClientRow {
  id: string;
  agency_id: string;
  name: string;
  instagram_handle: string;
  segment: string;
  profile: Record<string, unknown>;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function toRecord(row: ClientRow): ClientRecord {
  return {
    id: row.id,
    agencyId: row.agency_id,
    name: row.name,
    instagramHandle: row.instagram_handle,
    segment: row.segment,
    profile: row.profile ?? {},
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export const clientRepository = {
  async listByAgency(agencyId: string, db?: Queryable): Promise<ClientRecord[]> {
    const res = await query<ClientRow>(
      'SELECT * FROM clients WHERE agency_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
      [agencyId],
      db
    );
    return res.rows.map(toRecord);
  },

  async findForAgency(agencyId: string, clientId: string, db?: Queryable): Promise<ClientRecord | null> {
    const res = await query<ClientRow>(
      'SELECT * FROM clients WHERE id = $1 AND agency_id = $2 AND deleted_at IS NULL',
      [clientId, agencyId],
      db
    );
    return res.rows[0] ? toRecord(res.rows[0]) : null;
  },

  /** Garante que o cliente pertence à agência; caso contrário responde 404 (sem revelar existência). */
  async requireForAgency(agencyId: string, clientId: string, db?: Queryable): Promise<ClientRecord> {
    const client = await this.findForAgency(agencyId, clientId, db);
    if (!client) throw Errors.notFound('Cliente');
    return client;
  },

  /**
   * Upsert idempotente. Se o id já existir em OUTRA agência, nada é alterado e o
   * chamador recebe 404 — um cliente nunca migra de tenant.
   */
  async upsert(
    agencyId: string,
    input: { id: string; name: string; instagramHandle: string; segment: string; profile: Record<string, unknown>; status: string },
    db?: Queryable
  ): Promise<ClientRecord> {
    const res = await query<ClientRow>(
      `INSERT INTO clients (id, agency_id, name, instagram_handle, segment, profile, status)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         instagram_handle = EXCLUDED.instagram_handle,
         segment = EXCLUDED.segment,
         profile = EXCLUDED.profile,
         status = EXCLUDED.status,
         deleted_at = NULL,
         updated_at = now()
       WHERE clients.agency_id = EXCLUDED.agency_id
       RETURNING *`,
      [input.id, agencyId, input.name, input.instagramHandle, input.segment, JSON.stringify(input.profile), input.status],
      db
    );
    if (!res.rows[0]) throw Errors.notFound('Cliente');
    return toRecord(res.rows[0]);
  },

  async softDelete(agencyId: string, clientId: string, db?: Queryable): Promise<boolean> {
    const res = await query('UPDATE clients SET deleted_at = now(), updated_at = now() WHERE id = $1 AND agency_id = $2 AND deleted_at IS NULL', [
      clientId,
      agencyId
    ], db);
    await query("UPDATE instagram_connections SET status = 'DISCONNECTED', access_token_encrypted = '', updated_at = now() WHERE client_id = $1 AND agency_id = $2", [
      clientId,
      agencyId
    ], db);
    return (res.rowCount ?? 0) > 0;
  }
};
