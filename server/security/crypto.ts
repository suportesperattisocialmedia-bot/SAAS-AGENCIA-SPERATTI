/**
 * Primitivas criptográficas do backend.
 * - Tokens OAuth: AES-256-GCM com chave derivada via HKDF-SHA256 do secret de ambiente.
 * - Senhas: scrypt com salt aleatório.
 * - State OAuth / sessão: bytes aleatórios + HMAC-SHA256.
 */

import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { getTokenEncryptionSecret } from '../config/env.js';
import { AppError } from '../http/errors.js';

const TOKEN_FORMAT_VERSION = 'v1';

function deriveKey(secret: string, info: string): Buffer {
  return Buffer.from(hkdfSync('sha256', Buffer.from(secret, 'utf8'), Buffer.from('speratti-social-intelligence'), Buffer.from(info), 32));
}

function tokenKey(): Buffer {
  const secret = getTokenEncryptionSecret();
  if (!secret) {
    throw new AppError('SESSION_NOT_CONFIGURED', 503, 'Chave de criptografia não configurada (SESSION_SECRET).');
  }
  return deriveKey(secret, 'oauth-token-encryption');
}

/** Criptografa um segredo para armazenamento. Formato: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encryptSecret(plaintext: string, key: Buffer = tokenKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [TOKEN_FORMAT_VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptSecret(payload: string, key: Buffer = tokenKey()): string {
  const [version, iv, tag, data] = payload.split('.');
  if (version !== TOKEN_FORMAT_VERSION || !iv || !tag || !data) {
    throw new Error('Formato de segredo criptografado inválido.');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hmac(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** appsecret_proof exigido/recomendado pela Graph API para chamadas server-side. */
export function appSecretProof(accessToken: string, appSecret: string): string {
  return createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

const SCRYPT_N = 16384;
const SCRYPT_KEYLEN = 64;

function scryptAsync(password: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, { N: SCRYPT_N, r: 8, p: 1 }, (err, derived) => (err ? reject(err) : resolve(derived)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${SCRYPT_N}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || Number(n) !== SCRYPT_N || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const derived = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
