/**
 * Fluxo OAuth do Instagram (Facebook Login for Business).
 * start:    valida cliente da agência -> cria state seguro -> URL de autorização Meta.
 * callback: valida/consome state -> troca code no backend -> busca conta IG ->
 *           persiste InstagramConnection com token criptografado -> redireciona sem token.
 */

import { getMetaConfig, getAppOrigin, type MetaConfig } from '../config/env.js';
import { Errors } from '../http/errors.js';
import { log } from '../logging/logger.js';
import { MetaApiError, MetaInstagramProvider } from '../providers/InstagramProvider.js';
import { clientRepository } from '../repositories/clientRepository.js';
import { instagramConnectionRepository } from '../repositories/instagramConnectionRepository.js';
import { oauthStateRepository } from '../repositories/oauthStateRepository.js';
import type { SessionUser } from '../repositories/userRepository.js';

export function requireMetaConfig(): MetaConfig {
  const config = getMetaConfig();
  if (!config) throw Errors.metaNotConfigured();
  return config;
}

export function createProvider(config: MetaConfig = requireMetaConfig()): MetaInstagramProvider {
  return new MetaInstagramProvider(config);
}

export async function startInstagramOAuth(
  user: SessionUser,
  clientId: string,
  requestId: string,
  provider?: MetaInstagramProvider
): Promise<{ authorizationUrl: string; expiresAt: string }> {
  const config = requireMetaConfig();
  await clientRepository.requireForAgency(user.agencyId, clientId);
  const { state, stateId, expiresAt } = await oauthStateRepository.create({ agencyId: user.agencyId, userId: user.id, clientId });
  const authorizationUrl = (provider ?? createProvider(config)).buildAuthorizationUrl(state);
  log.info('oauth.instagram.start', { requestId, stateId, clientId, agencyId: user.agencyId, userId: user.id });
  return { authorizationUrl, expiresAt: expiresAt.toISOString() };
}

export type CallbackOutcome =
  | { ok: true; clientId: string; username: string | null }
  | { ok: false; reason: string; clientId?: string };

export interface CallbackInput {
  code: string | null;
  state: string | null;
  error: string | null;
  sessionAgencyId: string | null;
}

export async function handleInstagramCallback(input: CallbackInput, requestId: string, provider?: MetaInstagramProvider): Promise<CallbackOutcome> {
  const config = getMetaConfig();
  if (!config) return { ok: false, reason: 'META_NOT_CONFIGURED' };

  // Mesmo quando o usuário nega a permissão, o state é consumido para não ser reaproveitado.
  const validation = await oauthStateRepository.consume(input.state);
  if (!validation.valid) {
    log.warn('oauth.instagram.callback.invalid_state', { requestId, reason: validation.error });
    return { ok: false, reason: validation.error };
  }
  const { state } = validation;

  if (input.sessionAgencyId && input.sessionAgencyId !== state.agencyId) {
    log.warn('oauth.instagram.callback.agency_mismatch', { requestId, stateId: state.stateId });
    return { ok: false, reason: 'STATE_AGENCY_MISMATCH' };
  }

  if (input.error) {
    log.warn('oauth.instagram.callback.denied', { requestId, stateId: state.stateId, error: input.error.slice(0, 100) });
    return { ok: false, reason: 'ACCESS_DENIED', clientId: state.clientId };
  }
  if (!input.code) {
    return { ok: false, reason: 'CODE_MISSING', clientId: state.clientId };
  }

  const client = await clientRepository.findForAgency(state.agencyId, state.clientId);
  if (!client) return { ok: false, reason: 'CLIENT_NOT_FOUND' };

  const meta = provider ?? createProvider(config);
  try {
    const token = await meta.exchangeCode(input.code);
    const account = await meta.getBusinessAccount(token.accessToken);
    if (!account) {
      log.warn('oauth.instagram.callback.no_business_account', { requestId, clientId: state.clientId });
      return { ok: false, reason: 'NO_BUSINESS_ACCOUNT', clientId: state.clientId };
    }
    const scopes = await meta.getGrantedScopes(token.accessToken).catch(() => [] as string[]);
    const connection = await instagramConnectionRepository.upsert({
      agencyId: state.agencyId,
      clientId: state.clientId,
      instagramAccountId: account.profile.id,
      facebookPageId: account.pageId,
      username: account.profile.username ?? null,
      accessToken: token.accessToken,
      tokenExpiresAt: token.expiresAt,
      scopes
    });
    log.info('oauth.instagram.callback.connected', {
      requestId,
      clientId: state.clientId,
      connectionId: connection.id,
      instagramAccountId: connection.instagramAccountId,
      scopes
    });
    return { ok: true, clientId: state.clientId, username: connection.username };
  } catch (err) {
    log.error('oauth.instagram.callback.failed', {
      requestId,
      clientId: state.clientId,
      metaCode: err instanceof MetaApiError ? err.metaCode : undefined,
      cause: err instanceof Error ? err : String(err)
    });
    return { ok: false, reason: 'TOKEN_EXCHANGE_FAILED', clientId: state.clientId };
  }
}

/** URL de retorno ao frontend — somente status, nunca tokens. */
export function buildFrontendRedirect(outcome: CallbackOutcome, requestUrl: string): string {
  const origin = getAppOrigin(requestUrl);
  const params = new URLSearchParams();
  if (outcome.ok) {
    params.set('instagram', 'connected');
    params.set('clientId', outcome.clientId);
  } else {
    params.set('instagram', 'error');
    params.set('reason', outcome.reason);
    if (outcome.clientId) params.set('clientId', outcome.clientId);
  }
  return `${origin}/?${params.toString()}`;
}
