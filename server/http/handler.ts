/**
 * Adaptador HTTP para Vercel Functions (assinatura Web: Request -> Response).
 * Centraliza requestId, headers de segurança, CORS same-origin, limite de payload,
 * rate limit, parsing Zod e formato de erro consistente.
 */

import { z } from 'zod';
import { AppError, Errors } from './errors.js';
import { log } from '../logging/logger.js';
import { checkRateLimit, type RateLimitRule } from './rateLimit.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiContext {
  request: Request;
  requestId: string;
  url: URL;
  ip: string;
}

export type ApiHandler = (ctx: ApiContext) => Promise<Response>;

const MAX_JSON_BYTES = 256 * 1024;

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cache-Control': 'no-store'
};

function withHeaders(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  headers.set('X-Request-ID', requestId);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function ok<T>(data: T, init: ResponseInit = {}): Response {
  return json({ ok: true, data }, init);
}

export function redirect(location: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(null, { status: 302, headers: { Location: location, ...extraHeaders } });
}

export function errorResponse(err: AppError, requestId: string): Response {
  const body: { ok: false; error: { code: string; message: string; requestId: string; details?: unknown } } = {
    ok: false,
    error: { code: err.code, message: err.message, requestId }
  };
  if (err.code === 'INVALID_REQUEST' && err.details) body.error.details = err.details;
  const headers: Record<string, string> = {};
  if (err.code === 'RATE_LIMITED') headers['Retry-After'] = '60';
  return json(body, { status: err.status, headers });
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Bloqueia requisições cross-site com efeitos colaterais (CSRF) quando o navegador
 * informa uma origem diferente da própria aplicação.
 */
function assertSameOrigin(request: Request, url: URL): void {
  const origin = request.headers.get('origin');
  if (!origin) return;
  if (origin !== url.origin) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
    if (!host || origin !== `${proto}://${host}`) throw Errors.forbidden();
  }
}

export async function readJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw Errors.invalid('Content-Type deve ser application/json.');
  }
  const declared = Number(request.headers.get('content-length') || '0');
  if (declared > MAX_JSON_BYTES) {
    throw new AppError('PAYLOAD_TOO_LARGE', 413, 'Payload excede o limite permitido.');
  }
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) {
    throw new AppError('PAYLOAD_TOO_LARGE', 413, 'Payload excede o limite permitido.');
  }
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw Errors.invalid('JSON malformado.');
  }
  return parseWith(schema, parsed);
}

export function parseWith<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw Errors.invalid(
      'Dados inválidos.',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    );
  }
  return result.data;
}

export function parseQuery<S extends z.ZodType>(url: URL, schema: S): z.infer<S> {
  return parseWith(schema, Object.fromEntries(url.searchParams.entries()));
}

export interface RouteOptions {
  rateLimit?: RateLimitRule;
}

/**
 * Cria um handler de método HTTP compatível com Vercel Functions.
 */
export function route(handler: ApiHandler, options: RouteOptions = {}): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    const ip = clientIp(request);
    const started = Date.now();
    let status = 500;

    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') assertSameOrigin(request, url);
      if (options.rateLimit && !checkRateLimit(options.rateLimit, ip)) throw Errors.rateLimited();
      const response = await handler({ request, requestId, url, ip });
      status = response.status;
      return withHeaders(response, requestId);
    } catch (err) {
      const appError =
        err instanceof AppError ? err : new AppError('INTERNAL_ERROR', 500, 'Erro interno do servidor.', { cause: err });
      status = appError.status;
      const level = appError.status >= 500 ? 'error' : 'warn';
      log[level]('api.error', {
        requestId,
        method: request.method,
        path: url.pathname,
        code: appError.code,
        status: appError.status,
        cause: appError.cause instanceof Error ? appError.cause : appError.cause !== undefined ? String(appError.cause) : undefined
      });
      return withHeaders(errorResponse(appError, requestId), requestId);
    } finally {
      log.info('api.request', { requestId, method: request.method, path: url.pathname, status, durationMs: Date.now() - started });
    }
  };
}

/** Resposta 405 para métodos não suportados por uma Function. */
export function methodNotAllowed(allowed: HttpMethod[]): (request: Request) => Promise<Response> {
  return route(async () => {
    throw new AppError('METHOD_NOT_ALLOWED', 405, `Método não permitido. Use: ${allowed.join(', ')}.`);
  });
}
