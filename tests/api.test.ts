import { beforeEach, describe, expect, it } from 'vitest';
import { GET as sessionGet, POST as login, DELETE as logout } from '../api/session.js';
import { GET as listClients, POST as upsertClient } from '../api/clients.js';
import { GET as connectionGet, DELETE as connectionDelete } from '../api/instagram/connection.js';
import { GET as syncGet, POST as syncPost } from '../api/instagram/sync.js';
import { POST as analyze } from '../api/ai/analyze-profile.js';
import { POST as ideas } from '../api/ai/generate-ideas.js';
import { POST as classify } from '../api/ai/classify-content.js';
import { POST as research } from '../api/research.js';
import { getPool } from '../server/db/database.js';
import { setGeminiGeneratorForTests } from '../server/services/geminiService.js';
import { resetRateLimits } from '../server/http/rateLimit.js';
import { createTenant, dbAvailable, req, resetDatabase } from './helpers/db.js';

const validDiagnostic = {
  profileSection: { photoAnalysis: 'a', bioClarity: 'b', valueProposition: 'c', perceivedAuthority: 'd' },
  contentSection: { publishingFrequency: 'a', editorialPillars: 'b', captionQuality: 'c', hookUsage: 'd', ctaEffectiveness: 'e' },
  performanceSection: { engagementAnalysis: 'a', savesAndShares: 'b', bestContentObservations: 'c' },
  strategySection: { strengths: ['x'], vulnerabilities: ['y'], immediateOpportunities: ['z'], recommendedFormats: ['Reels'] },
  nextActions: ['agir']
};

