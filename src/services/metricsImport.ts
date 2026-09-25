/**
 * Importação de métricas a partir de planilhas (CSV exportado do Meta Business Suite,
 * planilha-modelo da agência ou linhas coladas do Excel/Google Sheets).
 *
 * Tolerante a: cabeçalhos em português ou inglês, separador vírgula/ponto e vírgula/tab,
 * BOM, números "1.234" / "1,234", datas dd/mm/aaaa, mm/dd/aaaa e ISO.
 * Regra: célula vazia ou ilegível = métrica indisponível (null), nunca 0 inventado.
 */

import type { Client, Content, ContentFormat } from '../types';
import { engagementFrom } from '../utils/metrics';
import { storageService } from './storageService';

export type ImportField =
  | 'externalId'
  | 'publishedAt'
  | 'permalink'
  | 'caption'
  | 'type'
  | 'views'
  | 'reach'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves';

export const FIELD_LABELS: Record<ImportField, string> = {
  externalId: 'ID da publicação',
  publishedAt: 'Data de publicação',
  permalink: 'Link do post',
  caption: 'Legenda / descrição',
  type: 'Tipo (Reels, Carrossel...)',
  views: 'Visualizações',
  reach: 'Alcance',
  likes: 'Curtidas',
  comments: 'Comentários',
  shares: 'Compartilhamentos',
  saves: 'Salvamentos'
};

/** Palavras-chave (sem acento, minúsculas) reconhecidas em cada coluna. A ordem importa. */
const FIELD_ALIASES: Array<[ImportField, string[]]> = [
  ['externalId', ['identificacao da publicacao', 'id da publicacao', 'post id', 'media id', 'id do post', 'id']],
  ['publishedAt', ['horario de publicacao', 'hora da publicacao', 'data de publicacao', 'publish time', 'published', 'data', 'date']],
  ['permalink', ['link permanente', 'permalink', 'link', 'url']],
  ['caption', ['descricao', 'description', 'legenda', 'caption', 'titulo', 'title']],
  ['type', ['tipo de publicacao', 'tipo de post', 'post type', 'media type', 'tipo', 'formato', 'type', 'format']],
  ['views', ['visualizacoes', 'views', 'reproducoes', 'plays', 'impressoes', 'impressions']],
  ['reach', ['alcance', 'reach', 'contas alcancadas']],
  ['likes', ['curtidas', 'likes', 'reacoes', 'reactions']],
  ['comments', ['comentarios', 'comments']],
  ['shares', ['compartilhamentos', 'shares']],
  ['saves', ['salvamentos', 'salvos', 'saves', 'saved']]
];

export type ColumnMapping = Partial<Record<ImportField, number>>;

export interface ParsedPost {
  key: string;
  externalId: string | null;
  publishedAt: string | null;
  permalink: string | null;
  caption: string;
  format: ContentFormat;
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
}

export interface ImportPreview {
  headers: string[];
  rows: string[][];
  mapping: ColumnMapping;
  posts: ParsedPost[];
  skipped: number;
  warnings: string[];
}

export function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function detectDelimiter(firstLine: string): string {
  const counts = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

/** Parser CSV com suporte a aspas, quebras de linha dentro de aspas e "" escapado. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const firstLine = clean.split('\n').find((l) => l.trim()) ?? '';
  const delimiter = detectDelimiter(firstLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === '') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

export function guessMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const used = new Set<number>();
  const mapping: ColumnMapping = {};
  for (const [field, aliases] of FIELD_ALIASES) {
    // Aliases em ordem de prioridade: primeiro nome exato, depois "contém".
    let index = -1;
    for (const alias of aliases) {
      index = normalized.findIndex((h, i) => !used.has(i) && h === alias);
      if (index >= 0) break;
    }
    if (index < 0) {
      for (const alias of aliases.filter((a) => a.length > 3)) {
        index = normalized.findIndex((h, i) => !used.has(i) && h.includes(alias));
        if (index >= 0) break;
      }
    }
    if (index >= 0) {
      mapping[field] = index;
      used.add(index);
    }
  }
  return mapping;
}

/** "1.234" → 1234; "1,234" → 1234; "1.234,5" → 1234.5; "" / "-" / "n/d" → null. */
export function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let v = raw.trim().replace(/\s/g, '');
  if (!v || /^(-|—|n\/?d|na|null|--)$/i.test(v)) return null;
  const multiplier = /mil$/i.test(v) ? 1000 : /k$/i.test(v) ? 1000 : /m$/i.test(v) ? 1_000_000 : 1;
  v = v.replace(/(mil|k|m)$/i, '');
  const hasComma = v.includes(',');
  const hasDot = v.includes('.');
  if (hasComma && hasDot) {
    v = v.lastIndexOf(',') > v.lastIndexOf('.') ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '');
  } else if (hasComma) {
    v = /,\d{3}$/.test(v) && multiplier === 1 ? v.replace(/,/g, '') : v.replace(',', '.');
  } else if (hasDot) {
    v = /\.\d{3}$/.test(v) && multiplier === 1 ? v.replace(/\./g, '') : v;
  }
  const n = Number(v.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * multiplier);
}

/** Decide dia/mês olhando todas as datas: se algum 1º número > 12, é dd/mm; se algum 2º > 12, é mm/dd. */
function detectDayFirst(values: string[]): boolean {
  for (const v of values) {
    const m = /^(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}/.exec(v.trim());
    if (!m) continue;
    if (Number(m[1]) > 12) return true;
    if (Number(m[2]) > 12) return false;
  }
  return true; // padrão brasileiro
}

