/**
 * Pesquisa externa (público e concorrentes). Nunca simula resultados:
 * sem provider configurado retorna `configured: false`. Com SerpAPI, devolve
 * apenas fontes reais (título, URL, trecho) com data de coleta; métricas
 * desconhecidas permanecem null e toda evidência é marcada como não verificada.
 */

import { z } from 'zod';
import { query } from '../db/database.js';
import { AppError } from '../http/errors.js';
import { log } from '../logging/logger.js';

const SerpResultSchema = z.object({
  organic_results: z
    .array(
      z.object({
        title: z.string(),
        link: z.string().url(),
        snippet: z.string().optional(),
        date: z.string().optional(),
        source: z.string().optional()
      })
    )
    .optional()
    .default([])
});

export interface ResearchSource {
  title: string;
  sourceUrl: string;
  source: string;
  evidence: string | null;
  publishedAt: string | null;
  retrievedAt: string;
  confidence: 'LOW';
}

export interface CompetitorCandidate {
  name: string;
  instagram: string;
  source: string;
  sourceUrl: string;
  evidence: string | null;
  retrievedAt: string;
  status: 'candidate';
  followers: null;
  avgViews: null;
  avgEngagementRate: null;
  postingFrequencyWeekly: null;
  similarityScore: null;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

async function serpSearch(q: string, fetchImpl: FetchLike): Promise<z.infer<typeof SerpResultSchema>['organic_results']> {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new AppError('INTERNAL_ERROR', 500, 'Provider de pesquisa indisponível.');
  const params = new URLSearchParams({ engine: 'google', q, hl: 'pt-br', gl: 'br', num: '10', api_key: key });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetchImpl(`https://serpapi.com/search.json?${params.toString()}`, { signal: controller.signal });
    if (!res.ok) throw new AppError('INTERNAL_ERROR', 502, 'Falha ao consultar o provider de pesquisa.');
    return SerpResultSchema.parse(await res.json()).organic_results;
  } finally {
    clearTimeout(timer);
  }
}

async function recordRun(agencyId: string, clientId: string, q: string, status: string, sources: ResearchSource[], errorMessage: string | null): Promise<void> {
  try {
    const runId = crypto.randomUUID();
    await query(
      'INSERT INTO research_runs (id, agency_id, client_id, query, provider, status, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [runId, agencyId, clientId, q, 'serpapi', status, errorMessage]
    );
    for (const s of sources) {
      await query(
        `INSERT INTO research_sources (id, agency_id, research_run_id, source, source_url, title, published_at, retrieved_at, evidence, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [crypto.randomUUID(), agencyId, runId, s.source, s.sourceUrl, s.title, null, s.retrievedAt, s.evidence, s.confidence]
      );
    }
  } catch (err) {
    log.warn('research.record_failed', { cause: err instanceof Error ? err : String(err) });
  }
}

export async function runAudienceResearch(
  input: { agencyId: string; clientId: string; segment: string; category?: string; query?: string },
  fetchImpl: FetchLike = fetch
): Promise<{ configured: boolean; message?: string; sources: ResearchSource[] }> {
  if (!process.env.SERPAPI_KEY) {
    return { configured: false, message: 'Pesquisa externa não configurada.', sources: [] };
  }
  const q = input.query || `${input.segment} ${input.category ?? ''} dúvidas e objeções do público`;
  const retrievedAt = new Date().toISOString();
  const results = await serpSearch(q, fetchImpl);
  const sources: ResearchSource[] = results.map((r) => ({
    title: r.title,
    sourceUrl: r.link,
    source: r.source || new URL(r.link).hostname,
    evidence: r.snippet ?? null,
    publishedAt: r.date ?? null,
    retrievedAt,
    confidence: 'LOW'
  }));
  await recordRun(input.agencyId, input.clientId, q, 'SUCCESS', sources, null);
  return { configured: true, sources };
}

const INSTAGRAM_PROFILE = /instagram\.com\/([A-Za-z0-9._]{2,30})\/?(?:$|\?)/;
const RESERVED = new Set(['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'tv', 'about', 'developer']);

export async function discoverCompetitors(
  input: { agencyId: string; clientId: string; segment: string; city?: string },
  fetchImpl: FetchLike = fetch
): Promise<{ configured: boolean; message?: string; candidates: CompetitorCandidate[] }> {
  if (!process.env.SERPAPI_KEY) {
    return { configured: false, message: 'Pesquisa externa não configurada.', candidates: [] };
  }
  const q = `site:instagram.com ${input.segment} ${input.city ?? ''}`.trim();
  const retrievedAt = new Date().toISOString();
  const results = await serpSearch(q, fetchImpl);
  const seen = new Set<string>();
  const candidates: CompetitorCandidate[] = [];
  for (const r of results) {
    const handle = INSTAGRAM_PROFILE.exec(r.link)?.[1];
    if (!handle || RESERVED.has(handle.toLowerCase()) || seen.has(handle.toLowerCase())) continue;
    seen.add(handle.toLowerCase());
    candidates.push({
      name: r.title.replace(/\s*[•|(-].*$/, '').trim() || handle,
      instagram: `@${handle}`,
      source: 'Google (SerpAPI)',
      sourceUrl: r.link,
      evidence: r.snippet ?? null,
      retrievedAt,
      status: 'candidate',
      followers: null,
      avgViews: null,
      avgEngagementRate: null,
      postingFrequencyWeekly: null,
      similarityScore: null
    });
  }
  await recordRun(
    input.agencyId,
    input.clientId,
    q,
    'SUCCESS',
    candidates.map((c) => ({ title: c.name, sourceUrl: c.sourceUrl, source: c.source, evidence: c.evidence, publishedAt: null, retrievedAt, confidence: 'LOW' })),
    null
  );
  return { configured: true, candidates };
}
