/**
 * Sessão do usuário e estado do backend (status das integrações).
 */

import { apiClient } from './api/apiClient';
import type { Client } from '../types';

export interface SessionUser {
  id: string;
  agencyId: string;
  agencyName: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
}

export interface BackendStatus {
  ok: boolean;
  service: string;
  environment: string;
  version: string;
  timestamp: string;
  integrations: {
    database: { configured: boolean; reachable: boolean | null; migrated: boolean | null };
    session: { configured: boolean };
    instagram: { configured: boolean };
    gemini: { configured: boolean; model: string | null };
    research: { configured: boolean };
  };
}

export const sessionService = {
  async getStatus(): Promise<BackendStatus | null> {
    try {
      return await apiClient.get<BackendStatus>('/api/status');
    } catch {
      return null;
    }
  },

  async getSession(): Promise<{ authenticated: boolean; user: SessionUser | null; configured: boolean }> {
    return apiClient.get('/api/session');
  },

  async login(email: string, password: string): Promise<SessionUser> {
    const res = await apiClient.post<{ user: SessionUser }>('/api/session', { email, password });
    return res.user;
  },

  async logout(): Promise<void> {
    await apiClient.delete('/api/session');
  },

  /** Registra/atualiza o cliente no servidor (necessário para OAuth, sync e IA). */
  async registerClient(client: Client): Promise<void> {
    await apiClient.post('/api/clients', {
      id: client.id,
      status: client.status,
      profile: clientProfile(client)
    });
  },

  async listClients(): Promise<Array<{ id: string; name: string; instagramHandle: string; segment: string; profile: Record<string, unknown> }>> {
    const res = await apiClient.get<{ clients: Array<{ id: string; name: string; instagramHandle: string; segment: string; profile: Record<string, unknown> }> }>('/api/clients');
    return res.clients;
  },

  async removeClient(clientId: string): Promise<void> {
    await apiClient.delete(`/api/clients?clientId=${encodeURIComponent(clientId)}`);
  }
};

export function clientProfile(client: Client) {
  return {
    name: client.name,
    company: client.company,
    instagram: client.instagram,
    segment: client.segment,
    subsegment: client.subsegment,
    targetAudience: client.targetAudience,
    persona: client.persona,
    averageTicket: client.averageTicket,
    pillars: client.pillars,
    objectives: client.objectives,
    formats: client.formats,
    toneOfVoice: client.toneOfVoice,
    differentiators: client.differentiators
  };
}
