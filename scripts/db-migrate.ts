/**
 * Aplica as migrations SQL de db/migrations em ordem (idempotente).
 * Uso: DATABASE_URL=... npm run db:migrate
 */

import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, getPool } from '../server/db/database.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');

export async function migrate(): Promise<string[]> {
  const pool = getPool();
  const applied: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      applied.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  return applied;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  migrate()
    .then((files) => console.log(`Migrations aplicadas: ${files.join(', ')}`))
    .catch((err: unknown) => {
      console.error('Falha ao aplicar migrations:', err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => closePool());
}
