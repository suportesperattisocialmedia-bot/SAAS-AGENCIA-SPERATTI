/**
 * databaseService — único ponto de acesso ao PostgreSQL (Supabase).
 *
 * Serverless: o Pool é um singleton guardado em globalThis, reutilizado entre
 * invocações da mesma instância (evita abrir conexão por request). Pool pequeno
 * (max 3) + idle timeout curto para não esgotar conexões. Com Supabase use a
 * connection string do *pooler* (Supavisor, porta 6543, modo transaction) —
 * node-postgres não usa prepared statements nomeados, então é compatível.
 */

import pg from 'pg';
import { getDatabaseUrl } from '../config/env.js';
import { AppError, Errors } from '../http/errors.js';

const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;
export type Queryable = Pick<PoolType, 'query'>;

interface GlobalWithPool {
  __speratti_pg_pool__?: { url: string; pool: PoolType };
}

const globalRef = globalThis as unknown as GlobalWithPool;

function sslConfig(connectionString: string): pg.PoolConfig['ssl'] {
  const mode = (process.env.DATABASE_SSL || '').toLowerCase();
  if (mode === 'disable') return false;
  if (mode === 'verify') return { rejectUnauthorized: true };
  const host = (() => {
    try {
      return new URL(connectionString).hostname;
    } catch {
      return '';
    }
  })();
  if (host === 'localhost' || host === '127.0.0.1' || /sslmode=disable/.test(connectionString)) return false;
  // Padrão Supabase/Vercel: TLS obrigatório; a cadeia do pooler não é validada pelo CA do Node por padrão.
  return { rejectUnauthorized: false };
}

export function isDatabaseConfigured(): boolean {
  return getDatabaseUrl() !== null;
}

export function getPool(): PoolType {
  const url = getDatabaseUrl();
  if (!url) throw Errors.databaseNotConfigured();

  const cached = globalRef.__speratti_pg_pool__;
  if (cached && cached.url === url) return cached.pool;

  const pool = new Pool({
    connectionString: url.replace(/([?&])sslmode=[^&]*/g, '$1').replace(/[?&]$/, ''),
    ssl: sslConfig(url),
    max: Number(process.env.DATABASE_POOL_MAX || 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    allowExitOnIdle: true
  });
  // Erros em clientes ociosos não devem derrubar a Function.
  pool.on('error', () => undefined);
  globalRef.__speratti_pg_pool__ = { url, pool };
  return pool;
}

function wrapDbError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  return new AppError('DATABASE_ERROR', 503, 'Falha ao acessar o banco de dados.', { cause: err });
}

export async function query<R extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
  db?: Queryable
): Promise<pg.QueryResult<R>> {
  try {
    return await (db ?? getPool()).query<R>(text, params);
  } catch (err) {
    throw wrapDbError(err);
  }
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  let client: pg.PoolClient;
  try {
    client = await getPool().connect();
  } catch (err) {
    throw wrapDbError(err);
  }
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw wrapDbError(err);
  } finally {
    client.release();
  }
}

export async function pingDatabase(): Promise<{ ok: boolean; latencyMs: number | null; migrated: boolean | null }> {
  if (!isDatabaseConfigured()) return { ok: false, latencyMs: null, migrated: null };
  const started = Date.now();
  try {
    const res = await getPool().query<{ migrated: boolean }>(
      "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS migrated"
    );
    return { ok: true, latencyMs: Date.now() - started, migrated: Boolean(res.rows[0]?.migrated) };
  } catch {
    return { ok: false, latencyMs: null, migrated: null };
  }
}

/** Encerra o pool (usado por scripts e testes). */
export async function closePool(): Promise<void> {
  const cached = globalRef.__speratti_pg_pool__;
  if (cached) {
    delete globalRef.__speratti_pg_pool__;
    await cached.pool.end();
  }
}
