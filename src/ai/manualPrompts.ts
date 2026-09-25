/**
 * IA manual: o sistema monta um prompt completo com os dados reais do cliente,
 * o usuário cola em qualquer IA (ChatGPT, Gemini, Claude...) e devolve a resposta
 * aqui. A resposta é validada com Zod antes de ser salva. Nenhuma chave de API.
 */

import { z } from 'zod';
import type { AccountSnapshot, AudienceInsight, Client, Competitor, Content, ContentIdea } from '../types';
import { IdeaItemSchema, ProfileDiagnosticResponseSchema, type ProfileDiagnosticResponse } from '../schemas/aiSchemas';
import { avgMetric, formatMetric, isMetric, sumMetric } from '../utils/metrics';

export interface PromptContext {
  client: Client;
  contents: Content[];
  snapshots: AccountSnapshot[];
  competitors: Competitor[];
  audienceInsights: AudienceInsight[];
}

const line = (label: string, value: string | undefined | null) => `- ${label}: ${value && value.trim() ? value.trim() : 'não informado'}`;

function clientBlock(c: Client): string {
  return [
    line('Nome', c.name),
    line('Instagram', c.instagram),
    line('Empresa/marca', c.company),
    line('Cidade', c.city),
    line('Segmento', [c.segment, c.subsegment].filter(Boolean).join(' / ')),
    line('Público-alvo', c.targetAudience),
    line('Persona', c.persona),
    line('Ticket médio', c.averageTicket),
    line('Produtos', c.products),
    line('Serviços', c.services),
    line('Objetivos', c.objectives.join(', ')),
    line('Pilares de conteúdo', c.pillars.join(', ')),
    line('Formatos prioritários', c.formats.join(', ')),
    line('Tom de voz', c.toneOfVoice),
    line('Diferenciais', c.differentiators),
    line('Site', c.website),
    line('Observações da equipe', c.notes)
  ].join('\n');
}

function metricsBlock(contents: Content[], snapshots: AccountSnapshot[]): string {
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const withFollowers = sorted.filter((s) => isMetric(s.followers));
  const latest = withFollowers.at(-1);
  const first = withFollowers[0];
  const followerLine =
    latest && first && latest !== first
      ? `${formatMetric(latest.followers)} em ${latest.date} (era ${formatMetric(first.followers)} em ${first.date})`
      : latest
        ? `${formatMetric(latest.followers)} em ${latest.date}`
        : 'não disponível';

  const byFormat = new Map<string, number>();
  contents.forEach((c) => byFormat.set(c.format, (byFormat.get(c.format) ?? 0) + 1));

  return [
    `- Seguidores: ${followerLine}`,
    `- Publicações catalogadas: ${contents.length}`,
    `- Distribuição por formato: ${[...byFormat.entries()].map(([f, n]) => `${f} (${n})`).join(', ') || 'não disponível'}`,
    `- Média de visualizações por post: ${formatMetric(avgMetric(contents.map((c) => c.metrics.views)), { fallback: 'não disponível' })}`,
    `- Média de alcance por post: ${formatMetric(avgMetric(contents.map((c) => c.metrics.reach)), { fallback: 'não disponível' })}`,
    `- Engajamento médio (interações/alcance): ${formatMetric(avgMetric(contents.map((c) => c.metrics.engagementRate), 2), { suffix: '%', fallback: 'não disponível' })}`,
    `- Total de salvamentos: ${formatMetric(sumMetric(contents.map((c) => c.metrics.saves)), { fallback: 'não disponível' })}`,
    `- Total de compartilhamentos: ${formatMetric(sumMetric(contents.map((c) => c.metrics.shares)), { fallback: 'não disponível' })}`
  ].join('\n');
}

function postsBlock(contents: Content[], limit = 12): string {
  if (contents.length === 0) return 'Nenhuma publicação catalogada ainda.';
  const recent = [...contents].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit);
  return recent
    .map((c, i) => {
      const m = c.metrics;
      const metrics = [
        `views ${formatMetric(m.views)}`,
        `alcance ${formatMetric(m.reach)}`,
        `curtidas ${formatMetric(m.likes)}`,
        `comentários ${formatMetric(m.comments)}`,
        `salvos ${formatMetric(m.saves)}`,
        `compart. ${formatMetric(m.shares)}`
      ].join(' | ');
      const caption = (c.caption || c.title).replace(/\s+/g, ' ').slice(0, 280);
      return `${i + 1}. [${c.publishedAt.slice(0, 10)}] ${c.format} (pilar: ${c.pillar})\n   Legenda: "${caption}"\n   Métricas: ${metrics}`;
    })
    .join('\n');
}

