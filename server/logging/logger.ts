/**
 * Logger estruturado (JSON por linha) com redação de dados sensíveis.
 * Nunca registra tokens, secrets, senhas ou connection strings.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEY = /(token|secret|password|passwd|authorization|cookie|api[_-]?key|database_url|connection|code_verifier|client_secret)/i;
const SECRET_PATTERNS: RegExp[] = [
  /postgres(?:ql)?:\/\/[^\s"']+/gi,
  /access_token=[^&\s"']+/gi,
  /client_secret=[^&\s"']+/gi,
  /fb_exchange_token=[^&\s"']+/gi,
  /appsecret_proof=[^&\s"']+/gi,
  /\bEA[A-Za-z0-9]{20,}\b/g, // tokens Meta
  /\bAIza[0-9A-Za-z_-]{20,}\b/g, // chaves Google (formato antigo)
  /\bAQ\.[0-9A-Za-z_.-]{20,}/g // chaves Google (formato novo)
];

export function redactString(value: string): string {
  let out = value;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, (match) => {
      const eq = match.indexOf('=');
      return eq > 0 ? `${match.slice(0, eq + 1)}[REDACTED]` : '[REDACTED]';
    });
  }
  return out;
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[TRUNCATED]';
  if (typeof value === 'string') return redactString(value);
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(val, depth + 1);
    }
    return out;
  }
  return value;
}

function emit(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  if (process.env.VITEST && process.env.LOG_IN_TESTS !== 'true') return;
  const line = JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...(redact(fields) as Record<string, unknown>)
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (event: string, fields?: Record<string, unknown>) => emit('debug', event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit('info', event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit('warn', event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit('error', event, fields)
};
