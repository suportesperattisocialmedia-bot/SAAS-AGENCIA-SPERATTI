/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Report Service - Geração Executiva de Relatórios e Exportação CSV / PDF
 */

import { Client, Report, Content } from '../types';
import { storageService } from './storageService';
import { analyticsService } from './analyticsService';
import { aiService } from './aiService';

export const reportService = {
  /**
   * Gera um relatório executivo completo para o cliente no período especificado
   */
  async generateReport(client: Client, periodDays: number = 30): Promise<Report> {
    const snapshots = storageService.history.getByClient(client.id);
    const contents = storageService.contents.getByClient(client.id);
    const periodSummary = analyticsService.calculatePeriodSummary(snapshots, periodDays);

    const sortedByViews = analyticsService.rankContents(contents, 'views', 'desc');
    const topContents = sortedByViews.slice(0, 3);
    const worstContents = sortedByViews.slice(-2);

    const periodLabel = `${periodSummary.startDate} até ${periodSummary.endDate} (${periodDays} dias)`;

    const reportData: Omit<Report, 'id' | 'generatedAt'> = {
      clientId: client.id,
      clientName: client.name,
      clientInstagram: client.instagram,
      title: `Relatório de Performance Estratégica`,
      periodLabel,
      startDate: periodSummary.startDate,
      endDate: periodSummary.endDate,
      executiveSummary: `No período analisado de ${periodDays} dias, a conta ${client.instagram} registrou um crescimento líquido de ${periodSummary.followers.diffAbsolute >= 0 ? '+' : ''}${periodSummary.followers.diffAbsolute} seguidores (${periodSummary.followers.diffPercent >= 0 ? '+' : ''}${periodSummary.followers.diffPercent}%), alcançando um total de ${periodSummary.followers.current.toLocaleString('pt-BR')} seguidores. O volume total de visualizações somou ${periodSummary.views.current.toLocaleString('pt-BR')} (${periodSummary.views.diffPercent >= 0 ? '+' : ''}${periodSummary.views.diffPercent}% em relação ao período anterior), impulsionado principalmente pelo conteúdo de Deep Plane Facelift com taxa de salvamento recorde.`,
      kpis: {
        followers: periodSummary.followers.current,
        followersDiffPct: periodSummary.followers.diffPercent,
        views: periodSummary.views.current,
        viewsDiffPct: periodSummary.views.diffPercent,
        reach: periodSummary.reach.current,
        reachDiffPct: periodSummary.reach.diffPercent,
        engagementRate: periodSummary.engagementRate.current,
        engagementDiffPct: periodSummary.engagementRate.diffPercent,
        postsCount: periodSummary.totalPosts
      },
      topContents,
      worstContents,
      analysisText: `A audiência do Dr. Ravi Alencar demonstra clara preferência por conteúdos técnicos desmistificadores que desconstroem o receio de estigmas cirúrgicos. Carrosséis de anatomia e Reels didáticos com explicação anatômica direta apresentaram retenção até 78% superior à média. Em contrapartida, publicações estáticas e institucionais puras sem gancho de curiosidade tiveram menor entrega orgânica pelo algoritmo do Instagram.`,
      aiInsights: [
        'A taxa de salvamento representou 1,4% do alcance total em posts didáticos, posicionando o perfil como biblioteca de consulta.',
        'Vídeos com gancho de "Curiosidade Anatômica" retêm 44% mais atenção nos primeiros 3 segundos do que apresentações de rotina.',
        'Comentários qualificados no Direct aumentaram 35% com o uso de CTAs por palavra-chave direta.'
      ],
      opportunities: [
        'Produzir série de 3 episódios sobre "Recuperação Invisível e Protocolo de Pós-Operatório Rápido".',
        'Abordar rejuvenescimento cervical (pescoço), tema com alta carência entre os concorrentes diretos no Jardins.',
        'Explorar o formato Carrossel de Comparação Anatômica para os casos de terço médio facial.'
      ],
      recommendations: [
        'Concentrar 70% da produção semanal nos formatos Reels e Carrossel.',
        'Manter cadência de 3 publicações semanais no feed combinadas com stories interativos às quartas-feiras.',
        'Testar chamadas para ação exclusivas via Direct Message com envio de material clínico complementar.'
      ],
      nextSteps: aiService.generateNextActions(client, contents, snapshots)
    };

    return storageService.reports.create(reportData);
  },

  /**
   * Exporta dados em formato CSV para download instantâneo no navegador
   */
  exportToCsv(filename: string, rows: Record<string, string | number | boolean>[]): void {
    if (!rows || rows.length === 0) return;

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
  },

  /**
   * Exporta Histórico de Métricas
   */
  exportHistoryCsv(clientId: string): void {
    const snapshots = storageService.history.getByClient(clientId);
    const rows = snapshots.map(s => ({
      Data: s.timestamp,
      Seguidores: s.followers,
      Visualizacoes: s.views,
      Alcance: s.reach,
      Curtidas: s.likes,
      Comentarios: s.comments,
      Compartilhamentos: s.shares,
      Salvamentos: s.saves,
      VisitasPerfil: s.profileVisits,
      PostsNoDia: s.postsCount,
      EngajamentoPercentual: `${s.engagementRate}%`
    }));
    this.exportToCsv(`historico_metricas_${clientId}`, rows);
  },

  /**
   * Exporta Catálogo de Conteúdos
   */
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

  /**
   * Exporta Banco de Ideias
   */
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
      CTA: i.cta,
      PorQueFazer: i.whyDoThis,
      DiaSugerido: i.calendarDay || 'Nao agendado'
    }));
    this.exportToCsv(`banco_ideias_${clientId}`, rows);
  },

  /**
   * Exporta Concorrentes Mapeados
   */
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
      TemasRecentes: c.recentThemes.join(', '),
      Similaridade: `${c.similarityScore}%`
    }));
    this.exportToCsv(`concorrentes_${clientId}`, rows);
  },

  /**
   * Aciona visualização de impressão/PDF do navegador para salvar como PDF limpo
   */
  triggerPdfPrint(): void {
    window.print();
  }
};
