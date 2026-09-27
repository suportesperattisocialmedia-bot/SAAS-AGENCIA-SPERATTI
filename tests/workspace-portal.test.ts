import { beforeEach, describe, expect, it } from 'vitest';
import { GET as wsGet, PUT as wsPut } from '../api/workspace.js';
import { GET as portalGet, POST as portalPost } from '../api/portal.js';
import { getPool } from '../server/db/database.js';
import { resetRateLimits } from '../server/http/rateLimit.js';
import { createTenant, dbAvailable, req, resetDatabase } from './helpers/db.js';

const put = (cookie: string, json: unknown) => wsPut(req('/api/workspace', { method: 'PUT', cookie, json }));

describe.skipIf(!dbAvailable)('workspace sync', () => {
  beforeEach(async () => {
    resetRateLimits();
    await resetDatabase();
  });

  it('exige sessão', async () => {
    expect((await wsGet(req('/api/workspace'))).status).toBe(401);
    expect((await put('', { key: 'gs_intel_tasks', baseVersion: 0, data: [] })).status).toBe(401);
  });

  it('cria, atualiza com versão e devolve 409 com o documento atual em conflito', async () => {
    const { cookie } = await createTenant('A');
    const first = await put(cookie, { key: 'gs_intel_tasks', baseVersion: 0, data: [{ id: 't1', title: 'Reels' }] });
    expect(first.status).toBe(200);
    expect((await first.json()).data.document.version).toBe(1);

    const second = await put(cookie, { key: 'gs_intel_tasks', baseVersion: 1, data: [{ id: 't1' }, { id: 't2' }] });
    expect((await second.json()).data.document.version).toBe(2);

    // Outro aparelho ainda na versão 1.
    const stale = await put(cookie, { key: 'gs_intel_tasks', baseVersion: 1, data: [{ id: 'x' }] });
    expect(stale.status).toBe(409);
    const body = await stale.json();
    expect(body.error.code).toBe('VERSION_CONFLICT');
    expect(body.data.document.version).toBe(2);
    expect(body.data.document.data).toHaveLength(2);

    // Criar de novo algo que já existe também é conflito.
    expect((await put(cookie, { key: 'gs_intel_tasks', baseVersion: 0, data: [] })).status).toBe(409);

    const all = await (await wsGet(req('/api/workspace', { cookie }))).json();
    expect(all.data.documents.map((d: { key: string }) => d.key)).toEqual(['gs_intel_tasks']);
  });

  it('rejeita chave fora da lista e isola por agência', async () => {
    const a = await createTenant('A');
    const b = await createTenant('B');
    expect((await put(a.cookie, { key: 'gs_intel_settings', baseVersion: 0, data: [] })).status).toBe(400);
    await put(a.cookie, { key: 'gs_intel_ideas', baseVersion: 0, data: [{ id: 'segredo-a' }] });
    const bDocs = await (await wsGet(req('/api/workspace', { cookie: b.cookie }))).json();
    expect(bDocs.data.documents).toEqual([]);
  });

  it('aceita as coleções do financeiro', async () => {
    const { cookie } = await createTenant('A');
    for (const key of ['gs_fin_contracts', 'gs_fin_invoices', 'gs_fin_projects', 'gs_fin_expenses']) {
      expect((await put(cookie, { key, baseVersion: 0, data: [{ id: `${key}-1` }] })).status).toBe(200);
    }
  });

  it('aceita coleções grandes (acima de 256KB) até o limite próprio', async () => {
    const { cookie } = await createTenant('A');
    const data = Array.from({ length: 3000 }, (_, i) => ({ id: `c${i}`, title: 'x'.repeat(150) }));
    expect((await put(cookie, { key: 'gs_intel_contents', baseVersion: 0, data })).status).toBe(200);
    const huge = [{ id: 'h', blob: 'x'.repeat(5 * 1024 * 1024) }];
    expect((await put(cookie, { key: 'gs_intel_contents', baseVersion: 1, data: huge })).status).toBe(413);
  });
});

