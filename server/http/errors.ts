/**
 * Erros de aplicação com código estável e mensagem segura para o usuário.
 * Detalhes internos ficam em `cause` e só vão para o log (redigido).
 */

export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'METHOD_NOT_ALLOWED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'DATABASE_NOT_CONFIGURED'
  | 'DATABASE_ERROR'
  | 'SESSION_NOT_CONFIGURED'
  | 'META_NOT_CONFIGURED'
  | 'INSTAGRAM_OAUTH_ERROR'
  | 'INSTAGRAM_NOT_CONNECTED'
  | 'INSTAGRAM_REAUTH_REQUIRED'
  | 'SYNC_IN_PROGRESS'
  | 'META_API_ERROR'
  | 'GEMINI_NOT_CONFIGURED'
  | 'AI_EXECUTION_ERROR'
  | 'AI_RESPONSE_VALIDATION_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, status: number, publicMessage: string, options: { cause?: unknown; details?: unknown } = {}) {
    super(publicMessage, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = options.details;
  }
}

export const Errors = {
  invalid: (message = 'Requisição inválida.', details?: unknown) => new AppError('INVALID_REQUEST', 400, message, { details }),
  unauthenticated: () => new AppError('UNAUTHENTICATED', 401, 'Sessão ausente ou expirada. Faça login novamente.'),
  forbidden: () => new AppError('FORBIDDEN', 403, 'Você não tem permissão para acessar este recurso.'),
  notFound: (what = 'Recurso') => new AppError('NOT_FOUND', 404, `${what} não encontrado.`),
  databaseNotConfigured: () =>
    new AppError('DATABASE_NOT_CONFIGURED', 503, 'Banco de dados não configurado no servidor (DATABASE_URL).'),
  sessionNotConfigured: () =>
    new AppError('SESSION_NOT_CONFIGURED', 503, 'SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres).'),
  metaNotConfigured: () =>
    new AppError('META_NOT_CONFIGURED', 503, 'Instagram API não configurada (META_APP_ID, META_APP_SECRET, META_REDIRECT_URI).'),
  geminiNotConfigured: () =>
    new AppError('GEMINI_NOT_CONFIGURED', 503, 'IA não configurada no servidor (GEMINI_API_KEY).'),
  rateLimited: () => new AppError('RATE_LIMITED', 429, 'Muitas requisições. Aguarde alguns instantes e tente novamente.')
};
