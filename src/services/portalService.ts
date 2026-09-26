/**
 * Links de aprovação do cliente (agência) e portal público (cliente, sem login).
 */

import { apiClient } from './api/apiClient';

export interface ApprovalLink {
  id: string;
  clientId: string;
  clientName: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  lastOpenedAt: string | null;
}

export interface PortalTask {
  id: string;
  title: string;
  type: string;
  status: 'review' | 'decided';
  dueDate: string | null;
  clientCopy: string | null;
  previewUrl: string | null;
  lastDecision: { at: string; decision: 'approved' | 'changes'; comment: string | null } | null;
}

export interface PortalView {
  clientName: string;
  agencyName: string;
  expiresAt: string;
  tasks: PortalTask[];
}

export const portalUrl = (token: string) => `${window.location.origin}/aprovar/${token}`;

export const portalService = {
  async listLinks(clientId: string): Promise<ApprovalLink[]> {
    return (await apiClient.get<{ links: ApprovalLink[] }>(`/api/portal?clientId=${encodeURIComponent(clientId)}`)).links;
  },
  async createLink(clientId: string, clientName: string, days = 30): Promise<ApprovalLink> {
    return (await apiClient.post<{ link: ApprovalLink }>('/api/portal?action=create', { clientId, clientName, days })).link;
  },
  async revokeLink(id: string): Promise<void> {
    await apiClient.post('/api/portal?action=revoke', { id });
  },
  async view(token: string): Promise<PortalView> {
    return apiClient.get<PortalView>(`/api/portal?token=${encodeURIComponent(token)}`);
  },
  async decide(token: string, taskId: string, decision: 'approved' | 'changes', comment?: string): Promise<PortalTask> {
    return (await apiClient.post<{ task: PortalTask }>('/api/portal?action=decide', { token, taskId, decision, comment })).task;
  }
};
