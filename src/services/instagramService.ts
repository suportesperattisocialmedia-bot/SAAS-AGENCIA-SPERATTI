/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Instagram / Meta Service - Real Meta Graph API Ingestion & Normalization Pipeline
 * 
 * Strict rule: NEVER generate fake numbers (18430 followers, 28420 reach, etc.).
 * Pipeline: Meta media -> normalizeMedia() -> Content -> persist -> ContentMetricSnapshot -> persist -> SyncLog.
 */

import {
  InstagramAccount,
  InstagramConnectionStatus,
  AccountSnapshot,
  Content,
  ContentFormat,
  SyncTrigger
} from '../types';
import { storageService } from './storageService';
import { apiClient } from './api/apiClient';
import { logger } from '../utils/logger';
import { generateUUID } from '../utils/uuid';

export interface SyncResult {
  success: boolean;
  timestamp: string;
  itemsSynced: number;
  error?: string;
  snapshotCreated?: AccountSnapshot;
}

function mapMediaTypeToFormat(mediaType: string): ContentFormat {
  const upper = (mediaType || '').toUpperCase();
  if (upper === 'VIDEO') return 'Reels';
  if (upper === 'CAROUSEL_ALBUM') return 'Carrossel';
  return 'Foto';
}

function normalizeMedia(raw: any, clientId: string): Content {
  const format = mapMediaTypeToFormat(raw.media_type);
  const caption = raw.caption || '';
  const firstLine = caption.split('\n')[0]?.trim();
  const title = firstLine && firstLine.length > 3 ? firstLine.slice(0, 80) : `Publicação Instagram (${format})`;

  const likes = typeof raw.like_count === 'number' ? raw.like_count : 0;
  const comments = typeof raw.comments_count === 'number' ? raw.comments_count : 0;

  const insights = raw.insights || {};
  const reach = typeof insights.reach === 'number' ? insights.reach : 0;
  const views = typeof insights.views === 'number' ? insights.views : (reach > 0 ? reach : 0);
  const saves = typeof insights.saves === 'number' ? insights.saves : 0;
  const shares = typeof insights.shares === 'number' ? insights.shares : 0;

  const interactions = likes + comments + shares + saves;
  const engagementRate = reach > 0 ? Number(((interactions / reach) * 100).toFixed(2)) : 0;

  return {
    id: `content-meta-${raw.id}`,
    clientId,
    instagramMediaId: raw.id,
    mediaType: raw.media_type,
    permalink: raw.permalink,
    mediaUrl: raw.media_url,
    thumbnailUrl: raw.thumbnail_url || raw.media_url,
    title,
    caption,
    publishedAt: raw.timestamp ? new Date(raw.timestamp).toISOString() : new Date().toISOString(),
    format,
    pillar: 'Geral',
    objective: 'Engajamento',
    hook: firstLine ? firstLine.slice(0, 120) : '',
    cta: '',
    metrics: {
      views,
      reach,
      likes,
      comments,
      shares,
      saves,
      engagementRate
    }
  };
}