export function parseDate(raw: string | undefined, dayFirst: boolean): string | null {
  if (!raw || !raw.trim()) return null;
  const v = raw.trim();
  const br = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2}))?/.exec(v);
  if (br) {
    const [a, b] = [Number(br[1]), Number(br[2])];
    const day = dayFirst ? a : b;
    const month = dayFirst ? b : a;
    const year = br[3].length === 2 ? 2000 + Number(br[3]) : Number(br[3]);
    const d = new Date(Date.UTC(year, month - 1, day, Number(br[4] ?? 12), Number(br[5] ?? 0)));
    return month >= 1 && month <= 12 && day >= 1 && day <= 31 && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  }
  const iso = new Date(v);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

export function parseFormat(raw: string | undefined, permalink: string | null): ContentFormat {
  const v = normalizeHeader(raw ?? '');
  if (/reel|video/.test(v) || /\/reel\//.test(permalink ?? '')) return 'Reels';
  if (/carrossel|carousel|album/.test(v)) return 'Carrossel';
  if (/story|stories/.test(v)) return 'Stories';
  if (/live|ao vivo/.test(v)) return 'Live';
  return 'Foto';
}

function hashKey(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export function buildPreview(text: string, mappingOverride?: ColumnMapping): ImportPreview {
  const table = parseCsv(text);
  if (table.length < 2) {
    return { headers: table[0] ?? [], rows: [], mapping: {}, posts: [], skipped: 0, warnings: ['O arquivo precisa ter uma linha de cabeçalho e pelo menos uma linha de dados.'] };
  }
  const [headers, ...rows] = table;
  const mapping = mappingOverride ?? guessMapping(headers);
  const cell = (row: string[], field: ImportField) => (mapping[field] !== undefined ? row[mapping[field] as number] : undefined);
  const dayFirst = detectDayFirst(rows.map((r) => cell(r, 'publishedAt') ?? ''));

  const warnings: string[] = [];
  if (mapping.publishedAt === undefined) warnings.push('Não encontrei a coluna de data. Escolha manualmente abaixo.');
  const metricFields: ImportField[] = ['views', 'reach', 'likes', 'comments', 'shares', 'saves'];
  const missing = metricFields.filter((f) => mapping[f] === undefined);
  if (missing.length === metricFields.length) warnings.push('Nenhuma coluna de métrica foi reconhecida. Confira o arquivo ou ajuste as colunas abaixo.');
  else if (missing.length) warnings.push(`Colunas não encontradas (ficarão como n/d): ${missing.map((f) => FIELD_LABELS[f]).join(', ')}.`);

  let skipped = 0;
  const posts: ParsedPost[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const publishedAt = parseDate(cell(row, 'publishedAt'), dayFirst);
    const permalink = cell(row, 'permalink')?.trim() || null;
    const externalId = cell(row, 'externalId')?.trim() || null;
    const caption = (cell(row, 'caption') ?? '').trim();
    // Linhas de total/resumo ou sem identificação mínima são ignoradas.
    if (!publishedAt && !permalink && !externalId) {
      skipped++;
      continue;
    }
    const key = externalId || permalink || `${publishedAt}-${hashKey(caption)}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    posts.push({
      key,
      externalId,
      publishedAt,
      permalink,
      caption,
      format: parseFormat(cell(row, 'type'), permalink),
      views: parseNumber(cell(row, 'views')),
      reach: parseNumber(cell(row, 'reach')),
      likes: parseNumber(cell(row, 'likes')),
      comments: parseNumber(cell(row, 'comments')),
      shares: parseNumber(cell(row, 'shares')),
      saves: parseNumber(cell(row, 'saves'))
    });
  }
  if (posts.length > 0 && posts.every((p) => !p.publishedAt)) warnings.push('Nenhuma data válida encontrada; os posts serão salvos com a data de hoje.');
  return { headers, rows, mapping, posts, skipped, warnings };
}

/** Grava os posts no workspace do cliente. Idempotente: reimportar atualiza em vez de duplicar. */
export function importPosts(client: Client, posts: ParsedPost[]): { created: number; updated: number } {
  let created = 0;
  let updated = 0;
  const existing = storageService.contents.getByClient(client.id);
  const now = new Date().toISOString();
  for (const p of posts) {
    const mediaKey = `import:${p.key}`;
    const current = existing.find((c) => c.instagramMediaId === mediaKey || (p.externalId && c.instagramMediaId === p.externalId));
    const firstLine = p.caption.split('\n')[0]?.trim() ?? '';
    const metrics = { views: p.views, reach: p.reach, likes: p.likes, comments: p.comments, shares: p.shares, saves: p.saves };
    const content: Omit<Content, 'id'> & { id?: string } = {
      id: current?.id,
      clientId: client.id,
      instagramMediaId: current?.instagramMediaId ?? mediaKey,
      permalink: p.permalink ?? undefined,
      title: firstLine.length > 3 ? firstLine.slice(0, 80) : `Publicação (${p.format})`,
      caption: p.caption,
      publishedAt: p.publishedAt ?? now,
      format: p.format,
      pillar: current?.pillar ?? 'Geral',
      objective: current?.objective ?? 'Engajamento',
      hook: current?.hook || firstLine.slice(0, 120),
      cta: current?.cta ?? '',
      aiAnalysis: current?.aiAnalysis,
      metrics: { ...metrics, engagementRate: engagementFrom(metrics) }
    };
    storageService.contents.upsert(content);
    if (current) updated++;
    else created++;
  }
  return { created, updated };
}

export const TEMPLATE_CSV =
  'Data de publicação;Link do post;Tipo;Legenda;Visualizações;Alcance;Curtidas;Comentários;Compartilhamentos;Salvamentos\n' +
  '15/09/2026;https://www.instagram.com/p/EXEMPLO/;Carrossel;Primeira linha da legenda;;;;;;\n';
