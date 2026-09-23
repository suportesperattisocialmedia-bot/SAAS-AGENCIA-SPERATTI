/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Instagram / Meta Graph API Provider
 * Clean abstraction handling all direct communication with Meta Graph API.
 */

export interface MetaProfile {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
}

export interface MetaRawMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export interface MetaNormalizedInsights {
  reach: number | null;
  impressions: number | null;
  views: number | null;
  likes: number;
  comments: number;
  shares: number | null;
  saves: number | null;
  profileActivity: number | null;
  engagementRate: number;
}

export interface InstagramProvider {
  exchangeCode(code: string, redirectUri: string): Promise<{ accessToken: string; expiresInMs: number }>;
  getBusinessAccount(accessToken: string): Promise<MetaProfile | null>;
  getMediaList(instagramAccountId: string, accessToken: string, limit?: number): Promise<MetaRawMedia[]>;
  getMediaInsights(mediaId: string, mediaType: string, accessToken: string): Promise<MetaNormalizedInsights>;
  validateToken(accessToken: string): Promise<boolean>;
}

export class MetaInstagramProvider implements InstagramProvider {
  private appId: string;
  private appSecret: string;
  private graphVersion = 'v19.0';
  private baseUrl = 'https://graph.facebook.com';

  constructor(appId: string, appSecret: string) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  isConfigured(): boolean {
    return Boolean(this.appId && this.appSecret);
  }

  async exchangeCode(code: string, redirectUri: string): Promise<{ accessToken: string; expiresInMs: number }> {
    if (!this.isConfigured()) {
      throw new Error('Meta App ID ou Secret não configurados no servidor.');
    }

    // 1. Exchange short-lived token
    const shortTokenUrl = `${this.baseUrl}/${this.graphVersion}/oauth/access_token?client_id=${this.appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&client_secret=${this.appSecret}&code=${code}`;

    const shortRes = await fetch(shortTokenUrl);
    const shortJson = await shortRes.json();

    if (!shortRes.ok || !shortJson.access_token) {
      throw new Error(shortJson.error?.message || 'Falha ao trocar código de autorização pelo token Meta');
    }

    // 2. Exchange for long-lived token (60 days)
    const longTokenUrl = `${this.baseUrl}/${this.graphVersion}/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${shortJson.access_token}`;

    const longRes = await fetch(longTokenUrl);
    const longJson = await longRes.json();

    const finalToken = longJson.access_token || shortJson.access_token;
    const expiresInSec = longJson.expires_in || 5184000; // 60 days default

    return {
      accessToken: finalToken,
      expiresInMs: expiresInSec * 1000
    };
  }

  async getBusinessAccount(accessToken: string): Promise<MetaProfile | null> {
    const url = `${this.baseUrl}/${this.graphVersion}/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count,follows_count,media_count}&access_token=${accessToken}`;
    const res = await fetch(url);
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error?.message || 'Falha ao consultar contas no Meta Graph API');
    }

    const pages = json.data || [];
    for (const page of pages) {
      if (page.instagram_business_account) {
        return page.instagram_business_account as MetaProfile;
      }
    }

    return null;
  }

  async getMediaList(instagramAccountId: string, accessToken: string, limit = 25): Promise<MetaRawMedia[]> {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
    const url = `${this.baseUrl}/${this.graphVersion}/${instagramAccountId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;

    const res = await fetch(url);
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error?.message || 'Falha ao listar mídias do Instagram');
    }

    return (json.data || []) as MetaRawMedia[];
  }

  async getMediaInsights(mediaId: string, mediaType: string, accessToken: string): Promise<MetaNormalizedInsights> {
    // Determine metrics supported by media type
    // Video/Reels support: reach, saved, total_interactions, plays/views
    // Images/Carousel support: reach, saved, impressions
    let metricNames = 'reach,saved';
    if (mediaType === 'VIDEO') {
      metricNames = 'reach,saved,plays,total_interactions';
    } else {
      metricNames = 'reach,saved,impressions';
    }

    const url = `${this.baseUrl}/${this.graphVersion}/${mediaId}/insights?metric=${metricNames}&access_token=${accessToken}`;

    let reach: number | null = null;
    let impressions: number | null = null;
    let views: number | null = null;
    let saves: number | null = null;
    let shares: number | null = null;
    let profileActivity: number | null = null;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];

        for (const item of data) {
          const val = item.values?.[0]?.value;
          if (typeof val === 'number') {
            if (item.name === 'reach') reach = val;
            if (item.name === 'impressions') impressions = val;
            if (item.name === 'plays' || item.name === 'views') views = val;
            if (item.name === 'saved') saves = val;
            if (item.name === 'shares') shares = val;
            if (item.name === 'profile_activity') profileActivity = val;
          }
        }
      }
    } catch {
      // Insights query can be unavailable for legacy or private posts; leave as null
    }

    return {
      reach,
      impressions,
      views,
      likes: 0,
      comments: 0,
      saves,
      shares,
      profileActivity,
      engagementRate: 0
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/${this.graphVersion}/me?access_token=${accessToken}`);
      return res.ok;
    } catch {
      return false;
    }
  }
}
