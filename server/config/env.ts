/**
 * Configuração do backend lida exclusivamente de process.env (nunca exposta ao frontend).
 * A leitura é feita sob demanda para que cada Function valide apenas o que precisa.
 */

export const SERVICE_NAME = 'social-intelligence-api';
export const API_VERSION = '4.0.0';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_META_GRAPH_VERSION = 'v23.0';

function read(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function getEnvironment(): 'production' | 'preview' | 'development' | 'test' {
  if (process.env.VITEST) return 'test';
  const vercelEnv = read('VERCEL_ENV');
  if (vercelEnv === 'production' || vercelEnv === 'preview' || vercelEnv === 'development') {
    return vercelEnv;
  }
  return read('NODE_ENV') === 'production' ? 'production' : 'development';
}

export function isProductionLike(): boolean {
  const env = getEnvironment();
  return env === 'production' || env === 'preview';
}

export function getVersion(): string {
  const sha = read('VERCEL_GIT_COMMIT_SHA');
  return sha ? `${API_VERSION}+${sha.slice(0, 7)}` : API_VERSION;
}

export interface MetaConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  graphVersion: string;
}

export function getMetaConfig(): MetaConfig | null {
  const appId = read('META_APP_ID');
  const appSecret = read('META_APP_SECRET');
  const redirectUri = read('META_REDIRECT_URI');
  if (!appId || !appSecret || !redirectUri) return null;
  return {
    appId,
    appSecret,
    redirectUri,
    graphVersion: read('META_GRAPH_VERSION') || DEFAULT_META_GRAPH_VERSION
  };
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export function getGeminiConfig(): GeminiConfig | null {
  const apiKey = read('GEMINI_API_KEY');
  if (!apiKey) return null;
  return { apiKey, model: read('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL };
}

export function getDatabaseUrl(): string | null {
  return read('DATABASE_URL') || null;
}

/** SESSION_SECRET assina cookies de sessão e deriva a chave de criptografia de tokens. */
export function getSessionSecret(): string | null {
  const secret = read('SESSION_SECRET');
  return secret.length >= 32 ? secret : null;
}

/** Chave opcional dedicada para criptografia de tokens; se ausente, deriva de SESSION_SECRET. */
export function getTokenEncryptionSecret(): string | null {
  return read('TOKEN_ENCRYPTION_KEY') || getSessionSecret();
}

export interface BootstrapAdmin {
  email: string;
  password: string;
  name: string;
  agencyName: string;
}

/** Credenciais opcionais para criar o primeiro usuário quando o banco ainda não possui nenhum. */
export function getBootstrapAdmin(): BootstrapAdmin | null {
  const email = read('ADMIN_EMAIL').toLowerCase();
  const password = read('ADMIN_PASSWORD');
  if (!email || password.length < 10) return null;
  return {
    email,
    password,
    name: read('ADMIN_NAME') || 'Administrador',
    agencyName: read('AGENCY_NAME') || 'Gabriel Speratti | Social Intelligence'
  };
}

/** Origem pública da aplicação, derivada de META_REDIRECT_URI ou APP_URL. */
export function getAppOrigin(requestUrl?: string): string {
  const explicit = read('APP_URL');
  if (explicit) return new URL(explicit).origin;
  const meta = read('META_REDIRECT_URI');
  if (meta) return new URL(meta).origin;
  if (requestUrl) return new URL(requestUrl).origin;
  return '';
}

export function isResearchConfigured(): boolean {
  return Boolean(read('SERPAPI_KEY') || read('GOOGLE_SEARCH_API_KEY'));
}
