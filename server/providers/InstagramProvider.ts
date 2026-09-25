/**
 * InstagramProvider — única camada que conversa com a Meta Graph API.
 * Separa OAuth, dados da conta, mídia, insights, refresh de token e erros.
 * Todos os payloads da Meta são validados com Zod; métricas ausentes viram null.
 */

import { z } from 'zod';
import type { MetaConfig } from '../config/env.js';
import { appSecretProof } from '../security/crypto.js';

export const INSTAGRAM_SCOPES = ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement', 'business_management'];

export class MetaApiError extends Error {
  readonly metaCode: number | null;
  readonly httpStatus: number;
  constructor(message: string, httpStatus: number, metaCode: number | null) {
    super(message);
    this.name = 'MetaApiError';
    this.httpStatus = httpStatus;
    this.metaCode = metaCode;
  }
  /** 190 = token inválido/expirado; 102/463/467 = sessão expirada; 10/200 = permissão revogada. */
  get requiresReauth(): boolean {
    return this.metaCode === 190 || this.metaCode === 102 || this.metaCode === 10 || this.metaCode === 200;
  }
}

const MetaErrorSchema = z.object({
  error: z.object({ message: z.string().optional(), code: z.number().optional(), type: z.string().optional() })
});

const TokenResponseSchema = z.object({
  access_token: z.string().min(10),
  token_type: z.string().optional(),
  expires_in: z.number().optional()
});

export const MetaProfileSchema = z.object({
  id: z.string(),
  username: z.string().optional(),
  name: z.string().optional(),
  profile_picture_url: z.string().optional(),
  followers_count: z.number().optional(),
  follows_count: z.number().optional(),
  media_count: z.number().optional()
});
export type MetaProfile = z.infer<typeof MetaProfileSchema>;

const PagesResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      instagram_business_account: MetaProfileSchema.optional()
    })
  )
});

export const MetaMediaSchema = z.object({
  id: z.string(),
  caption: z.string().optional(),
  media_type: z.string().optional(),
  media_product_type: z.string().optional(),
  media_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
  permalink: z.string().optional(),
  timestamp: z.string().optional(),
  like_count: z.number().optional(),
  comments_count: z.number().optional()
});
export type MetaMedia = z.infer<typeof MetaMediaSchema>;

const MediaListSchema = z.object({ data: z.array(MetaMediaSchema) });

const InsightsSchema = z.object({
  data: z.array(
    z.object({
      name: z.string(),
      values: z.array(z.object({ value: z.union([z.number(), z.record(z.string(), z.number())]) })).optional(),
      total_value: z.object({ value: z.number() }).optional()
    })
  )
});

const PermissionsSchema = z.object({
  data: z.array(z.object({ permission: z.string(), status: z.string() }))
});

export interface MediaInsights {
  reach: number | null;
  views: number | null;
  saves: number | null;
  shares: number | null;
  totalInteractions: number | null;
}