function competitorsBlock(competitors: Competitor[]): string {
  const approved = competitors.filter((c) => c.status === 'approved');
  if (approved.length === 0) return 'Nenhum concorrente cadastrado.';
  return approved
    .map(
      (c) =>
        `- ${c.name} (${c.instagram}): seguidores ${formatMetric(c.followers)}, ${formatMetric(c.postingFrequencyWeekly, { suffix: ' posts/semana' })}, formatos ${c.topFormats.join(', ') || 'n/d'}, temas ${c.recentThemes.join(', ') || 'n/d'}${c.notes ? `. Notas: ${c.notes}` : ''}`
    )
    .join('\n');
}

function audienceBlock(insights: AudienceInsight[]): string {
  if (insights.length === 0) return 'Nenhum insight de público registrado.';
  return insights
    .slice(0, 25)
    .map((a) => `- [${a.category}] ${a.title}${a.isHypothesis ? ' (hipótese)' : ''}: ${a.description.slice(0, 200)}`)
    .join('\n');
}

const HONESTY_RULES = `REGRAS OBRIGATÓRIAS:
1. Use SOMENTE os dados fornecidos acima. Não invente números, porcentagens, seguidores, alcance, resultados de concorrentes ou estatísticas de mercado.
2. Onde aparecer "n/d" ou "não disponível", o dado não existe: diga que falta dado, não estime.
3. Quando algo for inferência sua, deixe claro no texto que é uma hipótese.
4. Seja específico para este cliente. Evite conselhos genéricos que serviriam para qualquer perfil.
5. Escreva em português do Brasil, com linguagem direta e profissional.`;

export function buildDiagnosticPrompt(ctx: PromptContext): string {
  return `Você é um estrategista sênior de marketing digital e Instagram. Faça uma análise completa e aprofundada do perfil abaixo, cobrindo perfil, conteúdo, performance e estratégia, e termine com um plano de ação priorizado.

## DADOS DO CLIENTE
${clientBlock(ctx.client)}

## MÉTRICAS REAIS DISPONÍVEIS
${metricsBlock(ctx.contents, ctx.snapshots)}

## PUBLICAÇÕES RECENTES (mais novas primeiro)
${postsBlock(ctx.contents)}

## CONCORRENTES MONITORADOS
${competitorsBlock(ctx.competitors)}

## INSIGHTS DE PÚBLICO
${audienceBlock(ctx.audienceInsights)}

${HONESTY_RULES}

## FORMATO DA RESPOSTA
Responda APENAS com um bloco JSON válido, sem nenhum texto antes ou depois, exatamente com esta estrutura (todos os campos em texto corrido, listas com 3 a 6 itens):

{
  "profileSection": {
    "photoAnalysis": "análise da foto e identidade visual do perfil",
    "usernameAndName": "análise do @ e do nome exibido",
    "bioClarity": "clareza da bio e da promessa",
    "ctaAndLink": "chamada para ação e link da bio",
    "highlightsStructure": "estrutura recomendada de destaques",
    "valueProposition": "proposta de valor percebida",
    "perceivedAuthority": "nível de autoridade percebida"
  },
  "contentSection": {
    "publishingFrequency": "frequência e consistência",
    "predominantFormats": "formatos predominantes e equilíbrio",
    "editorialPillars": "pilares editoriais e lacunas",
    "visualIdentityAndAesthetics": "identidade visual",
    "captionQuality": "qualidade das legendas",
    "hookUsage": "uso e qualidade dos ganchos",
    "ctaEffectiveness": "efetividade das chamadas para ação",
    "topPerformingThemes": "temas com melhor resposta"
  },
  "performanceSection": {
    "engagementAnalysis": "leitura do engajamento com base nos dados",
    "reachAndImpressions": "leitura de alcance e visualizações",
    "savesAndShares": "leitura de salvamentos e compartilhamentos",
    "audienceRetention": "retenção e resposta do público",
    "bestContentObservations": "o que os melhores posts têm em comum",
    "worstContentObservations": "o que os piores posts têm em comum"
  },
  "strategySection": {
    "strengths": ["força 1", "força 2"],
    "vulnerabilities": ["fraqueza 1", "fraqueza 2"],
    "immediateOpportunities": ["oportunidade 1", "oportunidade 2"],
    "highImpactPillars": ["pilar 1", "pilar 2"],
    "recommendedFormats": ["formato 1", "formato 2"]
  },
  "nextActions": ["ação prioritária 1", "ação prioritária 2", "ação prioritária 3"]
}`;
}