export const instagramService = {
  getAccount(clientId: string): InstagramAccount {
    const existing = storageService.instagram.getByClientId(clientId);
    if (existing) return existing;

    const client = storageService.clients.getById(clientId);
    const initial: InstagramAccount = {
      clientId,
      handle: client?.instagram || '',
      status: 'NOT_CONNECTED',
      isConnected: false,
      permissions: ['instagram_basic', 'instagram_manage_insights', 'pages_read_engagement']
    };
    storageService.instagram.saveAccount(initial);
    return initial;
  },

  async connectAccount(clientId: string, handle: string, config?: { appId?: string; accountId?: string }): Promise<InstagramAccount> {
    const current = this.getAccount(clientId);
    const updated: InstagramAccount = {
      ...current,
      handle,
      accountId: config?.accountId || current.accountId,
      status: 'CONNECTED',
      isConnected: true,
      lastSyncAt: new Date().toISOString(),
      errorStatus: null
    };
    storageService.instagram.saveAccount(updated);
    logger.info(`Instagram account connected for client ${clientId}`, { handle });
    return updated;
  },

  async checkStatus(clientId: string): Promise<InstagramAccount> {
    try {
      const current = this.getAccount(clientId);
      const res = await apiClient.get<{
        status: InstagramConnectionStatus;
        isConnected: boolean;
        accountId?: string;
        message?: string;
      }>(`/api/integrations/instagram/status?clientId=${encodeURIComponent(clientId)}`);

      const updated: InstagramAccount = {
        ...current,
        status: res.status,
        isConnected: res.isConnected,
        accountId: res.accountId || current.accountId,
        errorStatus: res.status === 'ERROR' || res.status === 'TOKEN_EXPIRED' ? (res.message || null) : null
      };

      storageService.instagram.saveAccount(updated);
      return updated;
    } catch (err) {
      logger.warn('Failed checking Instagram status on server', { error: String(err) });
      return this.getAccount(clientId);
    }
  },

  async getConnectUrl(clientId: string): Promise<{ authUrl?: string; error?: string }> {
    try {
      const res = await apiClient.get<{ authUrl: string; status: string }>(
        `/api/integrations/instagram/connect?clientId=${encodeURIComponent(clientId)}`
      );
      return { authUrl: res.authUrl };
    } catch (err: any) {
      const msg = err.message || 'Meta OAuth não configurado no servidor';
      return { error: msg };
    }
  },

  async disconnectAccount(clientId: string): Promise<void> {
    try {
      await apiClient.post('/api/integrations/instagram/disconnect', { clientId });
    } catch (err) {
      logger.warn('Server disconnect failed, proceeding with local disconnection', { error: String(err) });
    }

    const current = this.getAccount(clientId);
    const disconnected: InstagramAccount = {
      ...current,
      status: 'NOT_CONNECTED',
      isConnected: false,
      errorStatus: null
    };
    storageService.instagram.saveAccount(disconnected);
    logger.info(`Instagram account disconnected for client ${clientId}`);
  },

  async syncNow(clientId: string, trigger: SyncTrigger = 'MANUAL'): Promise<SyncResult> {
    const account = this.getAccount(clientId);
    const startedAt = new Date().toISOString();
    const requestId = generateUUID();

    if (!account.isConnected) {
      storageService.syncLogs.create({
        clientId,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'ERROR',
        trigger,
        recordsFetched: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errors: ['Instagram não autenticado via Meta OAuth'],
        provider: 'meta_instagram',
        requestId
      });

      return {
        success: false,
        timestamp: startedAt,
        itemsSynced: 0,
        error: 'Instagram não autenticado via Meta OAuth. Conecte sua conta primeiro.'
      };
    }

    storageService.instagram.saveAccount({
      ...account,
      status: 'SYNCING'
    });

    try {
      const syncResponse = await apiClient.post<{
        success: boolean;
        profile: {
          followers_count?: number;
          follows_count?: number;
          media_count?: number;
          username?: string;
        };
        media: any[];
        syncedAt: string;
      }>('/api/integrations/instagram/sync', { clientId, trigger });

      const rawMediaList = syncResponse.media || [];
      let recordsCreated = 0;
      let recordsUpdated = 0;

      // Pipeline: normalize & upsert content + snapshot
      rawMediaList.forEach((raw) => {
        const normalized = normalizeMedia(raw, clientId);
        const existing = storageService.contents.getAll().find(
          c => c.clientId === clientId && (c.instagramMediaId === raw.id || c.id === normalized.id)
        );

        if (existing) {
          storageService.contents.upsert(normalized);
          recordsUpdated++;
        } else {
          storageService.contents.create(normalized);
          recordsCreated++;
        }

        // Persist content metric snapshot
        storageService.contentMetrics.saveSnapshot({
          contentId: normalized.id,
          timestamp: syncResponse.syncedAt,
          views: normalized.metrics.views,
          reach: normalized.metrics.reach,
          likes: normalized.metrics.likes,
          comments: normalized.metrics.comments,
          shares: normalized.metrics.shares,
          saves: normalized.metrics.saves,
          profileActivity: 0,
          engagementRate: normalized.metrics.engagementRate,
          source: 'META_API'
        });
      });

      const followers = syncResponse.profile.followers_count ?? 0;
      const today = new Date().toISOString().split('T')[0];

      const totalLikes = rawMediaList.reduce((acc: number, m: any) => acc + (m.like_count || 0), 0);
      const totalComments = rawMediaList.reduce((acc: number, m: any) => acc + (m.comments_count || 0), 0);
      const totalSaves = rawMediaList.reduce((acc: number, m: any) => acc + (m.insights?.saves || 0), 0);
      const totalShares = rawMediaList.reduce((acc: number, m: any) => acc + (m.insights?.shares || 0), 0);
      const totalReach = rawMediaList.reduce((acc: number, m: any) => acc + (m.insights?.reach || 0), 0);
      const totalViews = rawMediaList.reduce((acc: number, m: any) => acc + (m.insights?.views || 0), 0);

      const totalInteractions = totalLikes + totalComments + totalSaves + totalShares;
      const calculatedEngagement = totalReach > 0
        ? Number(((totalInteractions / totalReach) * 100).toFixed(2))
        : 0;

      // Idempotent Account Snapshot
      const snapshot = storageService.history.saveSnapshot({
        clientId,
        date: today,
        followers,
        reach: totalReach,
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        saves: totalSaves,
        profileVisits: 0,
        websiteClicks: 0,
        postsPublished: rawMediaList.filter((m: any) => m.timestamp?.startsWith(today)).length,
        engagementRate: calculatedEngagement,
        source: 'META_API',
        sourceTimestamp: syncResponse.syncedAt
      });

      storageService.instagram.saveAccount({
        ...account,
        status: 'SYNCED',
        lastSyncAt: syncResponse.syncedAt,
        errorStatus: null
      });

      // Log successful sync for auditing & provenance
      storageService.syncLogs.create({
        clientId,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'SUCCESS',
        trigger,
        recordsFetched: rawMediaList.length,
        recordsCreated,
        recordsUpdated,
        errors: [],
        provider: 'meta_instagram',
        requestId
      });

      return {
        success: true,
        timestamp: syncResponse.syncedAt,
        itemsSynced: rawMediaList.length,
        snapshotCreated: snapshot
      };
    } catch (err: any) {
      logger.error('Meta sync failed', { error: err.message });
      storageService.instagram.saveAccount({
        ...account,
        status: 'ERROR',
        errorStatus: err.message || 'Falha ao sincronizar com Meta Graph API'
      });

      storageService.syncLogs.create({
        clientId,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'ERROR',
        trigger,
        recordsFetched: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errors: [err.message || 'Falha na conexão com a Meta Graph API'],
        provider: 'meta_instagram',
        requestId
      });

      return {
        success: false,
        timestamp: new Date().toISOString(),
        itemsSynced: 0,
        error: err.message || 'Falha na conexão com a Meta Graph API.'
      };
    }
  },

  recordManualSnapshot(
    clientId: string,
    data: {
      date: string;
      followers: number;
      reach: number;
      views: number;
      likes: number;
      comments: number;
      shares: number;
      saves: number;
      profileVisits?: number;
      postsPublished?: number;
    }
  ): AccountSnapshot {
    const interactions = data.likes + data.comments + data.shares + data.saves;
    const engagementRate = data.reach > 0
      ? Number(((interactions / data.reach) * 100).toFixed(2))
      : 0;

    return storageService.history.saveSnapshot({
      clientId,
      date: data.date,
      followers: data.followers,
      reach: data.reach,
      views: data.views,
      likes: data.likes,
      comments: data.comments,
      shares: data.shares,
      saves: data.saves,
      profileVisits: data.profileVisits || 0,
      websiteClicks: 0,
      postsPublished: data.postsPublished || 0,
      engagementRate,
      source: 'MANUAL',
      sourceTimestamp: new Date().toISOString()
    });
  }
};
