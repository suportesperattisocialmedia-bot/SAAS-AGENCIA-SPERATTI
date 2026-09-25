import { getPool } from '../../server/db/database.js';
import { migrate } from '../../scripts/db-migrate.js';
import { userRepository, type SessionUser } from '../../server/repositories/userRepository.js';
import { clientRepository } from '../../server/repositories/clientRepository.js';
import { createSessionCookie } from '../../server/auth/session.js';
import { hashPassword } from '../../server/security/crypto.js';

export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await getPool().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export const dbAvailable = await isDatabaseAvailable();

let migrated = false;
export async function resetDatabase(): Promise<void> {
  if (!migrated) {
    await migrate();
    migrated = true;
  }
  await getPool().query('TRUNCATE agencies, schema_migrations RESTART IDENTITY CASCADE');
  await getPool().query("INSERT INTO schema_migrations (id) VALUES ('001_initial_schema')");
}

export async function createTenant(label: string, password = 'senha-super-segura-123'): Promise<{ user: SessionUser; cookie: string; clientId: string }> {
  const user = await userRepository.createAgencyWithOwner({
    agencyName: `Agência ${label}`,
    email: `${label.toLowerCase()}@example.com`,
    name: `Owner ${label}`,
    passwordHash: await hashPassword(password)
  });
  const clientId = `client-${label.toLowerCase()}-${crypto.randomUUID()}`;
  await clientRepository.upsert(user.agencyId, {
    id: clientId,
    name: `Cliente ${label}`,
    instagramHandle: `@cliente_${label.toLowerCase()}`,
    segment: 'Saúde',
    profile: { name: `Cliente ${label}` },
    status: 'active'
  });
  const cookie = createSessionCookie(user).split(';')[0];
  return { user, cookie, clientId };
}

export const APP = 'https://saas-agencia-speratti.vercel.app';

export function req(path: string, init: RequestInit & { cookie?: string; json?: unknown } = {}): Request {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set('cookie', init.cookie);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.json);
  }
  return new Request(`${APP}${path}`, { ...init, headers, body });
}
