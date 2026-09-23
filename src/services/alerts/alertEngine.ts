/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Alert Engine - Deterministic rules evaluation and alert generation
 */

import { Alert, AlertType, AlertSeverity, AlertStatus, Client, AccountSnapshot, Content, InstagramAccount } from '../../types';
import { defaultStorageAdapter } from '../storage/LocalStorageAdapter';
import { analyticsService } from '../analyticsService';
import { logger } from '../../utils/logger';

const ALERTS_STORAGE_KEY = 'gs_intel_alerts';

export const alertEngine = {
  getAll(): Alert[] {
    return defaultStorageAdapter.getCollection<Alert>(ALERTS_STORAGE_KEY);
  },

  getByClient(clientId: string): Alert[] {
    return this.getAll().filter(a => a.clientId === clientId);
  },

  createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'status'>): Alert {
    const newItem: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      status: 'NEW',
      createdAt: new Date().toISOString()
    };

    const all = this.getAll();
    defaultStorageAdapter.setCollection(ALERTS_STORAGE_KEY, [newItem, ...all]);
    logger.info(`Alert generated: ${alert.title}`, { type: alert.type, severity: alert.severity });
    return newItem;
  },

  updateStatus(id: string, status: AlertStatus): void {
    const all = this.getAll();
    const index = all.findIndex(a => a.id === id);
    if (index !== -1) {
      all[index].status = status;
      defaultStorageAdapter.setCollection(ALERTS_STORAGE_KEY, all);
    }
  },

  markAllRead(clientId?: string): void {
    const all = this.getAll();
    const updated = all.map(a => {
      if (!clientId || a.clientId === clientId) {
        return { ...a, status: 'READ' as AlertStatus };
      }
      return a;
    });
    defaultStorageAdapter.setCollection(ALERTS_STORAGE_KEY, updated);
  },

  clearResolved(clientId?: string): void {
    const all = this.getAll();
    const filtered = all.filter(a => {
      if (a.status === 'RESOLVED') {
        return clientId ? a.clientId !== clientId : false;
      }
      return true;
    });
    defaultStorageAdapter.setCollection(ALERTS_STORAGE_KEY, filtered);
  },

  /**
   * Evaluates rules against real client state and generates alerts without duplication
   */
  evaluateClientRules(
    client: Client,
    snapshots: AccountSnapshot[],
    contents: Content[],
    instagramAccount?: InstagramAccount
  ): Alert[] {
    const generated: Alert[] = [];
    const existing = this.getByClient(client.id);

    // Rule 1: Token or Sync Error
    if (instagramAccount) {
      if (instagramAccount.status === 'TOKEN_EXPIRED') {
        const title = 'Token de acesso Meta expirado';
        if (!existing.some(a => a.title === title && a.status !== 'RESOLVED')) {
          generated.push(
            this.createAlert({
              clientId: client.id,
              clientName: client.name,
              type: 'TOKEN_EXPIRADO',
              severity: 'critical',
              title,
              message: 'O token da Meta Graph API expirou. É necessário reconectar para retomar a coleta.',
              evidence: 'Status de autenticação retornado como TOKEN_EXPIRED pelo servidor.'
            })
          );
        }
      }

      if (instagramAccount.status === 'ERROR') {
        const title = 'Erro na sincronização de dados do Instagram';
        if (!existing.some(a => a.title === title && a.status !== 'RESOLVED')) {
          generated.push(
            this.createAlert({
              clientId: client.id,
              clientName: client.name,
              type: 'ERRO_SINCRONIZACAO',
              severity: 'high',
              title,
              message: instagramAccount.errorStatus || 'Falha ao consultar métricas da API.',
              evidence: 'Tentativa de sincronização retornou status de falha.'
            })
          );
        }
      }
    }

    // Rule 2: Period Comparisons (only if we have >= 14 days of snapshots)
    if (snapshots.length >= 14) {
      const summary = analyticsService.calculatePeriod(snapshots, 7);

      // Performance Drop
      if (summary.hasPreviousPeriod && summary.totalViews.percentDiff !== null && summary.totalViews.percentDiff < -25) {
        const title = `Queda de visualizações de ${summary.totalViews.percentDiff}% nos últimos 7 dias`;
        if (!existing.some(a => a.title === title && a.status !== 'RESOLVED')) {
          generated.push(
            this.createAlert({
              clientId: client.id,
              clientName: client.name,
              type: 'QUEDA DE PERFORMANCE',
              severity: 'high',
              title,
              message: `As visualizações caíram de ${summary.totalViews.previous?.toLocaleString('pt-BR')} para ${summary.totalViews.current.toLocaleString('pt-BR')}.`,
              calculatedMetricComparison: `${summary.totalViews.percentDiff}% em relação ao período anterior`,
              evidence: 'Cálculo determinístico com base nos snapshots diários da Meta API.'
            })
          );
        }
      }

      // Growth
      if (summary.hasPreviousPeriod && summary.followersGrowth.percentDiff !== null && summary.followersGrowth.percentDiff > 5) {
        const title = `Crescimento expressivo de seguidores (+${summary.followersGrowth.percentDiff}%)`;
        if (!existing.some(a => a.title === title && a.status !== 'RESOLVED')) {
          generated.push(
            this.createAlert({
              clientId: client.id,
              clientName: client.name,
              type: 'CRESCIMENTO',
              severity: 'medium',
              title,
              message: `Ganho líquido de ${summary.followersGrowth.absoluteDiff?.toLocaleString('pt-BR')} seguidores nos últimos 7 dias.`,
              calculatedMetricComparison: `+${summary.followersGrowth.percentDiff}% no período`,
              evidence: 'Cálculo determinístico com base na contagem de seguidores.'
            })
          );
        }
      }
    }

    // Rule 3: Content above average
    if (contents.length >= 4) {
      const totalSaves = contents.reduce((acc, c) => acc + c.metrics.saves, 0);
      const avgSaves = totalSaves / contents.length;

      contents.forEach(c => {
        if (c.metrics.saves > avgSaves * 2.5 && c.metrics.saves >= 50) {
          const title = `Conteúdo "${c.title}" superou média de salvamentos`;
          if (!existing.some(a => a.title === title && a.status !== 'RESOLVED')) {
            generated.push(
              this.createAlert({
                clientId: client.id,
                clientName: client.name,
                type: 'CONTEÚDO ACIMA DA MÉDIA',
                severity: 'medium',
                title,
                message: `O conteúdo obteve ${c.metrics.saves} salvamentos contra uma média de ${Math.round(avgSaves)} da conta.`,
                evidence: `${c.metrics.saves} salvamentos registrados no post.`
              })
            );
          }
        }
      });
    }

    return generated;
  }
};
