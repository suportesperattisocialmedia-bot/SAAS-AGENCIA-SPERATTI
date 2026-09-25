import { describe, expect, it } from 'vitest';
import { GET } from '../api/status.js';
import { APP } from './helpers/db.js';

describe('GET /api/status', () => {
  it('retorna 200 com metadados e sem secrets', async () => {
    const res = await GET(new Request(`${APP}/api/status`));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toMatch(/[0-9a-f-]{36}/);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, service: 'social-intelligence-api', environment: 'test' });
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.version).toBe('string');
    expect(body.integrations.instagram.configured).toBe(true);
    expect(body.integrations.gemini.configured).toBe(false);
    const raw = JSON.stringify(body);
    for (const secret of ['test-app-secret', 'test-session-secret', 'postgres://', process.env.META_APP_ID!]) {
      expect(raw).not.toContain(secret);
    }
  });
});
