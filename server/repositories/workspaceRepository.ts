/**
 * Documentos do workspace (uma coleção do app por chave), isolados por agência,
 * com controle de concorrência otimista por versão.
 */

import { query, type Queryable } from '../db/database.js';

export interface WorkspaceDocument {
  key: string;
  data: unknown[];
  version: number;
  updatedAt: string;
}

interface Row {
  key: string;
  data: unknown[];
  version: number;
  updated_at: Date;
}

const toDoc = (r: Row): WorkspaceDocument => ({ key: r.key, data: r.data, version: r.version, updatedAt: r.updated_at.toISOString() });

export type SaveResult = { ok: true; doc: WorkspaceDocument } | { ok: false; current: WorkspaceDocument | null };

export const workspaceRepository = {
  async list(agencyId: string, db?: Queryable): Promise<WorkspaceDocument[]> {
    const res = await query<Row>('SELECT key, data, version, updated_at FROM workspace_documents WHERE agency_id = $1 ORDER BY key', [agencyId], db);
    return res.rows.map(toDoc);
  },

  async get(agencyId: string, key: string, db?: Queryable): Promise<WorkspaceDocument | null> {
    const res = await query<Row>('SELECT key, data, version, updated_at FROM workspace_documents WHERE agency_id = $1 AND key = $2', [agencyId, key], db);
    return res.rows[0] ? toDoc(res.rows[0]) : null;
  },

  /**
   * Grava se a versão lida (baseVersion) ainda é a atual. baseVersion 0 = documento novo.
   * Em conflito, devolve o documento atual para o app mesclar.
   */
  async save(agencyId: string, key: string, data: unknown[], baseVersion: number, db?: Queryable): Promise<SaveResult> {
    const payload = JSON.stringify(data);
    const res =
      baseVersion === 0
        ? await query<Row>(
            `INSERT INTO workspace_documents (agency_id, key, data) VALUES ($1, $2, $3::jsonb)
             ON CONFLICT (agency_id, key) DO NOTHING
             RETURNING key, data, version, updated_at`,
            [agencyId, key, payload],
            db
          )
        : await query<Row>(
            `UPDATE workspace_documents SET data = $3::jsonb, version = version + 1, updated_at = now()
             WHERE agency_id = $1 AND key = $2 AND version = $4
             RETURNING key, data, version, updated_at`,
            [agencyId, key, payload, baseVersion],
            db
          );
    if (res.rows[0]) return { ok: true, doc: toDoc(res.rows[0]) };
    return { ok: false, current: await this.get(agencyId, key, db) };
  }
};
