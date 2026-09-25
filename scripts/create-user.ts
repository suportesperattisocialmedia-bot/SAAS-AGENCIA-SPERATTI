/**
 * Cria um usuário. Sem --agency-id cria também uma nova agência (usuário owner).
 * Uso: DATABASE_URL=... npm run user:create -- --email a@b.com --name "Nome" --password "..." [--agency-name "..."] [--agency-id uuid --role admin|member]
 */

import 'dotenv/config';
import { closePool } from '../server/db/database.js';
import { userRepository, type Role } from '../server/repositories/userRepository.js';
import { hashPassword } from '../server/security/crypto.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const email = arg('email');
  const name = arg('name') ?? 'Administrador';
  const password = arg('password');
  if (!email || !password || password.length < 10) {
    throw new Error('Informe --email e --password (mínimo 10 caracteres).');
  }
  const passwordHash = await hashPassword(password);
  const agencyId = arg('agency-id');
  if (agencyId) {
    const role = (arg('role') ?? 'member') as Role;
    const id = await userRepository.createUser({ agencyId, email, name, passwordHash, role });
    console.log(`Usuário ${email} criado (${id}) na agência ${agencyId} com papel ${role}.`);
  } else {
    const user = await userRepository.createAgencyWithOwner({ agencyName: arg('agency-name') ?? 'Gabriel Speratti | Social Intelligence', email, name, passwordHash });
    console.log(`Agência ${user.agencyId} e usuário owner ${email} criados.`);
  }
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
