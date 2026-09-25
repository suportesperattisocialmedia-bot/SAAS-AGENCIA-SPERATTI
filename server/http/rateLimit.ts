/**
 * Rate limit em memória por instância (janela fixa).
 * Em serverless cada instância tem seu próprio contador: é uma proteção de melhor
 * esforço contra abuso (login, IA). Para limites globais use Vercel Firewall / WAF.
 */

export interface RateLimitRule {
  name: string;
  limit: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function checkRateLimit(rule: RateLimitRule, key: string, now = Date.now()): boolean {
  const id = `${rule.name}:${key}`;
  const bucket = buckets.get(id);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_BUCKETS) buckets.clear();
    }
    buckets.set(id, { count: 1, resetAt: now + rule.windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= rule.limit;
}

export function resetRateLimits(): void {
  buckets.clear();
}

export const RATE_LIMITS = {
  login: { name: 'login', limit: 10, windowMs: 15 * 60 * 1000 },
  ai: { name: 'ai', limit: 30, windowMs: 60 * 1000 },
  oauth: { name: 'oauth', limit: 20, windowMs: 60 * 1000 },
  sync: { name: 'sync', limit: 10, windowMs: 60 * 1000 }
} satisfies Record<string, RateLimitRule>;