export interface BusinessAccount {
  pageId: string;
  profile: MetaProfile;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class MetaInstagramProvider {
  private readonly baseUrl = 'https://graph.facebook.com';

  constructor(
    private readonly config: MetaConfig,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 12_000
  ) {}

  // ---------- OAuth ----------

  buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      state,
      response_type: 'code',
      scope: INSTAGRAM_SCOPES.join(',')
    });
    return `https://www.facebook.com/${this.config.graphVersion}/dialog/oauth?${params.toString()}`;
  }

  /** Troca o code por token curto e em seguida por token de longa duração (~60 dias). */
  async exchangeCode(code: string): Promise<{ accessToken: string; expiresAt: Date | null }> {
    const short = TokenResponseSchema.parse(
      await this.get('/oauth/access_token', {
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
        redirect_uri: this.config.redirectUri,
        code
      })
    );
    return this.exchangeLongLived(short.access_token, short.expires_in);
  }

  /** Também serve como refresh: um token longo válido pode ser trocado por outro novo. */
  async exchangeLongLived(token: string, fallbackExpiresIn?: number): Promise<{ accessToken: string; expiresAt: Date | null }> {
    try {
      const long = TokenResponseSchema.parse(
        await this.get('/oauth/access_token', {
          grant_type: 'fb_exchange_token',
          client_id: this.config.appId,
          client_secret: this.config.appSecret,
          fb_exchange_token: token
        })
      );
      return { accessToken: long.access_token, expiresAt: long.expires_in ? new Date(Date.now() + long.expires_in * 1000) : null };
    } catch {
      return { accessToken: token, expiresAt: fallbackExpiresIn ? new Date(Date.now() + fallbackExpiresIn * 1000) : null };
    }
  }

  async getGrantedScopes(accessToken: string): Promise<string[]> {
    const res = PermissionsSchema.parse(await this.get('/me/permissions', {}, accessToken));
    return res.data.filter((p) => p.status === 'granted').map((p) => p.permission);
  }

  // ---------- Conta ----------

  async getBusinessAccount(accessToken: string): Promise<BusinessAccount | null> {
    const res = PagesResponseSchema.parse(
      await this.get(
        '/me/accounts',
        { fields: 'id,name,instagram_business_account{id,username,name,profile_picture_url,followers_count,follows_count,media_count}' },
        accessToken
      )
    );
    const page = res.data.find((p) => p.instagram_business_account);
    return page?.instagram_business_account ? { pageId: page.id, profile: page.instagram_business_account } : null;
  }

  async getProfile(instagramAccountId: string, accessToken: string): Promise<MetaProfile> {
    return MetaProfileSchema.parse(
      await this.get(`/${encodeURIComponent(instagramAccountId)}`, { fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count' }, accessToken)
    );
  }

  // ---------- Mídia ----------

  async getMediaList(instagramAccountId: string, accessToken: string, limit = 30): Promise<MetaMedia[]> {
    const res = MediaListSchema.parse(
      await this.get(
        `/${encodeURIComponent(instagramAccountId)}/media`,
        {
          fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
          limit: String(Math.min(Math.max(limit, 1), 50))
        },
        accessToken
      )
    );
    return res.data;
  }

  // ---------- Insights ----------

  async getMediaInsights(mediaId: string, accessToken: string): Promise<MediaInsights> {
    const empty: MediaInsights = { reach: null, views: null, saves: null, shares: null, totalInteractions: null };
    // Métricas atuais (Graph API v22+). Se a mídia não suportar alguma, tenta um conjunto mínimo.
    for (const metric of ['reach,saved,shares,total_interactions,views', 'reach,saved']) {
      try {
        const parsed = InsightsSchema.parse(await this.get(`/${encodeURIComponent(mediaId)}/insights`, { metric }, accessToken));
        const out = { ...empty };
        for (const item of parsed.data) {
          const raw = item.total_value?.value ?? item.values?.[0]?.value;
          const value = typeof raw === 'number' ? raw : null;
          if (item.name === 'reach') out.reach = value;
          if (item.name === 'views') out.views = value;
          if (item.name === 'saved') out.saves = value;
          if (item.name === 'shares') out.shares = value;
          if (item.name === 'total_interactions') out.totalInteractions = value;
        }
        return out;
      } catch (err) {
        if (err instanceof MetaApiError && err.requiresReauth) throw err;
      }
    }
    return empty;
  }

  /** Insights diários da conta (melhor esforço). Métricas não suportadas retornam null. */
  async getAccountDailyInsights(
    instagramAccountId: string,
    accessToken: string
  ): Promise<{ reach: number | null; profileViews: number | null; websiteClicks: number | null }> {
    const out = { reach: null as number | null, profileViews: null as number | null, websiteClicks: null as number | null };
    try {
      const parsed = InsightsSchema.parse(
        await this.get(
          `/${encodeURIComponent(instagramAccountId)}/insights`,
          { metric: 'reach,profile_views,website_clicks', period: 'day', metric_type: 'total_value' },
          accessToken
        )
      );
      for (const item of parsed.data) {
        const raw = item.total_value?.value ?? item.values?.[0]?.value;
        const value = typeof raw === 'number' ? raw : null;
        if (item.name === 'reach') out.reach = value;
        if (item.name === 'profile_views') out.profileViews = value;
        if (item.name === 'website_clicks') out.websiteClicks = value;
      }
    } catch (err) {
      if (err instanceof MetaApiError && err.requiresReauth) throw err;
    }
    return out;
  }

  // ---------- HTTP ----------

  private async get(path: string, params: Record<string, string>, accessToken?: string): Promise<unknown> {
    const search = new URLSearchParams(params);
    if (accessToken) {
      search.set('access_token', accessToken);
      search.set('appsecret_proof', appSecretProof(accessToken, this.config.appSecret));
    }
    const url = `${this.baseUrl}/${this.config.graphVersion}${path}?${search.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    } catch {
      throw new MetaApiError('Falha de rede ao contatar a Meta Graph API.', 502, null);
    } finally {
      clearTimeout(timer);
    }
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      const parsed = MetaErrorSchema.safeParse(body);
      throw new MetaApiError(
        parsed.success ? parsed.data.error.message || 'Erro na Meta Graph API.' : 'Erro na Meta Graph API.',
        res.status,
        parsed.success ? parsed.data.error.code ?? null : null
      );
    }
    return body;
  }
}
