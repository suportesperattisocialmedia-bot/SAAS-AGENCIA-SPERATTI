import { beforeEach, describe, expect, it } from 'vitest';
import { getPool, pingDatabase, getPool as pool2 } from '../server/db/database.js';
import { instagramConnectionRepository } from '../server/repositories/instagramConnectionRepository.js';
import { MetaInstagramProvider } from '../server/providers/InstagramProvider.js';
import { getMetaConfig } from '../server/config/env.js';
import { normalizeMedia, syncInstagram } from '../server/services/instagramSyncService.js';
import { createTenant, dbAvailable, resetDatabase } from './helpers/db.js';
import { createFakeMetaFetch } from './helpers/fakeMeta.js';

describe.skipIf(!dbAvailable)('banco de dados', () => {
  it('conecta, reaproveita o pool (singleton) e detecta migrations', async () => {
    await resetDatabase();
    expect(getPool()).toBe(pool2());
    const ping = await pingDatabase();
    expect(ping.ok).toBe(true);
    expect(ping.migrated).toBe(true);
  });
});

describe('normalização de mídia', () => {
  it('métricas ausentes viram null, nunca 0', () => {
    const n = normalizeMedia({ id: '1', media_type: 'IMAGE' }, { reach: null, views: null, saves: null, shares: null, totalInteractions: null });
    expect(n.metrics).toEqual({ likes: null, comments: null, reach: null, views: null, shares: null, saves: null, totalInteractions: null });
    expect(n.format).toBe('Foto');
    expect(normalizeMedia({ id: '2', media_type: 'CAROUSEL_ALBUM' }, n.metrics).format).toBe('Carrossel');
    expect(normalizeMedia({ id: '3', media_type: 'VIDEO', media_product_type: 'REELS' }, n.metrics).format).toBe('Reels');
  });
});

describe.skipIf(!dbAvailable)('sincronização Instagram', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  async function connected() {
    const tenant = await createTenant('A');
    await instagramConnectionRepository.upsert({
      agencyId: tenant.user.agencyId,
      clientId: tenant.clientId,
      instagramAccountId: 'ig-123',
      facebookPageId: 'page-1',
      username: 'cliente_real',
      accessToken: 'EAAlongtoken000000000000000000',
      tokenExpiresAt: new Date(Date.now() + 50 * 86400000),
      scopes: ['instagram_basic']
    });
    return tenant;
  }

  it('é idempotente: executar duas vezes não duplica conteúdo nem snapshots', async () => {
    const { user, clientId } = await connected();
    const provider = new MetaInstagramProvider(getMetaConfig()!, createFakeMetaFetch().fetch);
    const first = await syncInstagram({ agencyId: user.agencyId, clientId, trigger: 'MANUAL', requestId: 'r1' }, provider);
    expect(first).toMatchObject({ status: 'SUCCESS', fetched: 2, created: 2, updated: 0, followers: 1200 });
    const second = await syncInstagram({ agencyId: user.agencyId, clientId, trigger: 'MANUAL', requestId: 'r2' }, provider);
    expect(second).toMatchObject({ fetched: 2, created: 0, updated: 2 });

    const db = getPool();
    expect((await db.query('SELECT count(*)::int AS n FROM contents')).rows[0].n).toBe(2);
    expect((await db.query('SELECT count(*)::int AS n FROM content_metric_snapshots')).rows[0].n).toBe(2);
    expect((await db.query('SELECT count(*)::int AS n FROM account_snapshots')).rows[0].n).toBe(1);
    expect((await db.query("SELECT count(*)::int AS n FROM sync_logs WHERE status = 'SUCCESS'")).rows[0].n).toBe(2);

    const content = (await db.query("SELECT * FROM contents WHERE external_id = '17900000000000001'")).rows[0];
    expect(content).toMatchObject({ reach: 500, views: 900, saves: 7, shares: null, likes: 10, format: 'Reels' });
    const snap = (await db.query('SELECT * FROM account_snapshots')).rows[0];
    expect(snap.followers).toBe(1200);
    expect(snap.reach).toBeNull(); // insight de conta indisponível => null, não 0
  });

  it('insights indisponíveis resultam em PARTIAL com métricas null', async () => {
    const { user, clientId } = await connected();
    const provider = new MetaInstagramProvider(getMetaConfig()!, createFakeMetaFetch({ failInsights: true }).fetch);
    const res = await syncInstagram({ agencyId: user.agencyId, clientId, trigger: 'MANUAL', requestId: 'r3' }, provider);
    expect(res.status).toBe('PARTIAL');
    const rows = (await getPool().query('SELECT reach, views FROM contents')).rows;
    expect(rows.every((r) => r.reach === null && r.views === null)).toBe(true);
  });

  it('token revogado marca REAUTH_REQUIRED e registra SyncLog de erro', async () => {
    const { user, clientId } = await connected();
    const provider = new MetaInstagramProvider(getMetaConfig()!, createFakeMetaFetch({ tokenError: true }).fetch);
    await expect(syncInstagram({ agencyId: user.agencyId, clientId, trigger: 'MANUAL', requestId: 'r4' }, provider)).rejects.toMatchObject({
      code: 'INSTAGRAM_REAUTH_REQUIRED'
    });
    const conn = await instagramConnectionRepository.findPublic(user.agencyId, clientId);
    expect(conn?.status).toBe('REAUTH_REQUIRED');
    const log = (await getPool().query('SELECT status, errors FROM sync_logs')).rows[0];
    expect(log.status).toBe('ERROR');
    expect(JSON.stringify(log.errors)).not.toContain('EAA');
  });
});
