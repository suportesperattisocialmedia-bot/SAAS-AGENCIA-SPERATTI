/**
 * Piloto da Semana: dados reais -> padrões vencedores -> prompt -> plano da IA externa
 * -> posts no calendário + tarefas de produção no CRM (com prazo e checklist).
 */

import { z } from 'zod';
import type { AudienceInsight, Client, Content, ContentFormat, ContentIdea, TaskType } from '../types';
import { HONESTY_RULES, audienceBlock, clientBlock, extractJson, postsBlock } from './manualPrompts';
import type { WinningPatterns } from '../services/winningPatterns';
import { formatMetric } from '../utils/metrics';
import { brasiliaDay } from '../services/dashboardInsights';
import { normalizeWeekDay, weekDayLabel } from '../services/storage/migration';
import { storageService } from '../services/storageService';
import { generateUUID } from '../utils/uuid';

const DAY_MS = 24 * 3600 * 1000;

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Próxima segunda-feira (data de Brasília). */
export function nextMonday(now = new Date()): string {
  const today = brasiliaDay(now);
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return addDays(today, ((8 - dow) % 7) || 7);
}

export function weekdayOfDate(day: string): ReturnType<typeof normalizeWeekDay> {
  const names = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  return normalizeWeekDay(names[new Date(`${day}T12:00:00Z`).getUTCDay()]);
}

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

function patternsBlock(p: WinningPatterns): string {
  if (p.sample === 0) return 'Sem posts com visualizações nos últimos 90 dias. Não há padrão comprovado: proponha uma semana de teste variando dia, horário e formato.';
  const b = (x: { label: string; posts: number; avgViews: number | null; avgEngagement: number | null } | null) =>
    x ? `${x.label}: média de ${formatMetric(x.avgViews)} visualizações, engajamento ${formatMetric(x.avgEngagement, { suffix: '%' })} (${x.posts} posts)` : 'não identificado';
  return [
    `- Amostra: ${p.sample} posts com visualizações nos últimos ${p.periodDays} dias${p.lowSample ? ' (AMOSTRA PEQUENA: trate como indício, não como regra)' : ''}`,
    `- Melhor dia da semana: ${b(p.bestWeekday)}`,
    `- Melhor faixa de horário: ${p.hourBands ? b(p.bestHourBand) : 'o CSV não trouxe horários; não há dado de horário'}`,
    `- Formato campeão: ${b(p.bestFormat)}`,
    `- Todos os formatos: ${p.formats.map((f) => `${f.label} ${formatMetric(f.avgViews)} (${f.posts})`).join(', ') || 'n/d'}`,
    `- Dias da semana: ${p.weekdays.filter((d) => d.posts > 0).map((d) => `${d.label} ${formatMetric(d.avgViews)} (${d.posts})`).join(', ') || 'n/d'}`,
    `- Ritmo atual: ${p.cadencePerWeek === null ? 'n/d' : `${p.cadencePerWeek} posts por semana (últimas 4 semanas)`}`
  ].join('\n');
}

export interface WeeklyPilotInput {
  client: Client;
  patterns: WinningPatterns;
  contents: Content[];
  ideas: ContentIdea[];
  audienceInsights: AudienceInsight[];
  weekStart: string;
  postsCount: number;
}

export function buildWeeklyPlanPrompt(i: WeeklyPilotInput): string {
  const end = addDays(i.weekStart, 6);
  const backlog = i.ideas.filter((x) => x.status === 'IDEIA').slice(0, 10);
  return `Você é o estrategista de conteúdo responsável pelo Instagram do cliente abaixo. Monte o PLANO DA SEMANA de ${ddmm(i.weekStart)} (segunda) a ${ddmm(end)} (domingo), com exatamente ${i.postsCount} publicações prontas para produção.

## DADOS DO CLIENTE
${clientBlock(i.client)}

## PADRÕES VENCEDORES (calculados com os posts reais do cliente)
${patternsBlock(i.patterns)}

## POSTS DE MELHOR DESEMPENHO
${postsBlock(i.patterns.topPosts, 5)}

## PUBLICAÇÕES MAIS RECENTES (evite repetir temas)
${postsBlock(i.contents, 8)}

## BANCO DE IDEIAS APROVADAS (use quando fizer sentido)
${backlog.length ? backlog.map((x) => `- ${x.title} (${x.format}): ${x.hook}`).join('\n') : 'Nenhuma ideia no banco.'}

## INSIGHTS DE PÚBLICO
${audienceBlock(i.audienceInsights)}

${HONESTY_RULES}
6. Priorize os dias, horários e formatos vencedores quando a amostra permitir, mas reserve 1 publicação para testar algo diferente (diga qual é o teste no campo "why").
7. Distribua os pilares do cliente ao longo da semana. Não repita o mesmo tema de posts recentes.
8. Cada publicação precisa estar pronta para produzir: gancho exato, roteiro ou estrutura dos slides e legenda completa.
9. As datas devem estar entre ${i.weekStart} e ${end}. Horário no formato HH:MM (horário de Brasília).

## FORMATO DA RESPOSTA
Responda APENAS com um JSON válido, sem texto antes ou depois:

{
  "posts": [
    {
      "date": "${i.weekStart}",
      "time": "18:30",
      "format": "Reels | Carrossel | Foto | Stories",
      "pillar": "um dos pilares do cliente",
      "title": "título interno curto",
      "hook": "frase de abertura exata",
      "outline": "roteiro cena a cena (Reels) ou texto de cada slide (Carrossel)",
      "caption": "legenda completa pronta para publicar",
      "cta": "chamada para ação",
      "why": "por que este post, com base nos dados acima (ou qual hipótese está sendo testada)"
    }
  ]
}`;
}

