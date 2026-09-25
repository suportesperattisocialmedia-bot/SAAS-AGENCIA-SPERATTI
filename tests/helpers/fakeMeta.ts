/** fetch falso que imita respostas reais da Graph API para testes do provider. */
export interface FakeMetaOptions {
  mediaIds?: string[];
  failInsights?: boolean;
  tokenError?: boolean;
}

export const FAKE_ACCESS_TOKEN = 'EAAtestlonglivedtoken1234567890abcdef';

export function createFakeMetaFetch(options: FakeMetaOptions = {}): { fetch: (url: string) => Promise<Response>; calls: string[] } {
  const calls: string[] = [];
  const mediaIds = options.mediaIds ?? ['17900000000000001', '17900000000000002'];
  const respond = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

  const fetchImpl = (url: string): Promise<Response> => {
    calls.push(url);
    const u = new URL(url);
    const p = u.pathname.replace(/^\/v[0-9.]+/, '');
    if (options.tokenError && p !== '/oauth/access_token') {
      return respond(400, { error: { message: 'Error validating access token', code: 190 } });
    }
    if (p === '/oauth/access_token') return respond(200, { access_token: FAKE_ACCESS_TOKEN, token_type: 'bearer', expires_in: 5184000 });
    if (p === '/me/permissions') return respond(200, { data: [{ permission: 'instagram_basic', status: 'granted' }, { permission: 'instagram_manage_insights', status: 'granted' }] });
    if (p === '/me/accounts') {
      return respond(200, { data: [{ id: 'page-1', name: 'Página', instagram_business_account: { id: 'ig-123', username: 'cliente_real', followers_count: 1200, follows_count: 80, media_count: 2 } }] });
    }
    if (p === '/ig-123') return respond(200, { id: 'ig-123', username: 'cliente_real', followers_count: 1200, follows_count: 80, media_count: 2 });
    if (p === '/ig-123/media') {
      return respond(200, {
        data: mediaIds.map((id, i) => ({
          id,
          caption: `Post ${i}`,
          media_type: i % 2 === 0 ? 'VIDEO' : 'CAROUSEL_ALBUM',
          media_product_type: i % 2 === 0 ? 'REELS' : 'FEED',
          permalink: `https://www.instagram.com/p/${id}/`,
          timestamp: '2026-09-01T12:00:00+0000',
          like_count: 10 + i,
          comments_count: 2
        }))
      });
    }
    if (p === '/ig-123/insights') return respond(400, { error: { message: 'metric not supported', code: 100 } });
    if (p.endsWith('/insights')) {
      if (options.failInsights) return respond(400, { error: { message: 'unsupported', code: 100 } });
      return respond(200, { data: [{ name: 'reach', values: [{ value: 500 }] }, { name: 'saved', values: [{ value: 7 }] }, { name: 'views', values: [{ value: 900 }] }] });
    }
    return respond(404, { error: { message: 'unknown path', code: 803 } });
  };
  return { fetch: fetchImpl, calls };
}