describe.skipIf(!dbAvailable)('API', () => {
  beforeEach(async () => {
    resetRateLimits();
    setGeminiGeneratorForTests(null);
    delete process.env.GEMINI_API_KEY;
    await resetDatabase();
  });

  describe('sessão', () => {
    it('login válido define cookie HttpOnly; inválido retorna 401 genérico', async () => {
      await createTenant('A', 'senha-correta-123');
      const bad = await login(req('/api/session', { method: 'POST', json: { email: 'a@example.com', password: 'errada' } }));
      expect(bad.status).toBe(401);
      expect((await bad.json()).error.code).toBe('INVALID_CREDENTIALS');

      const good = await login(req('/api/session', { method: 'POST', json: { email: 'A@example.com', password: 'senha-correta-123' } }));
      expect(good.status).toBe(200);
      const cookie = good.headers.get('set-cookie')!;
      expect(cookie).toMatch(/gs_session=.+; Path=\/; HttpOnly; SameSite=Lax/);
      const me = await sessionGet(req('/api/session', { cookie: cookie.split(';')[0] }));
      expect((await me.json()).data.user.email).toBe('a@example.com');
      const out = await logout(req('/api/session', { method: 'DELETE' }));
      expect(out.headers.get('set-cookie')).toContain('Max-Age=0');
    });

    it('bootstrap cria o primeiro owner via ADMIN_EMAIL/ADMIN_PASSWORD somente com banco vazio', async () => {
      process.env.ADMIN_EMAIL = 'dono@agencia.com';
      process.env.ADMIN_PASSWORD = 'bootstrap-senha-forte';
      try {
        const res = await login(req('/api/session', { method: 'POST', json: { email: 'dono@agencia.com', password: 'bootstrap-senha-forte' } }));
        expect(res.status).toBe(200);
        expect((await res.json()).data.user.role).toBe('owner');
        const stored = await getPool().query('SELECT password_hash FROM users');
        expect(stored.rows[0].password_hash).toMatch(/^scrypt\$/);
      } finally {
        delete process.env.ADMIN_EMAIL;
        delete process.env.ADMIN_PASSWORD;
      }
    });
  });

  describe('validação', () => {
    it('rejeita JSON malformado, schema inválido, content-type errado e payload grande', async () => {
      const { cookie } = await createTenant('A');
      const malformed = await login(new Request('https://saas-agencia-speratti.vercel.app/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' }));
      expect(malformed.status).toBe(400);
      const invalid = await login(req('/api/session', { method: 'POST', json: { email: 'nao-e-email', password: '' } }));
      expect(invalid.status).toBe(400);
      expect((await invalid.json()).error.details.length).toBeGreaterThan(0);
      const wrongType = await upsertClient(req('/api/clients', { method: 'POST', cookie, body: 'x', headers: { 'content-type': 'text/plain' } }));
      expect(wrongType.status).toBe(400);
      const huge = await upsertClient(req('/api/clients', { method: 'POST', cookie, json: { id: 'client-x', profile: { name: 'x'.repeat(300_000) } } }));
      expect(huge.status).toBe(413);
    });

    it('bloqueia POST cross-origin (CSRF)', async () => {
      const { cookie } = await createTenant('A');
      const res = await upsertClient(req('/api/clients', { method: 'POST', cookie, headers: { origin: 'https://evil.example' }, json: { id: 'client-x', profile: { name: 'X' } } }));
      expect(res.status).toBe(403);
    });

    it('erros não vazam stack nem mensagens internas', async () => {
      const { cookie } = await createTenant('A');
      const saved = process.env.DATABASE_URL;
      const res = await listClients(req('/api/clients', { cookie: `${cookie}x` }));
      expect(res.status).toBe(401);
      const text = await res.text();
      expect(text).not.toMatch(/at \w+ \(|node_modules|postgres:\/\//);
      process.env.DATABASE_URL = saved;
    });
  });

  describe('isolamento entre clientes/agências', () => {
    it('agência B não lê, altera, sincroniza nem usa IA com cliente da agência A', async () => {
      const a = await createTenant('A');
      const b = await createTenant('B');

      const list = await (await listClients(req('/api/clients', { cookie: b.cookie }))).json();
      expect(list.data.clients.map((c: { id: string }) => c.id)).not.toContain(a.clientId);

      const takeover = await upsertClient(req('/api/clients', { method: 'POST', cookie: b.cookie, json: { id: a.clientId, profile: { name: 'Roubado' } } }));
      expect(takeover.status).toBe(404);
      const still = await getPool().query('SELECT name, agency_id FROM clients WHERE id = $1', [a.clientId]);
      expect(still.rows[0]).toMatchObject({ name: 'Cliente A', agency_id: a.user.agencyId });

      expect((await connectionGet(req(`/api/instagram/connection?clientId=${a.clientId}`, { cookie: b.cookie }))).status).toBe(404);
      expect((await connectionDelete(req(`/api/instagram/connection?clientId=${a.clientId}`, { method: 'DELETE', cookie: b.cookie }))).status).toBe(404);
      expect((await syncGet(req(`/api/instagram/sync?clientId=${a.clientId}`, { cookie: b.cookie }))).status).toBe(404);
      expect((await syncPost(req('/api/instagram/sync', { method: 'POST', cookie: b.cookie, json: { clientId: a.clientId } }))).status).toBe(404);
      process.env.GEMINI_API_KEY = 'fake';
      setGeminiGeneratorForTests(async () => JSON.stringify(validDiagnostic));
      expect((await analyze(req('/api/ai/analyze-profile', { method: 'POST', cookie: b.cookie, json: { clientId: a.clientId, client: { name: 'x' } } }))).status).toBe(404);
    });

    it('rotas protegidas exigem sessão', async () => {
      expect((await listClients(req('/api/clients'))).status).toBe(401);
      expect((await syncPost(req('/api/instagram/sync', { method: 'POST', json: { clientId: 'client-a' } }))).status).toBe(401);
      expect((await analyze(req('/api/ai/analyze-profile', { method: 'POST', json: { clientId: 'client-a', client: { name: 'x' } } }))).status).toBe(401);
    });
  });

  describe('conexão Instagram', () => {
    it('reporta DISCONNECTED quando configurado e sem conexão; NOT_CONFIGURED sem credenciais', async () => {
      const { cookie, clientId } = await createTenant('A');
      const res = await (await connectionGet(req(`/api/instagram/connection?clientId=${clientId}`, { cookie }))).json();
      expect(res.data).toMatchObject({ status: 'DISCONNECTED', configured: true, connection: null });
      const saved = process.env.META_APP_ID;
      delete process.env.META_APP_ID;
      const res2 = await (await connectionGet(req(`/api/instagram/connection?clientId=${clientId}`, { cookie }))).json();
      expect(res2.data.status).toBe('NOT_CONFIGURED');
      process.env.META_APP_ID = saved;
    });

    it('sync sem conexão retorna 409 INSTAGRAM_NOT_CONNECTED', async () => {
      const { cookie, clientId } = await createTenant('A');
      const res = await syncPost(req('/api/instagram/sync', { method: 'POST', cookie, json: { clientId } }));
      expect(res.status).toBe(409);
      expect((await res.json()).error.code).toBe('INSTAGRAM_NOT_CONNECTED');
    });
  });

  describe('IA (Gemini)', () => {
    it('503 quando GEMINI_API_KEY ausente', async () => {
      const { cookie, clientId } = await createTenant('A');
      const res = await analyze(req('/api/ai/analyze-profile', { method: 'POST', cookie, json: { clientId, client: { name: 'Cliente' } } }));
      expect(res.status).toBe(503);
      expect((await res.json()).error.code).toBe('GEMINI_NOT_CONFIGURED');
    });

    it('resposta válida é devolvida e auditada', async () => {
      const { cookie, clientId } = await createTenant('A');
      process.env.GEMINI_API_KEY = 'fake';
      setGeminiGeneratorForTests(async () => '```json\n' + JSON.stringify(validDiagnostic) + '\n```');
      const res = await analyze(req('/api/ai/analyze-profile', { method: 'POST', cookie, json: { clientId, client: { name: 'Cliente' } } }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.diagnostic.nextActions).toEqual(['agir']);
      expect(body.data.metadata.model).toBe('gemini-3.8-flash');
      const audit = await getPool().query('SELECT analysis_type FROM ai_analyses');
      expect(audit.rows[0].analysis_type).toBe('PROFILE_DIAGNOSTIC');
    });

    it('resposta fora do schema ou JSON inválido retorna 502 sem vazar conteúdo', async () => {
      const { cookie, clientId } = await createTenant('A');
      process.env.GEMINI_API_KEY = 'fake';
      setGeminiGeneratorForTests(async () => '{"profileSection": "texto livre"}');
      const res = await analyze(req('/api/ai/analyze-profile', { method: 'POST', cookie, json: { clientId, client: { name: 'Cliente' } } }));
      expect(res.status).toBe(502);
      expect((await res.json()).error.code).toBe('AI_RESPONSE_VALIDATION_FAILED');

      setGeminiGeneratorForTests(async () => 'não é json');
      const bad = await ideas(req('/api/ai/generate-ideas', { method: 'POST', cookie, json: { clientId, client: { name: 'Cliente' } } }));
      expect(bad.status).toBe(502);

      setGeminiGeneratorForTests(async () => JSON.stringify({ pillar: 'x', hookCategory: 'y', hypothesisReason: 'z', isHypothesis: true, confidence: 'SUPER', improvementTip: 'w' }));
      const cls = await classify(
        req('/api/ai/classify-content', {
          method: 'POST',
          cookie,
          json: { clientId, caption: 'c', format: 'Reels', metrics: { views: null, reach: 10, likes: 1, comments: 0, shares: null, saves: null, engagementRate: null } }
        })
      );
      expect(cls.status).toBe(502);

      setGeminiGeneratorForTests(async () => {
        throw new Error('quota exceeded for key AIzaSyFAKEFAKEFAKEFAKEFAKE');
      });
      const failed = await analyze(req('/api/ai/analyze-profile', { method: 'POST', cookie, json: { clientId, client: { name: 'Cliente' } } }));
      expect(failed.status).toBe(429);
      const failedText = await failed.text();
      expect(failedText).toContain('cota');
      expect(failedText).not.toContain('AIza');
    });
  });

  describe('pesquisa', () => {
    it('não simula dados quando o provider não está configurado', async () => {
      const { cookie, clientId } = await createTenant('A');
      const res = await research(req('/api/research', { method: 'POST', cookie, json: { kind: 'competitors', clientId, segment: 'Saúde' } }));
      const body = await res.json();
      expect(body.data).toEqual({ configured: false, message: 'Pesquisa externa não configurada.', candidates: [] });
    });
  });
});