const FORMAT_ALIASES: Record<string, ContentFormat> = {
  reel: 'Reels', reels: 'Reels', 'vídeo': 'Reels', video: 'Reels',
  carrossel: 'Carrossel', carousel: 'Carrossel',
  foto: 'Foto', post: 'Foto', imagem: 'Foto', 'estático': 'Foto', estatico: 'Foto',
  stories: 'Stories', story: 'Stories', live: 'Live'
};

const PlannedPostSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data no formato AAAA-MM-DD'),
  time: z.string().regex(/^\d{1,2}:\d{2}$/).optional().or(z.literal('')),
  format: z.enum(['Reels', 'Carrossel', 'Foto', 'Stories', 'Live']),
  pillar: z.string().default('Geral'),
  title: z.string().trim().min(1),
  hook: z.string().default(''),
  outline: z.string().default(''),
  caption: z.string().default(''),
  cta: z.string().default(''),
  why: z.string().default('')
});

export type PlannedPost = z.infer<typeof PlannedPostSchema> & { key: string };

export function parseWeeklyPlan(text: string): PlannedPost[] {
  const raw = extractJson(text);
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { posts?: unknown }).posts) ? (raw as { posts: unknown[] }).posts : null;
  if (!list || list.length === 0) throw new Error('Esperava um objeto com "posts": [ ... ] na resposta.');
  const normalized = list.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const o = { ...(item as Record<string, unknown>) };
    if (typeof o.format === 'string') o.format = FORMAT_ALIASES[o.format.trim().toLowerCase()] ?? o.format;
    if (typeof o.time === 'string') o.time = o.time.trim().replace(/h$/i, ':00').replace(/^(\d{1,2})h(\d{2})$/i, '$1:$2');
    return o;
  });
  const result = z.array(PlannedPostSchema).min(1).max(21).safeParse(normalized);
  if (!result.success) {
    const fields = result.error.issues.slice(0, 4).map((i) => i.path.join('.'));
    throw new Error(`A resposta não está no formato esperado (campos com problema: ${fields.join(', ')}).`);
  }
  return result.data
    .map((p) => ({ ...p, time: p.time || undefined, key: generateUUID() }))
    .sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`));
}

const TYPE_OF: Record<ContentFormat, TaskType> = { Reels: 'Reels', Carrossel: 'Carrossel', Foto: 'Post', Stories: 'Stories', Live: 'Outro' };

export const PRODUCTION_CHECKLIST: Record<ContentFormat, string[]> = {
  Reels: ['Roteiro', 'Gravação', 'Edição', 'Legenda', 'Aprovação do cliente', 'Agendar publicação'],
  Carrossel: ['Texto dos slides', 'Design', 'Legenda', 'Aprovação do cliente', 'Agendar publicação'],
  Foto: ['Imagem', 'Legenda', 'Aprovação do cliente', 'Agendar publicação'],
  Stories: ['Sequência dos stories', 'Produção', 'Aprovação do cliente', 'Publicar'],
  Live: ['Pauta', 'Divulgação', 'Teste técnico', 'Fazer a live']
};

/** Cria os posts no calendário e as tarefas de produção. Retorna quantos de cada. */
export function applyWeeklyPlan(client: Client, posts: PlannedPost[], now = new Date()): { calendar: number; tasks: number } {
  const today = brasiliaDay(now);
  posts.forEach((p) => {
    const brief = [
      `Publicação: ${weekDayLabel(weekdayOfDate(p.date))} ${ddmm(p.date)}${p.time ? ` às ${p.time}` : ''}`,
      p.hook && `Gancho: ${p.hook}`,
      p.outline && `Roteiro:\n${p.outline}`,
      p.caption && `Legenda:\n${p.caption}`,
      p.cta && `CTA: ${p.cta}`,
      p.why && `Por quê: ${p.why}`
    ]
      .filter(Boolean)
      .join('\n\n');

    storageService.calendar.saveItem({
      clientId: client.id,
      dayOfWeek: weekdayOfDate(p.date),
      timeSlot: p.time,
      title: p.title,
      format: p.format,
      pillar: p.pillar || 'Geral',
      hook: p.hook,
      cta: p.cta,
      status: 'PLANEJADO',
      notes: `Piloto da Semana (${ddmm(p.date)}). ${p.why}`.trim()
    });

    const due = addDays(p.date, -1);
    storageService.tasks.save({
      clientId: client.id,
      title: `${p.format}: ${p.title}`,
      type: TYPE_OF[p.format],
      status: 'todo',
      priority: 'normal',
      dueDate: due < today ? today : due,
      notes: brief,
      checklist: PRODUCTION_CHECKLIST[p.format].map((text) => ({ id: generateUUID(), text, done: false }))
    });
  });
  return { calendar: posts.length, tasks: posts.length };
}
