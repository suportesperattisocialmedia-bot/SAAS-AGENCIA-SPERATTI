/**
 * Sincronização Instagram -> PostgreSQL.
 * 1. busca perfil + mídia + insights  2. normaliza  3. upsert idempotente de contents
 * 4. snapshot diário de métricas por conteúdo e da conta  5. SyncLog.
 * Executar duas vezes no mesmo dia não duplica nada (chaves únicas + ON CONFLICT).
 */

import { withTransaction, type Queryable } from '../db/database.js';
import { AppError } from '../http/errors.js';
import { log } from '../logging/logger.js';
import { MetaApiError, type MediaInsights, type MetaInstagramProvider, type MetaMedia } from '../providers/InstagramProvider.js';
import {
  contentRepository,
  syncLogRepository,
  type ContentMetricValues,
  type NormalizedContent
} from '../repositories/contentRepository.js';
import { instagramConnectionRepository } from '../repositories/instagramConnectionRepository.js';
import { clientRepository } from '../repositories/clientRepository.js';
import { createProvider } from './instagramOAuthService.js';

const TOKEN_REFRESH_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;
const INSIGHTS_CONCURRENCY = 5;

export function mapMediaFormat(media: Pick<MetaMedia, 'media_type' | 'media_product_type'>): NormalizedContent['format'] {
  const type = (media.media_type || '').toUpperCase();
  if (type === 'CAROUSEL_ALBUM') return 'Carrossel';
  if (type === 'VIDEO' || (media.media_product_type || '').toUpperCase() === 'REELS') return 'Reels';
  return 'Foto';
}