describe.skipIf(!dbAvailable)('portal de aprovação', () => {
  beforeEach(async () => {
    resetRateLimits();
    await resetDatabase();
  });

  async function setup() {
    const t = await createTenant('A');
    await put(t.cookie, {
      key: 'gs_intel_tasks',
      baseVersion: 0,
      data: [
        { id: 'r1', clientId: t.clientId, title: 'Reels lançamento', type: 'Reels', status: 'review', notes: 'NOTA INTERNA', clientCopy: 'Legenda final', previewUrl: 'https://drive.example/arte' },
        { id: 'r2', clientId: t.clientId, title: 'Post', type: 'Post', status: 'doing', notes: 'x' },
        { id: 'o1', clientId: 'outro-cliente', title: 'Outro cliente', type: 'Post', status: 'review' }
      ]
    });
    const created = await portalPost(req('/api/portal?action=create', { method: 'POST', cookie: t.cookie, json: { clientId: t.clientId, clientName: 'Cliente A' } }));
    expect(created.status).toBe(200);
    const { link } = (await created.json()).data;
    return { ...t, link };
  }

  it('criar link exige sessão e o token não é guardado em texto puro', async () => {
    expect((await portalPost(req('/api/portal?action=create', { method: 'POST', json: { clientId: 'c1', clientName: 'X' } }))).status).toBe(401);
    const { link } = await setup();
    expect(link.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const row = await getPool().query('SELECT token_hash, token_encrypted FROM approval_links');
    expect(JSON.stringify(row.rows)).not.toContain(link.token);
  });

  it('cliente vê só as entregas em aprovação dele, sem notas internas', async () => {
    const { link } = await setup();
    const res = await portalGet(req(`/api/portal?token=${link.token}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.clientName).toBe('Cliente A');
    expect(body.data.tasks.map((t: { id: string }) => t.id)).toEqual(['r1']);
    expect(JSON.stringify(body)).not.toContain('NOTA INTERNA');
    expect(body.data.tasks[0].clientCopy).toBe('Legenda final');
  });

  it('aprovar e pedir ajuste atualizam a tarefa sincronizada e registram o evento', async () => {
    const { link, cookie } = await setup();
    const noComment = await portalPost(req('/api/portal?action=decide', { method: 'POST', json: { token: link.token, taskId: 'r1', decision: 'changes' } }));
    expect(noComment.status).toBe(400);

    const other = await portalPost(req('/api/portal?action=decide', { method: 'POST', json: { token: link.token, taskId: 'o1', decision: 'approved' } }));
    expect(other.status).toBe(404);

    const changes = await portalPost(req('/api/portal?action=decide', { method: 'POST', json: { token: link.token, taskId: 'r1', decision: 'changes', comment: 'Trocar a música' } }));
    expect(changes.status).toBe(200);

    const docs = await (await wsGet(req('/api/workspace', { cookie }))).json();
    const tasksDoc = docs.data.documents.find((d: { key: string }) => d.key === 'gs_intel_tasks');
    expect(tasksDoc.version).toBe(2);
    const r1 = tasksDoc.data.find((t: { id: string }) => t.id === 'r1');
    expect(r1.status).toBe('doing');
    expect(r1.approvals[0]).toMatchObject({ decision: 'changes', comment: 'Trocar a música' });

    // Já decidida: não pode decidir de novo.
    const again = await portalPost(req('/api/portal?action=decide', { method: 'POST', json: { token: link.token, taskId: 'r1', decision: 'approved' } }));
    expect(again.status).toBe(409);

    const view = await (await portalGet(req(`/api/portal?token=${link.token}`))).json();
    expect(view.data.tasks[0]).toMatchObject({ id: 'r1', status: 'decided', lastDecision: { decision: 'changes' } });
    const events = await getPool().query('SELECT decision, comment FROM approval_events');
    expect(events.rows).toEqual([{ decision: 'changes', comment: 'Trocar a música' }]);
  });

  it('link revogado, expirado ou inválido não funciona', async () => {
    const { link, cookie, clientId } = await setup();
    expect((await portalGet(req('/api/portal?token=curto'))).status).toBe(400);
    expect((await portalGet(req(`/api/portal?token=${'a'.repeat(43)}`))).status).toBe(404);

    const list = await (await portalGet(req(`/api/portal?clientId=${clientId}`, { cookie }))).json();
    expect(list.data.links).toHaveLength(1);
    expect(list.data.links[0].token).toBe(link.token);

    // Gerar um novo revoga o anterior.
    const second = (await (await portalPost(req('/api/portal?action=create', { method: 'POST', cookie, json: { clientId, clientName: 'Cliente A' } }))).json()).data.link;
    expect((await portalGet(req(`/api/portal?token=${link.token}`))).status).toBe(404);

    await getPool().query("UPDATE approval_links SET expires_at = now() - interval '1 minute' WHERE id = $1", [second.id]);
    const expired = await portalGet(req(`/api/portal?token=${second.token}`));
    expect(expired.status).toBe(410);

    const third = (await (await portalPost(req('/api/portal?action=create', { method: 'POST', cookie, json: { clientId, clientName: 'Cliente A' } }))).json()).data.link;
    expect((await portalPost(req('/api/portal?action=revoke', { method: 'POST', cookie, json: { id: third.id } }))).status).toBe(200);
    expect((await portalGet(req(`/api/portal?token=${third.token}`))).status).toBe(404);
  });

  it('outra agência não lista nem revoga links alheios', async () => {
    const { link, clientId } = await setup();
    const b = await createTenant('B');
    const list = await (await portalGet(req(`/api/portal?clientId=${clientId}`, { cookie: b.cookie }))).json();
    expect(list.data.links).toEqual([]);
    expect((await portalPost(req('/api/portal?action=revoke', { method: 'POST', cookie: b.cookie, json: { id: link.id } }))).status).toBe(404);
  });
});
