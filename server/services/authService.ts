/**
 * Autenticação por e-mail/senha (hash scrypt no banco).
 * Bootstrap opcional: se não houver nenhum usuário e as credenciais baterem com
 * ADMIN_EMAIL/ADMIN_PASSWORD, cria a agência + usuário owner no primeiro login.
 */

import { getBootstrapAdmin } from '../config/env.js';
import { AppError } from '../http/errors.js';
import { log } from '../logging/logger.js';
import { userRepository, type SessionUser } from '../repositories/userRepository.js';
import { hashPassword, safeEqual, verifyPassword } from '../security/crypto.js';

const invalid = () => new AppError('INVALID_CREDENTIALS', 401, 'E-mail ou senha inválidos.');

// Hash fictício para equalizar o tempo de resposta quando o e-mail não existe.
let dummyHash: Promise<string> | null = null;

export async function authenticate(email: string, password: string, requestId: string): Promise<SessionUser> {
  const user = await userRepository.findByEmailWithHash(email);
  if (user) {
    if (!(await verifyPassword(password, user.passwordHash))) {
      log.warn('auth.login_failed', { requestId, reason: 'bad_password' });
      throw invalid();
    }
    await userRepository.touchLogin(user.id);
    const { passwordHash: _omit, ...sessionUser } = user;
    log.info('auth.login', { requestId, userId: user.id, agencyId: user.agencyId });
    return sessionUser;
  }

  const bootstrap = getBootstrapAdmin();
  if (bootstrap && email.toLowerCase() === bootstrap.email && safeEqual(password, bootstrap.password) && (await userRepository.count()) === 0) {
    const created = await userRepository.createAgencyWithOwner({
      agencyName: bootstrap.agencyName,
      email: bootstrap.email,
      name: bootstrap.name,
      passwordHash: await hashPassword(password)
    });
    log.info('auth.bootstrap_owner_created', { requestId, userId: created.id, agencyId: created.agencyId });
    return created;
  }

  dummyHash ??= hashPassword('timing-equalizer');
  await verifyPassword(password, await dummyHash);
  log.warn('auth.login_failed', { requestId, reason: 'unknown_email' });
  throw invalid();
}
