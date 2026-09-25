/**
 * Persistência de conteúdos, snapshots e logs de sincronização.
 * Idempotência: (client_id, provider, external_id) para conteúdos e
 * (content_id, snapshot_date) / (client_id, snapshot_date) para snapshots.
 * Métricas indisponíveis são gravadas como NULL — nunca 0 inventado.
 */

import type pg from 'pg';
import { query, type Queryable } from '../db/database.js';

export interface NormalizedContent {
  externalId: string;
  mediaType: string | null;
  format: 'Reels' | 'Carrossel' | 'Foto';
  caption: string;
  permalink: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  metrics: ContentMetricValues;
}

export interface ContentMetricValues {
  likes: number | null;
  comments: number | null;
  reach: number | null;
  views: number | null;
  shares: number | null;
  saves: number | null;
  totalInteractions: number | null;
}

export interface StoredContent extends NormalizedContent {
  id: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSnapshotInput {
  date: string; // YYYY-MM-DD
  followers: number | null;
  follows: number | null;
  mediaCount: number | null;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  postsPublished: number | null;
  engagementRate: number | null;
  sourceTimestamp: string;
}

export interface StoredAccountSnapshot extends AccountSnapshotInput {
  id: string;
  clientId: string;
  source: string;
}

export interface SyncLogRecord {
  id: string;
  clientId: string;
  provider: string;
  trigger: string;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'ERROR';
  startedAt: string;
  finishedAt: string | null;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: string[];
  requestId: string;
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export const contentRepository = {
  /** Upsert idempotente; retorna o id interno e se o registro foi criado. */
  async upsertContent(agencyId: string, clientId: string, c: NormalizedContent, db: Queryable): Promise<{ id: string; created: boolean }> {
    const res = await query<{ id: string; created: boolean }>(
      `INSERT INTO contents (id, agency_id, client_id, external_id, provider, media_type, format, caption, permalink, media_url,
          thumbnail_url, published_at, likes, comments, reach, views, shares, saves, total_interactions)
       VALUES ($1, $2, $3, $4, 'meta_instagram', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (client_id, provider, external_id) DO UPDATE SET
         media_type = EXCLUDED.media_type, format = EXCLUDED.format, caption = EXCLUDED.caption,
         permalink = EXCLUDED.permalink, media_url = EXCLUDED.media_url, thumbnail_url = EXCLUDED.thumbnail_url,
         published_at = EXCLUDED.published_at, likes = EXCLUDED.likes, comments = EXCLUDED.comments,
         reach = EXCLUDED.reach, views = EXCLUDED.views, shares = EXCLUDED.shares, saves = EXCLUDED.saves,
         total_interactions = EXCLUDED.total_interactions, updated_at = now()
       WHERE contents.agency_id = EXCLUDED.agency_id
       RETURNING id, (xmax = 0) AS created`,
      [
        crypto.randomUUID(),
        agencyId,
        clientId,
        c.externalId,
        c.mediaType,
        c.format,
        c.caption,
        c.permalink,
        c.mediaUrl,
        c.thumbnailUrl,
        c.publishedAt,
        c.metrics.likes,
        c.metrics.comments,
        c.metrics.reach,
        c.metrics.views,
        c.metrics.shares,
        c.metrics.saves,
        c.metrics.totalInteractions
      ],
      db
    );
    const row = res.rows[0];
    if (!row) throw new Error('Conteúdo pertence a outra agência.');
    return { id: row.id, created: row.created };
  },

  async saveContentSnapshot(agencyId: string, contentId: string, date: string, m: ContentMetricValues, db: Queryable): Promise<void> {
    await query(
      `INSERT INTO content_metric_snapshots (id, agency_id, content_id, snapshot_date, likes, comments, reach, views, shares, saves, total_interactions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (content_id, snapshot_date) DO UPDATE SET
         likes = EXCLUDED.likes, comments = EXCLUDED.comments, reach = EXCLUDED.reach, views = EXCLUDED.views,
         shares = EXCLUDED.shares, saves = EXCLUDED.saves, total_interactions = EXCLUDED.total_interactions, captured_at = now()`,
      [crypto.randomUUID(), agencyId, contentId, date, m.likes, m.comments, m.reach, m.views, m.shares, m.saves, m.totalInteractions],
      db
    );
  },

  async saveAccountSnapshot(agencyId: string, clientId: string, s: AccountSnapshotInput, db: Queryable): Promise<void> {
    await query(
      `INSERT INTO account_snapshots (id, agency_id, client_id, snapshot_date, followers, follows, media_count, reach, views, likes,
          comments, shares, saves, posts_published, engagement_rate, source, source_timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'META_API', $16)
       ON CONFLICT (client_id, snapshot_date) DO UPDATE SET
         followers = EXCLUDED.followers, follows = EXCLUDED.follows, media_count = EXCLUDED.media_count,
         reach = EXCLUDED.reach, views = EXCLUDED.views, likes = EXCLUDED.likes, comments = EXCLUDED.comments,
         shares = EXCLUDED.shares, saves = EXCLUDED.saves, posts_published = EXCLUDED.posts_published,
         engagement_rate = EXCLUDED.engagement_rate, source_timestamp = EXCLUDED.source_timestamp`,
      [
        crypto.randomUUID(),
        agencyId,
        clientId,
        s.date,
        s.followers,
        s.follows,
        s.mediaCount,
        s.reach,
        s.views,
        s.likes,
        s.comments,
        s.shares,
        s.saves,
        s.postsPublished,
        s.engagementRate,
        s.sourceTimestamp
      ],
      db
    );
  },

  async listContents(agencyId: string, clientId: string, limit = 200, db?: Queryable): Promise<StoredContent[]> {
    const res = await query<Record<string, unknown>>(
      `SELECT * FROM contents WHERE agency_id = $1 AND client_id = $2 ORDER BY published_at DESC NULLS LAST LIMIT $3`,
      [agencyId, clientId, limit],
      db
    );
    return res.rows.map((r) => ({
      id: String(r.id),
      clientId: String(r.client_id),
      externalId: String(r.external_id),
      mediaType: (r.media_type as string | null) ?? null,
      format: r.format as StoredContent['format'],
      caption: String(r.caption ?? ''),
      permalink: (r.permalink as string | null) ?? null,
      mediaUrl: (r.media_url as string | null) ?? null,
      thumbnailUrl: (r.thumbnail_url as string | null) ?? null,
      publishedAt: r.published_at instanceof Date ? r.published_at.toISOString() : null,
      metrics: {
        likes: num(r.likes),
        comments: num(r.comments),
        reach: num(r.reach),
        views: num(r.views),
        shares: num(r.shares),
        saves: num(r.saves),
        totalInteractions: num(r.total_interactions)
      },
      createdAt: (r.created_at as Date).toISOString(),
      updatedAt: (r.updated_at as Date).toISOString()
    }));
  },

  async listAccountSnapshots(agencyId: string, clientId: string, db?: Queryable): Promise<StoredAccountSnapshot[]> {
    const res = await query<Record<string, unknown>>(
      `SELECT *, to_char(snapshot_date, 'YYYY-MM-DD') AS day FROM account_snapshots
       WHERE agency_id = $1 AND client_id = $2 ORDER BY snapshot_date ASC LIMIT 730`,
      [agencyId, clientId],
      db
    );
    return res.rows.map((r) => ({
      id: String(r.id),
      clientId: String(r.client_id),
      date: String(r.day),
      followers: num(r.followers),
      follows: num(r.follows),
      mediaCount: num(r.media_count),
      reach: num(r.reach),
      views: num(r.views),
      likes: num(r.likes),
      comments: num(r.comments),
      shares: num(r.shares),
      saves: num(r.saves),
      postsPublished: num(r.posts_published),
      engagementRate: num(r.engagement_rate),
      source: String(r.source),
      sourceTimestamp: (r.source_timestamp as Date).toISOString()
    }));
  },

  async countContents(agencyId: string, clientId: string, db?: Queryable): Promise<number> {
    const res = await query<{ n: string }>('SELECT count(*)::text AS n FROM contents WHERE agency_id = $1 AND client_id = $2', [agencyId, clientId], db);
    return Number(res.rows[0]?.n ?? 0);
  }
};

function toSyncLog(r: Record<string, unknown>): SyncLogRecord {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    provider: String(r.provider),
    trigger: String(r.trigger),
    status: r.status as SyncLogRecord['status'],
    startedAt: (r.started_at as Date).toISOString(),
    finishedAt: r.finished_at instanceof Date ? r.finished_at.toISOString() : null,
    recordsFetched: Number(r.records_fetched),
    recordsCreated: Number(r.records_created),
    recordsUpdated: Number(r.records_updated),
    errors: (r.errors as string[]) ?? [],
    requestId: String(r.request_id)
  };
}

export const syncLogRepository = {
  async start(agencyId: string, clientId: string, trigger: string, requestId: string, db?: Queryable): Promise<string> {
    const id = crypto.randomUUID();
    await query(
      `INSERT INTO sync_logs (id, agency_id, client_id, trigger, status, request_id) VALUES ($1, $2, $3, $4, 'RUNNING', $5)`,
      [id, agencyId, clientId, trigger, requestId],
      db
    );
    return id;
  },

  async finish(
    id: string,
    result: { status: 'SUCCESS' | 'PARTIAL' | 'ERROR'; fetched: number; created: number; updated: number; errors: string[] },
    db?: Queryable
  ): Promise<void> {
    await query(
      `UPDATE sync_logs SET status = $2, finished_at = now(), records_fetched = $3, records_created = $4, records_updated = $5, errors = $6
       WHERE id = $1`,
      [id, result.status, result.fetched, result.created, result.updated, result.errors],
      db
    );
  },

  /** Evita sync concorrente do mesmo cliente (lock lógico de 2 minutos). */
  async hasRunning(agencyId: string, clientId: string, db?: Queryable): Promise<boolean> {
    const res = await query(
      `SELECT 1 FROM sync_logs WHERE agency_id = $1 AND client_id = $2 AND status = 'RUNNING' AND started_at > now() - interval '2 minutes' LIMIT 1`,
      [agencyId, clientId],
      db
    );
    return (res.rowCount ?? 0) > 0;
  },

  async list(agencyId: string, clientId: string, limit = 20, db?: Queryable): Promise<SyncLogRecord[]> {
    const res = await query<Record<string, unknown>>(
      'SELECT * FROM sync_logs WHERE agency_id = $1 AND client_id = $2 ORDER BY started_at DESC LIMIT $3',
      [agencyId, clientId, limit],
      db
    );
    return res.rows.map(toSyncLog);
  }
};

export type PgClient = pg.PoolClient;
