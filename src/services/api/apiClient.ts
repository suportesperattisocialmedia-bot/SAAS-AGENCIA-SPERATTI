/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Cliente HTTP do frontend. Sempre usa a MESMA ORIGEM (/api/...), nunca URLs fixas.
 * Entende o envelope da API: { ok: true, data } | { ok: false, error: { code, message, requestId } }.
 * Cookies de sessão são HttpOnly: o JavaScript nunca vê tokens.
 */

import { logger } from '../../utils/logger';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;

  constructor(message: string, status: number, code = 'UNKNOWN', requestId: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

interface RequestOptions {
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; requestId?: string } };

const DEFAULT_TIMEOUT_MS = 20000;

function isEnvelope<T>(value: unknown): value is Envelope<T> {
  return typeof value === 'object' && value !== null && 'ok' in value;
}

async function executeRequest<T>(path: string, method: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  if (!path.startsWith('/api/')) throw new Error('apiClient aceita apenas rotas relativas /api/*');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  // Somente GETs idempotentes são repetidos automaticamente.
  const maxRetries = method === 'GET' ? options.retries ?? 1 : 0;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    options.signal?.addEventListener('abort', () => controller.abort(), { once: true });
    try {
      const response = await fetch(path, {
        method,
        credentials: 'same-origin',
        headers: body !== undefined ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      let payload: unknown = null;
      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      if (isJson) {
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
      }

      if (!response.ok || (isEnvelope<T>(payload) && payload.ok === false)) {
        const err = isEnvelope<T>(payload) && payload.ok === false ? payload.error : null;
        throw new ApiError(
          err?.message || (response.status === 404 ? 'Serviço indisponível no momento.' : `Falha na requisição (${response.status}).`),
          response.status,
          err?.code || 'HTTP_ERROR',
          err?.requestId || response.headers.get('x-request-id')
        );
      }

      if (isEnvelope<T>(payload) && payload.ok && 'data' in payload) return payload.data;
      return payload as T;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiError && err.status < 500) throw err;
      if (attempt < maxRetries) {
        logger.warn(`Nova tentativa de ${method} ${path} (${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  if (lastError instanceof ApiError) throw lastError;
  if (lastError instanceof DOMException && lastError.name === 'AbortError') {
    throw new ApiError('Tempo limite excedido ao contatar o servidor.', 0, 'TIMEOUT');
  }
  throw new ApiError('Não foi possível contatar o servidor. Verifique sua conexão.', 0, 'NETWORK_ERROR');
}

export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return executeRequest<T>(path, 'GET', undefined, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return executeRequest<T>(path, 'POST', body ?? {}, options);
  },
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return executeRequest<T>(path, 'DELETE', undefined, options);
  }
};

export function describeApiError(err: unknown, fallback = 'Erro inesperado.'): string {
  if (err instanceof ApiError) return err.requestId ? `${err.message} (ref. ${err.requestId.slice(0, 8)})` : err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
