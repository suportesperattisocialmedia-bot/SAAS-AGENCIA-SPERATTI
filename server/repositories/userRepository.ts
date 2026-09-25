/**
 * Repositório de agências e usuários.
 */

import { query, withTransaction, type Queryable } from '../db/database.js';

export type Role = 'owner' | 'admin' | 'member';

export interface SessionUser {
  id: string;
  agencyId: string;
  agencyName: string;
  email: string;
  name: string;
  role: Role;
}

interface UserRow {
  id: string;
  agency_id: string;
  agency_name: string;
  email: string;
  name: string;
  role: Role;
  password_hash: string;
}

function toSessionUser(row: UserRow): SessionUser {
  return { id: row.id, agencyId: row.agency_id, agencyName: row.agency_name, email: row.email, name: row.name, role: row.role };
}

const SELECT_USER = `
  SELECT u.id, u.agency_id, a.name AS agency_name, u.email, u.name, u.role, u.password_hash
  FROM users u JOIN agencies a ON a.id = u.agency_id`;

export const userRepository = {
  async findById(id: string, db?: Queryable): Promise<SessionUser | null> {
    const res = await query<UserRow>(`${SELECT_USER} WHERE u.id = $1`, [id], db);
    return res.rows[0] ? toSessionUser(res.rows[0]) : null;
  },

  async findByEmailWithHash(email: string, db?: Queryable): Promise<(SessionUser & { passwordHash: string }) | null> {
    const res = await query<UserRow>(`${SELECT_USER} WHERE lower(u.email) = lower($1)`, [email], db);
    const row = res.rows[0];
    return row ? { ...toSessionUser(row), passwordHash: row.password_hash } : null;
  },

  async count(db?: Queryable): Promise<number> {
    const res = await query<{ n: string }>('SELECT count(*)::text AS n FROM users', [], db);
    return Number(res.rows[0]?.n ?? 0);
  },

  async touchLogin(id: string, db?: Queryable): Promise<void> {
    await query('UPDATE users SET last_login_at = now() WHERE id = $1', [id], db);
  },

  /** Cria agência + usuário owner numa transação. */
  async createAgencyWithOwner(input: { agencyName: string; email: string; name: string; passwordHash: string }): Promise<SessionUser> {
    return withTransaction(async (tx) => {
      const agencyId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      await tx.query('INSERT INTO agencies (id, name) VALUES ($1, $2)', [agencyId, input.agencyName]);
      await tx.query(
        "INSERT INTO users (id, agency_id, email, name, password_hash, role) VALUES ($1, $2, lower($3), $4, $5, 'owner')",
        [userId, agencyId, input.email, input.name, input.passwordHash]
      );
      return { id: userId, agencyId, agencyName: input.agencyName, email: input.email.toLowerCase(), name: input.name, role: 'owner' };
    });
  },

  async createUser(input: { agencyId: string; email: string; name: string; passwordHash: string; role: Role }): Promise<string> {
    const id = crypto.randomUUID();
    await query('INSERT INTO users (id, agency_id, email, name, password_hash, role) VALUES ($1, $2, lower($3), $4, $5, $6)', [
      id,
      input.agencyId,
      input.email,
      input.name,
      input.passwordHash,
      input.role
    ]);
    return id;
  }
};
