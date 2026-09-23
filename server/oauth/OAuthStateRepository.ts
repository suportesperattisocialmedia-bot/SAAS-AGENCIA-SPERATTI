/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Secure OAuth State Management
 * Prevents CSRF attacks during Meta OAuth. Never uses state = clientId.
 */

import crypto from 'crypto';

export interface OAuthStateRecord {
  id: string;
  state: string;
  clientId: string;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}

export class OAuthStateRepository {
  private states = new Map<string, OAuthStateRecord>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Generates a cryptographically strong state token and stores it
   */
  createState(clientId: string): string {
    const id = crypto.randomUUID();
    const state = crypto.randomBytes(32).toString('hex');
    const now = Date.now();

    const record: OAuthStateRecord = {
      id,
      state,
      clientId,
      createdAt: now,
      expiresAt: now + this.TTL_MS,
      consumed: false
    };

    this.states.set(state, record);
    this.cleanExpired();
    return state;
  }

  /**
   * Validates state and marks it as consumed in one atomic check
   */
  validateAndConsume(stateStr: string): { valid: boolean; clientId?: string; error?: string } {
    if (!stateStr) {
      return { valid: false, error: 'State ausente' };
    }

    const record = this.states.get(stateStr);
    if (!record) {
      return { valid: false, error: 'State inexistente ou inválido' };
    }

    if (record.consumed) {
      return { valid: false, error: 'State já utilizado anteriormente' };
    }

    if (Date.now() > record.expiresAt) {
      this.states.delete(stateStr);
      return { valid: false, error: 'State expirado (tempo limite excedido)' };
    }

    // Invalidate state immediately to prevent replay attacks
    record.consumed = true;
    this.states.delete(stateStr);

    return {
      valid: true,
      clientId: record.clientId
    };
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.states.entries()) {
      if (now > item.expiresAt || item.consumed) {
        this.states.delete(key);
      }
    }
  }
}

export const oAuthStateRepository = new OAuthStateRepository();
