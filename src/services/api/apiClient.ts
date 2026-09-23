/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Robust API Client with Timeout, Retries, Structured ApiError
 */

import { logger } from '../../utils/logger';

export class ApiError extends Error {
  public status: number;
  public data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 1;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

async function executeRequest<T>(
  url: string,
  method: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.retries ?? DEFAULT_RETRIES;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      const init: RequestInit = {
        method,
        headers
      };

      if (body !== undefined && method !== 'GET') {
        init.body = JSON.stringify(body);
      }

      const response = await fetchWithTimeout(url, init, timeoutMs);

      if (!response.ok) {
        let errorData: unknown;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }

        const message = 
          typeof errorData === 'object' && errorData !== null && 'error' in errorData
            ? String((errorData as { error: unknown }).error)
            : `API request failed with status ${response.status}`;

        throw new ApiError(message, response.status, errorData);
      }

      const data = (await response.json()) as T;
      return data;
    } catch (err: unknown) {
      lastError = err;
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        // Do not retry 4xx client errors
        throw err;
      }
      if (attempt < maxRetries) {
        logger.warn(`Retrying request to ${url} (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export const apiClient = {
  get<T>(url: string, options?: RequestOptions): Promise<T> {
    return executeRequest<T>(url, 'GET', undefined, options);
  },

  post<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return executeRequest<T>(url, 'POST', body, options);
  },

  put<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return executeRequest<T>(url, 'PUT', body, options);
  },

  delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return executeRequest<T>(url, 'DELETE', undefined, options);
  }
};
