/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Report Service - Executive Strategic Reports & Structured CSV / PDF Export
 * 
 * Strict rule: All text and KPIs derive strictly from the given client's real data.
 * Zero hardcoded names or medical assumptions.
 */

import { Client, Report, Content, AccountSnapshot } from '../types';
import { storageService } from './storageService';
import { analyticsService } from './analyticsService';
import { aiService } from './aiService';

export const reportService = {
  /**
   * Generate an executive performance report based purely on client metrics
   */
  async generateReport(client: Client, periodDays: 7 | 14 | 30 | 90 = 30): Promise<Report> {
    const snapshots = storageService.history.getByClient(client.id);
    const contents = storageService.contents.getByClient(client.id);
    const period = analyticsService.calculatePeriod(snapshots, periodDays);

    const ranked = analyticsService.rankContents(contents, 'score', false);
    const topContents = ranked.slice(0, 3);
    const worstContents = ranked.slice(-2);

    const periodLabel = `${period.startDate} até ${period.endDate} (${periodDays} dias)`;

    // Construct honest executive summary
    const curFollowers = period.followersGrowth.current.toLocaleString('pt-BR');
    const followersDiff = period.followersGrowth.percentDiff !== null
      ? `${period.followersGrowth.percentDiff >= 0 ? '+' : ''}${period.followersGrowth.percentDiff}%`
      : 'sem base comparativa anterior';

    const totalViews = period.totalViews.current.toLocaleString('pt-BR');
    const viewsDiff = period.totalViews.percentDiff !== null
      ? `${period.totalViews.percentDiff >= 0 ? '+' : ''}${period.totalViews.percentDiff}%`
      : 'sem base anterior';

    const executiveSummary = snapshots.length === 0
      ? `Relatório inicial para o cliente ${client.name} (${client.instagram}) no segmento ${client.segment}. Dados históricos ainda em coleta para comparação de períodos.`
      : `No período analisado de ${periodDays} dias (${periodLabel}), a conta ${client.instagram} atingiu ${curFollowers} seguidores (${followersDiff}). O volume total de visualizações somou ${totalViews} (${viewsDiff}), com ${contents.length} publicações catalogadas no workspace.`;

    const analysisText = contents.length === 0
      ? 'Ainda não existem conteúdos catalogados para avaliar distribuição por pilares e retenção.'
      : `O catálogo de publicações ativas no segmento de ${client.segment} destaca os formatos ${client.formats.join(', ')} nos pilares ${client.pillars.join(', ')}. Os conteúdos com maior índice de salvamentos e compartilhamentos demonstram maior valor percebido pela persona (${client.persona || 'Geral'}).`;

    const reportData: Omit<Report, 'id' | 'generatedAt'> = {
      clientId: client.id,
      clientName: client.name,
      clientInstagram: client.instagram,
      title: `Relatório de Inteligência Estratégica - ${client.name}`,
      periodLabel,
      startDate: period.startDate,
      endDate: period.endDate,
      executiveSummary,
      kpis: {
        followers: period.followersGrowth.current,
        followersDiffPct: period.followersGrowth.percentDiff,
        views: period.totalViews.current,
        viewsDiffPct: period.totalViews.percentDiff,
        reach: period.totalReach.current,
        reachDiffPct: period.totalReach.percentDiff,
        engagementRate: period.avgEngagementRate.current,
        engagementDiffPct: period.avgEngagementRate.percentDiff,
        postsCount: period.postsPublished.current
      },
      topContents,
      worstContents,
      analysisText,
      aiInsights: [
        `Público-alvo principal: ${client.targetAudience || 'Segmento ' + client.segment}.`,
        topContents.length > 0 
          ? `Publicação de maior tração: "${topContents[0].title}" no formato ${topContents[0].format}.`
          : 'Recomenda-se catalogar as primeiras publicações para análise de retenção.',
        `Foco estratégico configurado em ${client.objectives.join(', ') || 'Autoridade'}.`
      ],
      opportunities: [
        `Intensificar produções no formato prioritário (${client.formats[0] || 'Reels'}).`,
        `Explorar as dores identificadas na pesquisa de público do nicho de ${client.segment}.`,
        'Testar novos ganchos nas aberturas para retenção de 3 segundos.'
      ],
      recommendations: [
        `Manter consistência editorial nos pilares acordados: ${client.pillars.join(', ') || 'Pilares Estratégicos'}.`,
        'Garantir CTAs claros orientados ao objetivo da publicação.',
        'Acompanhar os relatórios de sincronização para detecção de variações de alcance.'
      ],
      nextSteps: aiService.generateNextActions(client, contents, snapshots)
    };

    return storageService.reports.create(reportData);
  },

  /**
   * Universal CSV Exporter with UTF-8 BOM, semicolon delimiter, and strict escaping
   */
  exportToCsv(filename: string, rows: Record<string, string | number | boolean | null | undefined>[]): void {
    if (!rows || rows.length === 0) {
      alert('Não há dados para exportar nesta tabela.');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(';'),
      ...rows.map(row =>
        headers.map(fieldName => {
          const val = row[fieldName];
          if (val === null || val === undefined) return '""';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(';')
      )
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportClientsCsv(): void {
    const clients = storageService.clients.getAll();
    const rows = clients.map(c => ({
      Nome: c.name,
      Empresa: c.company,
      Instagram: c.instagram,
      WhatsApp: c.whatsapp,
      Cidade: c.city,
      Segmento: c.segment,
      TicketMedio: c.averageTicket,
      Status: c.status,
      EtapaOnboarding: c.onboardingStep,
      CriadoEm: c.createdAt
    }));
    this.exportToCsv('clientes_gs_intelligence', rows);
  },

  exportHistoryCsv(clientId: string): void {
    const snapshots = storageService.history.getByClient(clientId);
    const rows = snapshots.map(s => ({
      Data: s.date,
      Seguidores: s.followers,
      Visualizacoes: s.views,
      Alcance: s.reach,
      Curtidas: s.likes,
      Comentarios: s.comments,
      Compartilhamentos: s.shares,
      Salvamentos: s.saves,
      VisitasAoPerfil: s.profileVisits,
      CliquesNoSite: s.websiteClicks,
      PublicacoesNoDia: s.postsPublished,
      TaxaEngajamento: `${s.engagementRate}%`,
      Fonte: s.source
    }));
    this.exportToCsv(`historico_metricas_${clientId}`, rows);
  },

  exportContentsCsv(clientId: string): void {
    const contents = storageService.contents.getByClient(clientId);
    const rows = contents.map(c => ({
      Titulo: c.title,
      Formato: c.format,
      Pilar: c.pillar,
      Objetivo: c.objective,
      PublicadoEm: c.publishedAt,
      Visualizacoes: c.metrics.views,
      Curtidas: c.metrics.likes,
      Comentarios: c.metrics.comments,
      Compartilhamentos: c.metrics.shares,
      Salvamentos: c.metrics.saves,
      Alcance: c.metrics.reach,
      Engajamento: `${c.metrics.engagementRate}%`,
      Gancho: c.hook,
      CTA: c.cta
    }));
    this.exportToCsv(`conteudos_${clientId}`, rows);
  },

  exportCompetitorsCsv(clientId: string): void {
    const comps = storageService.competitors.getByClient(clientId);
    const rows = comps.map(c => ({
      Nome: c.name,
      Instagram: c.instagram,
      Status: c.status,
      Seguidores: c.followers,
      FrequenciaSemanal: c.postingFrequencyWeekly,
      VisualizacoesMedias: c.avgViews,
      EngajamentoMedio: `${c.avgEngagementRate}%`,
      Formatos: c.topFormats.join(', '),
      Similaridade: `${c.similarityScore}%`,
      Criterios: (c.similarityCriteria || []).join(' | ')
    }));
    this.exportToCsv(`concorrentes_${clientId}`, rows);
  },

  exportAudienceCsv(clientId: string): void {
    const aud = storageService.audience.getByClient(clientId);
    const rows = aud.map(a => ({
      Categoria: a.category,
      Titulo: a.title,
      Descricao: a.description,
      Fonte: a.source,
      UrlFonte: a.sourceUrl || '',
      Interpretacao: a.interpretation,
      E_Hipotese: a.isHypothesis ? 'Sim' : 'Nao',
      Confianca: a.confidence
    }));
    this.exportToCsv(`pesquisa_publico_${clientId}`, rows);
  },

  exportIdeasCsv(clientId: string): void {
    const ideas = storageService.ideas.getByClient(clientId);
    const rows = ideas.map(i => ({
      Titulo: i.title,
      Status: i.status,
      Pilar: i.pillar,
      Objetivo: i.objective,
      Formato: i.format,
      Potencial: i.potential,
      Gancho: i.hook,
      CategoriaGancho: i.hookCategory,
      CTA: i.cta,
      PorQueFazer: i.whyDoThis,
      DiaSugerido: i.calendarDay || ''
    }));
    this.exportToCsv(`banco_ideias_${clientId}`, rows);
  },

  exportCalendarCsv(clientId: string): void {
    const calendar = storageService.calendar.getByClient(clientId);
    const rows = calendar.map(c => ({
      DiaDaSemana: c.dayOfWeek,
      Horario: c.timeSlot || '',
      Titulo: c.title,
      Formato: c.format,
      Pilar: c.pillar,
      Objetivo: c.objective || '',
      Status: c.status || 'PLANEJADO'
    }));
    this.exportToCsv(`calendario_editorial_${clientId}`, rows);
  },

  exportAlertsCsv(clientId?: string): void {
    const alerts = clientId ? storageService.alerts.getByClient(clientId) : storageService.alerts.getAll();
    const rows = alerts.map(a => ({
      Tipo: a.type,
      Severidade: a.severity,
      Status: a.status,
      Titulo: a.title,
      Mensagem: a.message,
      Evidencia: a.evidence || '',
      DataCriacao: a.createdAt
    }));
    this.exportToCsv(`alertas_${clientId || 'agencia'}`, rows);
  },

  triggerPdfPrint(): void {
    window.print();
  }
};
