/**
 * Structured Logger for Gabriel Speratti | Social Intelligence
 * Prevents sensitive tokens/secrets and noisy unformatted logs in production
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Redact sensitive credentials and tokens
    if (
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('key') ||
      key.toLowerCase().includes('password')
    ) {
      safe[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      safe[key] = sanitize(value);
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

function formatLog(payload: LogPayload): void {
  const prefix = `[GS-Intel] [${payload.timestamp}] [${payload.level.toUpperCase()}]`;
  const contextStr = payload.context ? `\n  Context: ${JSON.stringify(sanitize(payload.context))}` : '';

  if (payload.level === 'error') {
    console.error(`${prefix} ${payload.message}${contextStr}`);
  } else if (payload.level === 'warn') {
    console.warn(`${prefix} ${payload.message}${contextStr}`);
  } else {
    console.info(`${prefix} ${payload.message}${contextStr}`);
  }
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    formatLog({ level: 'info', message, context, timestamp: new Date().toISOString() });
  },
  warn(message: string, context?: Record<string, unknown>): void {
    formatLog({ level: 'warn', message, context, timestamp: new Date().toISOString() });
  },
  error(message: string, context?: Record<string, unknown>): void {
    formatLog({ level: 'error', message, context, timestamp: new Date().toISOString() });
  }
};
