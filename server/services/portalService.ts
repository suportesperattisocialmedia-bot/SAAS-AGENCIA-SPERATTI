/**
 * Portal de aprovação do cliente: links sem conta, com expiração e revogação.
 * O cliente só vê as entregas daquele cliente que estão em "Aprovação do cliente"
 * (e as que ele já decidiu), e só os campos pensados para ele (nunca as notas internas).
 */

import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../db/database.js';
import { AppError, Errors } from '../http/errors.js';
import { decryptSecret, encryptSecret, randomToken, sha256 } from '../security/crypto.js';

const TASKS_KEY = 'gs_intel_tasks';
const DAY_MS = 24 * 3600 * 1000;
/** Decisões recentes continuam visíveis para o cliente por este tempo. */
const DECIDED_VISIBLE_MS = 14 * DAY_MS;

export interface ApprovalLink {
  id: string;
  clientId: string;
  clientName: string;
  token: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  lastOpenedAt: string | null;
}

interface LinkRow {
  id: string;
  agency_id: string;
  client_id: string;
  client_name: string;
  token_encrypted: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
  last_opened_at: Date | null;
}

interface StoredTask {
  id: string;
  clientId?: string;
  title?: string;
  type?: string;
  status?: string;
  dueDate?: string;
  clientCopy?: string;
  previewUrl?: string;
  approvals?: Array<{ at: string; decision: 'approved' | 'changes'; comment?: string }>;
  updatedAt?: string;
  [k: string]: unknown;
}

export interface PortalTask {
  id: string;
  title: string;
  type: string;
  status: 'review' | 'decided';
  dueDate: string | null;
  clientCopy: string | null;
  previewUrl: string | null;
  lastDecision: { at: string; decision: 'approved' | 'changes'; comment: string | null } | null;
}

function toLink(row: LinkRow): ApprovalLink {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    token: decryptSecret(row.token_encrypted),
    expiresAt: row.expires_at.toISOString(),
    revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    lastOpenedAt: row.last_opened_at ? row.last_opened_at.toISOString() : null
  };
}

const safeUrl = (u: unknown): string | null => (typeof u === 'string' && /^https:\/\/[^\s]+$/i.test(u) ? u : null);

function toPortalTask(t: StoredTask): PortalTask {
  const last = t.approvals?.[t.approvals.length - 1];
  return {
    id: t.id,
    title: String(t.title ?? 'Entrega'),
    type: String(t.type ?? ''),
    status: t.status === 'review' ? 'review' : 'decided',
    dueDate: typeof t.dueDate === 'string' ? t.dueDate : null,
    clientCopy: typeof t.clientCopy === 'string' && t.clientCopy.trim() ? t.clientCopy : null,
    previewUrl: safeUrl(t.previewUrl),
    lastDecision: last ? { at: last.at, decision: last.decision, comment: last.comment ?? null } : null
  };
}

async function findActiveLink(token: string): Promise<LinkRow> {
  const res = await query<LinkRow>('SELECT * FROM approval_links WHERE token_hash = $1', [sha256(token)]);
  const row = res.rows[0];
  if (!row || row.revoked_at) throw Errors.notFound('Link de aprovação');
  if (row.expires_at.getTime() < Date.now()) {
    throw new AppError('LINK_EXPIRED', 410, 'Este link expirou. Peça um novo link à agência.');
  }
  return row;
}

