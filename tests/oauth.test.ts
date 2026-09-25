import { beforeEach, describe, expect, it } from 'vitest';
import { GET as start } from '../api/auth/instagram/start.js';
import { GET as callback } from '../api/auth/instagram/callback.js';
import { getPool } from '../server/db/database.js';
import { oauthStateRepository, OAUTH_STATE_TTL_MS } from '../server/repositories/oauthStateRepository.js';
import { handleInstagramCallback } from '../server/services/instagramOAuthService.js';
import { MetaInstagramProvider } from '../server/providers/InstagramProvider.js';
import { getMetaConfig } from '../server/config/env.js';
import { resetRateLimits } from '../server/http/rateLimit.js';
import { createTenant, dbAvailable, req, resetDatabase } from './helpers/db.js';
import { createFakeMetaFetch, FAKE_ACCESS_TOKEN } from './helpers/fakeMeta.js';

describe.skipIf(!dbAvailable)('OAuth Instagram', () => {
  beforeEach(async () => {
    resetRateLimits();
    await resetDatabase();
  });

  it('start exige sessão', async () => {
    const res = await start(req('/api/auth/instagram/start?clientId=client-x'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: { code: 'UNAUTHENTICATED' } });
    expect(body.error.requestId).toBeTruthy();
  });

  it('start valida clientId', async () => {
    const { cookie } = await createTenant('A');
    const res = await start(req('/api/auth/instagram/start?clientId=../../etc', { cookie }));
    expect(res.status).toBe(400);
    const missing = await start(req('/api/auth/instagram/start', { cookie }));
    expect(missing.status).toBe(400);
  });

  it('start recusa cliente de outra agência', async () => {
    const a = await createTenant('A');
    const b = await createTenant('B');
    const res = await start(req(`/api/auth/instagram/start?clientId=${a.clientId}`, { cookie: b.cookie }));
    expect(res.status).toBe(404);
  });

  it('start responde 503 quando a Meta não está configurada', async () => {
    const { cookie, clientId } = await createTenant('A');
    const saved = process.env.META_APP_SECRET;
    delete process.env.META_APP_SECRET;
    try {
      const res = await start(req(`/api/auth/instagram/start?clientId=${clientId}`, { cookie }));
      expect(res.status).toBe(503);
      expect((await res.json()).error.code).toBe('META_NOT_CONFIGURED');
    } finally {
      process.env.META_APP_SECRET = saved;
    }
  });

  it('start gera state seguro, persiste só o hash e redireciona para a Meta', async () => {
    const { cookie, clientId } = await createTenant('A');
    const res = await start(req(`/api/auth/instagram/start?clientId=${clientId}`, { cookie }));
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location')!);
    expect(location.hostname).toBe('www.facebook.com');
    expect(location.searchParams.get('redirect_uri')).toBe('https://saas-agencia-speratti.vercel.app/api/auth/instagram/callback');
    expect(location.searchParams.get('client_id')).toBe('test-app-id');
    expect(location.searchParams.get('client_secret')).toBeNull();
    const state = location.searchParams.get('state')!;
    expect(state).not.toContain(clientId);
    expect(state.length).toBeGreaterThanOrEqual(40);

    const rows = await getPool().query('SELECT state_hash, client_id, expires_at, created_at FROM oauth_states');
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0].state_hash).not.toBe(state);
    expect(rows.rows[0].client_id).toBe(clientId);
    const ttl = rows.rows[0].expires_at.getTime() - rows.rows[0].created_at.getTime();
    expect(ttl).toBe(OAUTH_STATE_TTL_MS);

    const json = await start(req(`/api/auth/instagram/start?clientId=${clientId}&mode=json`, { cookie }));
    const body = await json.json();
    expect(body.data.authorizationUrl).toContain('dialog/oauth');
    expect(new URL(body.data.authorizationUrl).searchParams.get('state')).not.toBe(state);
  });

  it('state expira', async () => {
    const { user, clientId } = await createTenant('A');
    const created = await oauthStateRepository.create({ agencyId: user.agencyId, userId: user.id, clientId });
    const later = new Date(Date.now() + OAUTH_STATE_TTL_MS + 1000);
    expect(await oauthStateRepository.consume(created.state, undefined, later)).toEqual({ valid: false, error: 'STATE_EXPIRED' });
  });

  it('state não pode ser reutilizado (replay)', async () => {
    const { user, clientId } = await createTenant('A');
    const created = await oauthStateRepository.create({ agencyId: user.agencyId, userId: user.id, clientId });
    const first = await oauthStateRepository.consume(created.state);
    expect(first.valid).toBe(true);
    expect(await oauthStateRepository.consume(created.state)).toEqual({ valid: false, error: 'STATE_ALREADY_USED' });
  });

  it('callback com state inválido é rejeitado', async () => {
    const res = await callback(req('/api/auth/instagram/callback?code=abc&state=nao-existe-este-state-aleatorio-xyz'));
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location')!);
    expect(location.origin).toBe('https://saas-agencia-speratti.vercel.app');
    expect(location.searchParams.get('instagram')).toBe('error');
    expect(location.searchParams.get('reason')).toBe('STATE_NOT_FOUND');

    const noState = await callback(req('/api/auth/instagram/callback?code=abc'));
    expect(new URL(noState.headers.get('location')!).searchParams.get('reason')).toBe('STATE_MISSING');
  });

  it('callback sem code é rejeitado e consome o state', async () => {
    const { user, clientId } = await createTenant('A');
    const { state } = await oauthStateRepository.create({ agencyId: user.agencyId, userId: user.id, clientId });
    const res = await callback(req(`/api/auth/instagram/callback?state=${encodeURIComponent(state)}`));
    expect(new URL(res.headers.get('location')!).searchParams.get('reason')).toBe('CODE_MISSING');
    const again = await callback(req(`/api/auth/instagram/callback?state=${encodeURIComponent(state)}&code=abc`));
    expect(new URL(again.headers.get('location')!).searchParams.get('reason')).toBe('STATE_ALREADY_USED');
  });

  it('callback válido persiste conexão com token criptografado e não expõe o token', async () => {
    const { user, clientId } = await createTenant('A');
    const { state } = await oauthStateRepository.create({ agencyId: user.agencyId, userId: user.id, clientId });
    const fake = createFakeMetaFetch();
    const provider = new MetaInstagramProvider(getMetaConfig()!, fake.fetch);
    const outcome = await handleInstagramCallback({ code: 'auth-code', state, error: null, sessionAgencyId: user.agencyId }, 'req-1', provider);
    expect(outcome).toEqual({ ok: true, clientId, username: 'cliente_real' });

    const rows = await getPool().query('SELECT * FROM instagram_connections');
    expect(rows.rowCount).toBe(1);
    const row = rows.rows[0];
    expect(row.agency_id).toBe(user.agencyId);
    expect(row.instagram_account_id).toBe('ig-123');
    expect(row.access_token_encrypted).not.toContain(FAKE_ACCESS_TOKEN);
    expect(row.scopes).toContain('instagram_manage_insights');
    // Chamadas com token usam appsecret_proof; o secret nunca vai na URL fora da troca de code.
    expect(fake.calls.filter((c) => c.includes('/me/accounts')).every((c) => c.includes('appsecret_proof='))).toBe(true);
  });

  it('callback recusa state emitido para outra agência', async () => {
    const a = await createTenant('A');
    const b = await createTenant('B');
    const { state } = await oauthStateRepository.create({ agencyId: a.user.agencyId, userId: a.user.id, clientId: a.clientId });
    const outcome = await handleInstagramCallback({ code: 'x', state, error: null, sessionAgencyId: b.user.agencyId }, 'req-2');
    expect(outcome).toEqual({ ok: false, reason: 'STATE_AGENCY_MISMATCH' });
  });
});
