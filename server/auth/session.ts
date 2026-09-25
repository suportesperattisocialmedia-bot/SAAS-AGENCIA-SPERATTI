/**
 * Sessão de usuário via cookie HttpOnly assinado (HMAC-SHA256 com SESSION_SECRET).
 * O cookie contém apenas identificadores (userId/agencyId/role) e expiração —
 * nunca tokens de terceiros. Toda request autenticada é revalidada no banco.
 */

import { z } from 'zod';
import { getSessionSecret, isProductionLike } from '../config/env.js';
import { Errors } from '../http/errors.js';
import { hmac, safeEqual } from '../security/crypto.js';
import { userRepository, type SessionUser } from '../repositories/userRepository.js';

export const SESSION_COOKIE = 'gs_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const SessionPayloadSchema = z.object({
  uid: z.string().uuid(),
  aid: z.string().uuid(),
  exp: z.number().int()
});
type SessionPayload = z.infer<typeof SessionPayloadSchema>;

function requireSecret(): string {
  const secret = getSessionSecret();
  if (!secret) throw Errors.sessionNotConfigured();
  return secret;
}

export function signSession(payload: SessionPayload, secret = requireSecret()): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(secret, `session:${body}`)}`;
}

export function verifySessionToken(token: string, secret = requireSecret(), now = Date.now()): SessionPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  if (!safeEqual(signature, hmac(secret, `session:${body}`))) return null;
  try {
    const parsed = SessionPayloadSchema.safeParse(JSON.parse(Buffer.from(body, 'base64url').toString('utf8')));
    if (!parsed.success || parsed.data.exp * 1000 <= now) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function cookieAttributes(maxAge: number): string {
  const secure = isProductionLike() ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function createSessionCookie(user: { id: string; agencyId: string }): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = signSession({ uid: user.id, aid: user.agencyId, exp });
  return `${SESSION_COOKIE}=${token}; ${cookieAttributes(SESSION_TTL_SECONDS)}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${cookieAttributes(0)}`;
}

/** Retorna o usuário autenticado (revalidado no banco) ou null. */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const user = await userRepository.findById(payload.uid);
  if (!user || user.agencyId !== payload.aid) return null;
  return user;
}

export async function requireSession(request: Request): Promise<SessionUser> {
  const user = await getSessionUser(request);
  if (!user) throw Errors.unauthenticated();
  return user;
}
