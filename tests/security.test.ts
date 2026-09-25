import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { decryptSecret, encryptSecret, hashPassword, verifyPassword } from '../server/security/crypto.js';
import { signSession, verifySessionToken } from '../server/auth/session.js';
import { redact, redactString } from '../server/logging/logger.js';
import { checkRateLimit, resetRateLimits } from '../server/http/rateLimit.js';

describe('criptografia de tokens', () => {
  it('criptografa com AES-GCM e não guarda texto claro', () => {
    const token = 'EAAsecret-token-value-123456789';
    const enc = encryptSecret(token);
    expect(enc).not.toContain(token);
    expect(enc.startsWith('v1.')).toBe(true);
    expect(decryptSecret(enc)).toBe(token);
    expect(encryptSecret(token)).not.toBe(enc); // IV aleatório
  });

  it('rejeita payload adulterado ou chave diferente', () => {
    const enc = encryptSecret('abc');
    const parts = enc.split('.');
    parts[3] = Buffer.from('xyz').toString('base64url');
    expect(() => decryptSecret(parts.join('.'))).toThrow();
    expect(() => decryptSecret(enc, randomBytes(32))).toThrow();
  });
});

describe('senhas', () => {
  it('hash scrypt verifica corretamente', async () => {
    const hash = await hashPassword('senha-muito-segura');
    expect(hash).not.toContain('senha-muito-segura');
    expect(await verifyPassword('senha-muito-segura', hash)).toBe(true);
    expect(await verifyPassword('outra', hash)).toBe(false);
  });
});

describe('sessão assinada', () => {
  const payload = { uid: crypto.randomUUID(), aid: crypto.randomUUID(), exp: Math.floor(Date.now() / 1000) + 60 };
  it('valida assinatura e expiração', () => {
    const token = signSession(payload);
    expect(verifySessionToken(token)).toEqual(payload);
    expect(verifySessionToken(token.slice(0, -2) + 'aa')).toBeNull();
    expect(verifySessionToken(signSession({ ...payload, exp: 1 }))).toBeNull();
    expect(verifySessionToken(token, 'outro-secret-com-mais-de-32-caracteres-xx')).toBeNull();
  });
});

describe('logs', () => {
  it('redige secrets em chaves e strings', () => {
    const out = redact({ accessToken: 'EAAabc', nested: { url: 'https://graph.facebook.com/x?access_token=EAAxyz&a=1' }, databaseUrl: 'postgres://u:p@h/db' }) as Record<string, unknown>;
    expect(JSON.stringify(out)).not.toContain('EAAabc');
    expect(JSON.stringify(out)).not.toContain('EAAxyz');
    expect(JSON.stringify(out)).not.toContain('u:p@h');
    expect(redactString('postgresql://user:pass@host:5432/db')).toBe('[REDACTED]');
    expect(redactString('key AQ.Ab8RN6Ixxxxxxxxxxxxxxxxxxxxxxxx end')).toBe('key [REDACTED] end');
  });
});

describe('rate limit', () => {
  it('bloqueia após o limite na janela', () => {
    resetRateLimits();
    const rule = { name: 't', limit: 2, windowMs: 1000 };
    expect(checkRateLimit(rule, 'ip', 0)).toBe(true);
    expect(checkRateLimit(rule, 'ip', 1)).toBe(true);
    expect(checkRateLimit(rule, 'ip', 2)).toBe(false);
    expect(checkRateLimit(rule, 'ip', 1001)).toBe(true);
  });
});

import { describeGeminiError } from '../server/services/geminiService.js';

describe('erros do Gemini', () => {
  it('traduz o motivo sem expor detalhes', () => {
    const invalid = Object.assign(new Error('{"error":{"code":400,"message":"API key not valid.","details":[{"reason":"API_KEY_INVALID"}]}}'), { status: 400 });
    expect(describeGeminiError(invalid, 'gemini-2.5-flash').reason).toBe('KEY_INVALID');
    expect(describeGeminiError(Object.assign(new Error('RESOURCE_EXHAUSTED'), { status: 429 }), 'm').status).toBe(429);
    expect(describeGeminiError(Object.assign(new Error('models/x is not found'), { status: 404 }), 'x').reason).toBe('MODEL_NOT_FOUND');
    expect(describeGeminiError(new Error('boom'), 'm').message).not.toContain('boom');
  });
});

describe('variáveis de ambiente', () => {
  it('ignora aspas e espaços colados no painel', async () => {
    const { getGeminiConfig } = await import('../server/config/env.js');
    process.env.GEMINI_API_KEY = '  "AIzaExemplo"  ';
    expect(getGeminiConfig()?.apiKey).toBe('AIzaExemplo');
    delete process.env.GEMINI_API_KEY;
  });
});