export function buildIdeasPrompt(ctx: PromptContext, count = 5): string {
  return `Você é um estrategista de conteúdo para Instagram. Crie ${count} ideias de conteúdo estratégicas e específicas para o cliente abaixo, prontas para produção.

## DADOS DO CLIENTE
${clientBlock(ctx.client)}

## MÉTRICAS REAIS DISPONÍVEIS
${metricsBlock(ctx.contents, ctx.snapshots)}

## PUBLICAÇÕES RECENTES
${postsBlock(ctx.contents, 8)}

## INSIGHTS DE PÚBLICO
${audienceBlock(ctx.audienceInsights)}

## CONCORRENTES MONITORADOS
${competitorsBlock(ctx.competitors)}

${HONESTY_RULES}
6. Não prometa resultados numéricos ("vai viralizar", "100 mil views").
7. Varie formatos e pilares entre as ideias.

## FORMATO DA RESPOSTA
Responda APENAS com um array JSON válido, sem nenhum texto antes ou depois, com ${count} objetos neste formato:

[
  {
    "title": "título curto da ideia",
    "description": "o que é o conteúdo e como executar",
    "pillar": "um dos pilares do cliente",
    "objective": "Atração | Autoridade | Nutrição | Conversão | Relacionamento",
    "format": "Reels | Carrossel | Foto | Stories | Live",
    "hook": "frase de abertura exata",
    "hookCategory": "Curiosidade | Dor | Autoridade | Contrarian | Pergunta | Resultado | História | Lista",
    "cta": "chamada para ação final",
    "potential": "Alto | Médio | Muito Alto",
    "whyDoThis": "por que essa ideia faz sentido para este cliente",
    "targetAudienceSnippet": "para quem é"
  }
]`;
}

/** Extrai o JSON de uma resposta colada (tolera ```json, texto antes/depois e aspas tipográficas). */
export function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/```(?:json)?/gi, '')
    .trim();
  const starts = [cleaned.indexOf('{'), cleaned.indexOf('[')].filter((i) => i >= 0);
  if (starts.length === 0) throw new Error('Não encontrei um JSON na resposta. Copie a resposta completa da IA.');
  const start = Math.min(...starts);
  const close = cleaned[start] === '{' ? '}' : ']';
  const end = cleaned.lastIndexOf(close);
  if (end <= start) throw new Error('O JSON da resposta está incompleto. Peça para a IA responder novamente.');
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error('A resposta não é um JSON válido. Peça para a IA "responder apenas com o JSON válido".');
  }
}

function describeIssues(error: z.ZodError): string {
  const fields = error.issues.slice(0, 4).map((i) => i.path.join('.') || 'raiz');
  return `A resposta não está no formato esperado (campos com problema: ${fields.join(', ')}).`;
}

export function parseDiagnosticResponse(text: string): ProfileDiagnosticResponse {
  const result = ProfileDiagnosticResponseSchema.safeParse(extractJson(text));
  if (!result.success) throw new Error(describeIssues(result.error));
  return result.data;
}

const FORMAT_ALIASES: Record<string, string> = { reel: 'Reels', reels: 'Reels', carrossel: 'Carrossel', carousel: 'Carrossel', foto: 'Foto', post: 'Foto', imagem: 'Foto', stories: 'Stories', story: 'Stories', live: 'Live' };
const POTENTIAL_ALIASES: Record<string, string> = { alto: 'Alto', médio: 'Médio', medio: 'Médio', 'muito alto': 'Muito Alto' };

export function parseIdeasResponse(text: string, clientId: string): ContentIdea[] {
  const raw = extractJson(text);
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { ideas?: unknown }).ideas) ? (raw as { ideas: unknown[] }).ideas : null;
  if (!list) throw new Error('Esperava uma lista de ideias ([ ... ]) na resposta.');
  // Normaliza pequenas variações de escrita (ex.: "reels", "medio") antes de validar.
  const normalized = list.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const o = { ...(item as Record<string, unknown>) };
    if (typeof o.format === 'string') o.format = FORMAT_ALIASES[o.format.trim().toLowerCase()] ?? o.format;
    if (typeof o.potential === 'string') o.potential = POTENTIAL_ALIASES[o.potential.trim().toLowerCase()] ?? o.potential;
    return o;
  });
  const result = z.array(IdeaItemSchema).min(1).max(20).safeParse(normalized);
  if (!result.success) throw new Error(describeIssues(result.error));
  const now = new Date().toISOString();
  return result.data.map((idea) => ({
    ...idea,
    source: 'IA externa (prompt manual)',
    id: `idea-${crypto.randomUUID()}`,
    clientId,
    status: 'IDEIA' as const,
    notes: '',
    createdAt: now,
    updatedAt: now
  }));
}