export function normalizeMedia(media: MetaMedia, insights: MediaInsights): NormalizedContent {
  const metrics: ContentMetricValues = {
    likes: media.like_count ?? null,
    comments: media.comments_count ?? null,
    reach: insights.reach,
    views: insights.views,
    shares: insights.shares,
    saves: insights.saves,
    totalInteractions: insights.totalInteractions
  };
  const published = media.timestamp ? new Date(media.timestamp) : null;
  return {
    externalId: media.id,
    mediaType: media.media_type ?? null,
    format: mapMediaFormat(media),
    caption: media.caption ?? '',
    permalink: media.permalink ?? null,
    mediaUrl: media.media_url ?? null,
    thumbnailUrl: media.thumbnail_url ?? media.media_url ?? null,
    publishedAt: published && !Number.isNaN(published.getTime()) ? published.toISOString() : null,
    metrics
  };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface SyncSummary {
  syncLogId: string;
  status: 'SUCCESS' | 'PARTIAL';
  fetched: number;
  created: number;
  updated: number;
  syncedAt: string;
  username: string | null;
  followers: number | null;
}

export async function persistSync(
  agencyId: string,
  clientId: string,
  items: NormalizedContent[],
  account: { followers: number | null; follows: number | null; mediaCount: number | null; reach: number | null; profileViews: number | null; websiteClicks: number | null },
  syncedAt: Date,
  db: Queryable
): Promise<{ created: number; updated: number }> {
  const date = syncedAt.toISOString().slice(0, 10);
  let created = 0;
  let updated = 0;
  for (const item of items) {
    const saved = await contentRepository.upsertContent(agencyId, clientId, item, db);
    if (saved.created) created++;
    else updated++;
    await contentRepository.saveContentSnapshot(agencyId, saved.id, date, item.metrics, db);
  }
  await contentRepository.saveAccountSnapshot(
    agencyId,
    clientId,
    {
      date,
      followers: account.followers,
      follows: account.follows,
      mediaCount: account.mediaCount,
      reach: account.reach,
      views: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
      postsPublished: items.filter((i) => i.publishedAt?.startsWith(date)).length,
      engagementRate: null,
      sourceTimestamp: syncedAt.toISOString()
    },
    db
  );
  return { created, updated };
}

export async function syncInstagram(
  input: { agencyId: string; clientId: string; trigger: string; requestId: string },
  provider?: MetaInstagramProvider
): Promise<SyncSummary> {
  const { agencyId, clientId, trigger, requestId } = input;
  await clientRepository.requireForAgency(agencyId, clientId);

  const credentials = await instagramConnectionRepository.getCredentials(agencyId, clientId);
  if (!credentials) throw new AppError('INSTAGRAM_NOT_CONNECTED', 409, 'Instagram não conectado para este cliente.');
  if (credentials.connection.status === 'EXPIRED' || credentials.connection.status === 'REAUTH_REQUIRED') {
    throw new AppError('INSTAGRAM_REAUTH_REQUIRED', 409, 'A autorização do Instagram expirou. Reconecte a conta.');
  }
  if (await syncLogRepository.hasRunning(agencyId, clientId)) {
    throw new AppError('SYNC_IN_PROGRESS', 409, 'Já existe uma sincronização em andamento para este cliente.');
  }

  const meta = provider ?? createProvider();
  const syncLogId = await syncLogRepository.start(agencyId, clientId, trigger, requestId);
  await instagramConnectionRepository.setStatus(agencyId, clientId, 'SYNCING');
  log.info('instagram.sync.start', { requestId, clientId, syncLogId, trigger });

  let accessToken = credentials.accessToken;
  try {
    const expiresAt = credentials.connection.tokenExpiresAt ? new Date(credentials.connection.tokenExpiresAt) : null;
    if (expiresAt && expiresAt.getTime() - Date.now() < TOKEN_REFRESH_WINDOW_MS) {
      const refreshed = await meta.exchangeLongLived(accessToken);
      if (refreshed.accessToken !== accessToken || refreshed.expiresAt) {
        accessToken = refreshed.accessToken;
        await instagramConnectionRepository.updateToken(agencyId, clientId, accessToken, refreshed.expiresAt);
        log.info('instagram.token.refreshed', { requestId, clientId });
      }
    }

    const igId = credentials.connection.instagramAccountId;
    const profile = await meta.getProfile(igId, accessToken);
    const media = await meta.getMediaList(igId, accessToken, 30);
    let insightFailures = 0;
    const normalized = await mapWithConcurrency(media, INSIGHTS_CONCURRENCY, async (m) => {
      const insights = await meta.getMediaInsights(m.id, accessToken);
      if (insights.reach === null && insights.views === null) insightFailures++;
      return normalizeMedia(m, insights);
    });
    const accountInsights = await meta.getAccountDailyInsights(igId, accessToken);

    const syncedAt = new Date();
    const { created, updated } = await withTransaction((tx) =>
      persistSync(
        agencyId,
        clientId,
        normalized,
        {
          followers: profile.followers_count ?? null,
          follows: profile.follows_count ?? null,
          mediaCount: profile.media_count ?? null,
          ...accountInsights
        },
        syncedAt,
        tx
      )
    );

    const status = insightFailures > 0 && insightFailures === normalized.length && normalized.length > 0 ? 'PARTIAL' : 'SUCCESS';
    const warnings = status === 'PARTIAL' ? ['Insights indisponíveis para as mídias (permissão instagram_manage_insights ausente ou conta não profissional).'] : [];
    await syncLogRepository.finish(syncLogId, { status, fetched: media.length, created, updated, errors: warnings });
    await instagramConnectionRepository.setStatus(agencyId, clientId, 'CONNECTED');
    log.info('instagram.sync.finish', { requestId, clientId, syncLogId, status, fetched: media.length, created, updated });

    return {
      syncLogId,
      status,
      fetched: media.length,
      created,
      updated,
      syncedAt: syncedAt.toISOString(),
      username: profile.username ?? null,
      followers: profile.followers_count ?? null
    };
  } catch (err) {
    const reauth = err instanceof MetaApiError && err.requiresReauth;
    const publicMessage = reauth ? 'A autorização do Instagram foi revogada ou expirou. Reconecte a conta.' : 'Falha ao sincronizar com a Meta Graph API.';
    await syncLogRepository.finish(syncLogId, { status: 'ERROR', fetched: 0, created: 0, updated: 0, errors: [publicMessage] }).catch(() => undefined);
    await instagramConnectionRepository.setStatus(agencyId, clientId, reauth ? 'REAUTH_REQUIRED' : 'ERROR', publicMessage).catch(() => undefined);
    log.error('instagram.sync.failed', {
      requestId,
      clientId,
      syncLogId,
      metaCode: err instanceof MetaApiError ? err.metaCode : undefined,
      cause: err instanceof Error ? err : String(err)
    });
    if (err instanceof AppError) throw err;
    throw new AppError(reauth ? 'INSTAGRAM_REAUTH_REQUIRED' : 'META_API_ERROR', reauth ? 409 : 502, publicMessage, { cause: err });
  }
}