export const portalService = {
  async listLinks(agencyId: string, clientId: string): Promise<ApprovalLink[]> {
    const res = await query<LinkRow>(
      'SELECT * FROM approval_links WHERE agency_id = $1 AND client_id = $2 AND revoked_at IS NULL AND expires_at > now() ORDER BY created_at DESC',
      [agencyId, clientId]
    );
    return res.rows.map(toLink);
  },

  /** Cria um link novo e revoga os anteriores do mesmo cliente (um link ativo por cliente). */
  async createLink(agencyId: string, input: { clientId: string; clientName: string; days: number }): Promise<ApprovalLink> {
    const token = randomToken(32);
    return withTransaction(async (tx) => {
      await tx.query('UPDATE approval_links SET revoked_at = now() WHERE agency_id = $1 AND client_id = $2 AND revoked_at IS NULL', [agencyId, input.clientId]);
      const res = await tx.query<LinkRow>(
        `INSERT INTO approval_links (id, agency_id, client_id, client_name, token_hash, token_encrypted, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 || ' days')::interval) RETURNING *`,
        [randomUUID(), agencyId, input.clientId, input.clientName, sha256(token), encryptSecret(token), String(input.days)]
      );
      return toLink(res.rows[0]);
    });
  },

  async revokeLink(agencyId: string, id: string): Promise<boolean> {
    const res = await query('UPDATE approval_links SET revoked_at = now() WHERE agency_id = $1 AND id = $2 AND revoked_at IS NULL', [agencyId, id]);
    return (res.rowCount ?? 0) > 0;
  },

  /** Visão pública do cliente (sem login). */
  async view(token: string, now = Date.now()): Promise<{ clientName: string; agencyName: string; expiresAt: string; tasks: PortalTask[] }> {
    const link = await findActiveLink(token);
    await query('UPDATE approval_links SET last_opened_at = now() WHERE id = $1', [link.id]);
    const [agency, doc] = await Promise.all([
      query<{ name: string }>('SELECT name FROM agencies WHERE id = $1', [link.agency_id]),
      query<{ data: StoredTask[] }>('SELECT data FROM workspace_documents WHERE agency_id = $1 AND key = $2', [link.agency_id, TASKS_KEY])
    ]);
    const tasks = (doc.rows[0]?.data ?? [])
      .filter((t) => t && typeof t.id === 'string' && t.clientId === link.client_id)
      .filter((t) => {
        if (t.status === 'review') return true;
        const last = t.approvals?.[t.approvals.length - 1];
        return !!last && now - Date.parse(last.at) < DECIDED_VISIBLE_MS;
      })
      .map(toPortalTask)
      .sort((a, b) => (a.status === b.status ? (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') : a.status === 'review' ? -1 : 1));
    return { clientName: link.client_name, agencyName: agency.rows[0]?.name ?? '', expiresAt: link.expires_at.toISOString(), tasks };
  },

  /**
   * Registra a decisão do cliente direto na coleção de tarefas sincronizada.
   * Aprovado -> "Aprovado"; ajustes -> volta para "Em produção" com o comentário.
   */
  async decide(input: { token: string; taskId: string; decision: 'approved' | 'changes'; comment?: string }): Promise<PortalTask> {
    const link = await findActiveLink(input.token);
    return withTransaction(async (tx) => {
      const res = await tx.query<{ data: StoredTask[] }>(
        'SELECT data FROM workspace_documents WHERE agency_id = $1 AND key = $2 FOR UPDATE',
        [link.agency_id, TASKS_KEY]
      );
      const tasks = res.rows[0]?.data ?? [];
      const idx = tasks.findIndex((t) => t && t.id === input.taskId && t.clientId === link.client_id);
      if (idx < 0) throw Errors.notFound('Entrega');
      const task = tasks[idx];
      if (task.status !== 'review') {
        throw new AppError('VERSION_CONFLICT', 409, 'Esta entrega não está mais aguardando aprovação.');
      }
      const at = new Date().toISOString();
      const comment = input.comment?.trim() || undefined;
      const updated: StoredTask = {
        ...task,
        status: input.decision === 'approved' ? 'approved' : 'doing',
        approvals: [...(task.approvals ?? []), { at, decision: input.decision, ...(comment ? { comment } : {}) }].slice(-20),
        updatedAt: at
      };
      tasks[idx] = updated;
      await tx.query(
        'UPDATE workspace_documents SET data = $3::jsonb, version = version + 1, updated_at = now() WHERE agency_id = $1 AND key = $2',
        [link.agency_id, TASKS_KEY, JSON.stringify(tasks)]
      );
      await tx.query(
        'INSERT INTO approval_events (id, agency_id, link_id, task_id, decision, comment) VALUES ($1, $2, $3, $4, $5, $6)',
        [randomUUID(), link.agency_id, link.id, input.taskId, input.decision, comment ?? null]
      );
      return toPortalTask(updated);
    });
  }
};
