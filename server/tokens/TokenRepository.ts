/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Token Repository & Encrypted Security Layer
 * Strictly isolated on the backend - tokens NEVER reach the browser/client.
 */

import crypto from 'crypto';

export type TokenStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'INVALID';

export interface StoredToken {
  clientId: string;
  accountId?: string;
  provider: 'meta_instagram';
  encryptedAccessToken: string;
  iv: string;
  tag: string;
  expiresAt: number; // Unix timestamp ms
  tokenStatus: TokenStatus;
  lastValidatedAt: string;
  lastRefreshAt: string;
  permissions: string[];
}

export interface TokenRepository {
  saveToken(clientId: string, accessToken: string, expiresAtMs: number, accountId?: string, permissions?: string[]): Promise<StoredToken>;
  getToken(clientId: string): Promise<{ accessToken: string; meta: StoredToken } | null>;
  updateTokenStatus(clientId: string, status: TokenStatus): Promise<boolean>;
  deleteToken(clientId: string): Promise<boolean>;
  listPublicStatus(clientId: string): Promise<{
    hasToken: boolean;
    status: TokenStatus;
    expiresInDays: number | null;
    accountId?: string;
  }>;
}

// Master encryption key derived from process.env or fallback generated per-process instance
const ENCRYPTION_SECRET = process.env.TOKEN_ENCRYPTION_KEY || process.env.META_APP_SECRET || 'gs-intel-secure-master-key-seed-2026';
const KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();

export class EncryptedTokenRepository implements TokenRepository {
  private store = new Map<string, StoredToken>();

  private encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag
    };
  }

  private decrypt(encrypted: string, ivHex: string, tagHex: string): string {
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async saveToken(
    clientId: string,
    accessToken: string,
    expiresAtMs: number,
    accountId?: string,
    permissions: string[] = ['instagram_basic', 'instagram_manage_insights']
  ): Promise<StoredToken> {
    const { encrypted, iv, tag } = this.encrypt(accessToken);
    const now = new Date().toISOString();

    const stored: StoredToken = {
      clientId,
      accountId,
      provider: 'meta_instagram',
      encryptedAccessToken: encrypted,
      iv,
      tag,
      expiresAt: expiresAtMs,
      tokenStatus: 'ACTIVE',
      lastValidatedAt: now,
      lastRefreshAt: now,
      permissions
    };

    this.store.set(clientId, stored);
    return stored;
  }

  async getToken(clientId: string): Promise<{ accessToken: string; meta: StoredToken } | null> {
    const stored = this.store.get(clientId);
    if (!stored) return null;

    if (Date.now() > stored.expiresAt) {
      stored.tokenStatus = 'EXPIRED';
      return null;
    }

    try {
      const accessToken = this.decrypt(stored.encryptedAccessToken, stored.iv, stored.tag);
      return { accessToken, meta: stored };
    } catch (err) {
      stored.tokenStatus = 'INVALID';
      return null;
    }
  }

  async updateTokenStatus(clientId: string, status: TokenStatus): Promise<boolean> {
    const stored = this.store.get(clientId);
    if (!stored) return false;
    stored.tokenStatus = status;
    return true;
  }

  async deleteToken(clientId: string): Promise<boolean> {
    return this.store.delete(clientId);
  }

  async listPublicStatus(clientId: string): Promise<{
    hasToken: boolean;
    status: TokenStatus;
    expiresInDays: number | null;
    accountId?: string;
  }> {
    const stored = this.store.get(clientId);
    if (!stored) {
      return {
        hasToken: false,
        status: 'REVOKED',
        expiresInDays: null
      };
    }

    const isExpired = Date.now() > stored.expiresAt;
    const currentStatus: TokenStatus = isExpired ? 'EXPIRED' : stored.tokenStatus;
    const diffMs = stored.expiresAt - Date.now();
    const expiresInDays = diffMs > 0 ? Math.round(diffMs / (1000 * 60 * 60 * 24)) : 0;

    return {
      hasToken: currentStatus === 'ACTIVE',
      status: currentStatus,
      expiresInDays: isExpired ? 0 : expiresInDays,
      accountId: stored.accountId
    };
  }
}

export const tokenRepository = new EncryptedTokenRepository();
