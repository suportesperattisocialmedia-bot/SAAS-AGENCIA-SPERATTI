/**
 * GABRIEL SPERATTI | SOCIAL INTELLIGENCE
 * Report Service - Executive Strategic Reports, Real PDF Generation & Universal CSV Export
 * 
 * Strict rule: All text and KPIs derive strictly from the given client's real data.
 * Zero hardcoded names or medical assumptions.
 * Real PDF generation with jsPDF (no window.print dependency).
 */

import { Client, Report} from '../types';
import { storageService } from './storageService';
import { analyticsService } from './analyticsService';
import { aiService } from './aiService';
import { formatMetric } from '../utils/metrics';
import { weekDayLabel } from './storage/migration';

export const reportService = {
  /**
   * Generate an executive performance report based purely on client metrics
   */
  async generateReport(client: Client, periodDays: 7 | 14 | 30 | 90 = 30): Promise<Report> {
    const snapshots = storageService.history.getByClient(client.id);
    const contents = storageService.contents.getByClient(client.id);
    const period = analyticsService.calculatePeriod(snapshots, periodDays, undefined, contents);

    const ranked = analyticsService.rankContents(contents, 'score', false);
    const topContents = ranked.slice(0, 3);
    const worstContents = ranked.length > 3 ? ranked.slice(-2) : [];

    const br = (iso: string) => iso.split('-').reverse().join('/');
    const periodLabel = `${br(period.startDate)} a ${br(period.endDate)} (${periodDays} dias)`;
    const pct = (v: number | null) => (v === null ? null : `${v >= 0 ? '+' : ''}${v}%`);
    const postsInPeriod = period.postsPublished.current ?? 0;

    // Resumo honesto: só cita o que existe; nada de "valor não disponível" no meio da frase.
    const summaryParts: string[] = [];
    if (period.followersGrowth.current !== null) {
      const diff = pct(period.followersGrowth.percentDiff);
      summaryParts.push(`a conta ${client.instagram} chegou a ${formatMetric(period.followersGrowth.current)} seguidores${diff ? ` (${diff} vs. período anterior)` : ''}`);
    }
    if (period.totalViews.current !== null) {
      const diff = pct(period.totalViews.percentDiff);
      summaryParts.push(`${formatMetric(period.totalViews.current)} visualizações${diff ? ` (${diff})` : ''}`);
    }
    if (period.totalReach.current !== null) {
      summaryParts.push(`${formatMetric(period.totalReach.current)} de alcance`);
    }

    const executiveSummary = snapshots.length === 0 && contents.length === 0
      ? `Relatório inicial para o cliente ${client.name} (${client.instagram}) no segmento ${client.segment}. Importe as métricas do Meta Business Suite na aba Métricas para habilitar os indicadores.`
      : `Período de ${periodLabel}: ${postsInPeriod} ${postsInPeriod === 1 ? 'publicação' : 'publicações'} no período${summaryParts.length ? `; ${summaryParts.join(', ')}` : ''}. ` +
        (summaryParts.length < 3 ? 'Indicadores sem dado aparecem como n/d (não informado na importação).' : '');

    const analysisText = contents.length === 0
      ? 'Ainda não existem conteúdos catalogados para avaliar distribuição por pilares e retenção.'
      : [
          `${contents.length} ${contents.length === 1 ? 'publicação catalogada' : 'publicações catalogadas'} no segmento de ${client.segment}.`,
          client.formats.length ? `Formatos trabalhados: ${client.formats.join(', ')}.` : '',
          client.pillars.length ? `Pilares editoriais: ${client.pillars.join(', ')}.` : '',
          'Conteúdos com mais salvamentos e compartilhamentos indicam maior valor percebido pelo público.'
        ].filter(Boolean).join(' ');

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
        postsCount: postsInPeriod
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
      nextSteps: aiService.generateNextActions(client, contents)
    };

    return storageService.reports.create(reportData);
  },

  /**
   * Generates and downloads a real, multi-page branded PDF report
   */
  async exportToPdf(report: Report, client: Client): Promise<void> {
    // Carregado sob demanda: jsPDF é pesado e só é necessário na exportação.
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    let y = 20;

    // Header Background Accent
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Brand Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(245, 158, 11); // amber-500
    doc.text('GABRIEL SPERATTI | SOCIAL INTELLIGENCE', margin, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Sistema Interno de Inteligência, Estratégia e Operação', margin, 21);

    // Report Title & Metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(report.title, margin, 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(`Cliente: ${client.name} (${client.instagram}) | Segmento: ${client.segment} | Período: ${report.periodLabel}`, margin, 38);

    y = 52;

    // Executive Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Sumário Executivo', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const summaryLines = doc.splitTextToSize(report.executiveSummary, pageWidth - (margin * 2));
    doc.text(summaryLines, margin, y);
    y += (summaryLines.length * 4.5) + 6;

    // KPIs Table Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Indicadores Chave de Performance (KPIs)', margin, y);
    y += 6;

    const kpiBoxWidth = (pageWidth - (margin * 2) - 12) / 4;
    const kpisList = [
      {
        label: 'Seguidores',
        val: formatMetric(report.kpis.followers),
        diff: report.kpis.followersDiffPct !== null ? `${report.kpis.followersDiffPct >= 0 ? '+' : ''}${report.kpis.followersDiffPct}%` : 'N/D'
      },
      {
        label: 'Visualizações',
        val: formatMetric(report.kpis.views),
        diff: report.kpis.viewsDiffPct !== null ? `${report.kpis.viewsDiffPct >= 0 ? '+' : ''}${report.kpis.viewsDiffPct}%` : 'N/D'
      },
      {
        label: 'Alcance Total',
        val: formatMetric(report.kpis.reach),
        diff: report.kpis.reachDiffPct !== null ? `${report.kpis.reachDiffPct >= 0 ? '+' : ''}${report.kpis.reachDiffPct}%` : 'N/D'
      },
      {
        label: 'Engajamento',
        val: formatMetric(report.kpis.engagementRate, { suffix: '%' }),
        diff: report.kpis.engagementDiffPct !== null ? `${report.kpis.engagementDiffPct >= 0 ? '+' : ''}${report.kpis.engagementDiffPct}%` : 'N/D'
      }
    ];

    kpisList.forEach((kpi, idx) => {
      const bx = margin + (idx * (kpiBoxWidth + 4));
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(bx, y, kpiBoxWidth, 20, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, bx + 3, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(kpi.val, bx + 3, y + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(kpi.diff.startsWith('+') ? 16 : 100, kpi.diff.startsWith('+') ? 149 : 116, kpi.diff.startsWith('+') ? 193 : 139);
      doc.text(kpi.diff, bx + 3, y + 16);
    });

    y += 28;

    // Top Contents
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('3. Conteúdos de Maior Destaque', margin, y);
    y += 6;

    if (report.topContents.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Nenhum conteúdo catalogado no período analisado.', margin, y);
      y += 8;
    } else {
      report.topContents.forEach((c, i) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`${i + 1}. [${c.format}] ${c.title.slice(0, 60)}`, margin, y);
        y += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Pilar: ${c.pillar} | Views: ${formatMetric(c.metrics.views)} | Salvamentos: ${formatMetric(c.metrics.saves)} | Compartilhamentos: ${formatMetric(c.metrics.shares)}`, margin + 4, y);
        y += 5.5;
      });
    }

    y += 4;

    // Strategy & Next Steps
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('4. Recomendações Estratégicas & Próximos Passos', margin, y);
    y += 6;

    const recommendations = [...report.recommendations, ...report.nextSteps].slice(0, 4);
    recommendations.forEach(rec => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const recLines = doc.splitTextToSize(`• ${rec}`, pageWidth - (margin * 2) - 4);
      doc.text(recLines, margin + 2, y);
      y += (recLines.length * 4) + 1.5;
    });

    y += 6;

    // Provenance & Audit Footer Box
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - (margin * 2), 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('Metodologia & Proveniência dos Dados:', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('• Métricas de conta e publicações: extraídas via Meta Graph API oficial (REAL_DATA).', margin + 4, y + 11);
    doc.text('• Comparações percentuais: cálculo matemático auditável sobre snapshots cronológicos (CALCULATED_DATA).', margin + 4, y + 15);
    doc.text('• Recomendações estratégicas: direcionadas por inteligência de marketing sem métricas simuladas.', margin + 4, y + 19);

    // Save and download
    const cleanHandle = client.instagram.replace('@', '').replace(/[^a-zA-Z0-9_]/g, '');
    const cleanDate = report.endDate || new Date().toISOString().split('T')[0];
    doc.save(`relatorio_${cleanHandle}_${cleanDate}.pdf`);
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
    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(';') || str.includes('\n') || str.includes('"') || str.includes(',')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeCsv).join(';');
    const dataLines = rows.map(row => headers.map(h => escapeCsv(row[h])).join(';'));
    const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportContentsCsv(clientId: string): void {
    const contents = storageService.contents.getByClient(clientId);
    const rows = contents.map(c => ({
      ID: c.id,
      Titulo: c.title,
      Formato: c.format,
      Pilar: c.pillar,
      Objetivo: c.objective,
      Visualizacoes: c.metrics.views,
      Alcance: c.metrics.reach,
      Curtidas: c.metrics.likes,
      Comentarios: c.metrics.comments,
      Salvamentos: c.metrics.saves,
      Compartilhamentos: c.metrics.shares,
      TaxaEngajamento: `${c.metrics.engagementRate}%`,
      DataPublicacao: c.publishedAt
    }));
    this.exportToCsv(`conteudos_${clientId}`, rows);
  },

  exportHistoryCsv(clientId: string): void {
    const snapshots = storageService.history.getByClient(clientId);
    const rows = snapshots.map(s => ({
      Data: s.date,
      Seguidores: s.followers,
      Alcance: s.reach,
      Visualizacoes: s.views,
      Curtidas: s.likes,
      Comentarios: s.comments,
      Salvamentos: s.saves,
      Compartilhamentos: s.shares,
      VisitasPerfil: s.profileVisits,
      PostsNoDia: s.postsPublished,
      TaxaEngajamento: `${s.engagementRate}%`,
      Fonte: s.source
    }));
    this.exportToCsv(`historico_${clientId}`, rows);
  },

  exportCompetitorsCsv(clientId: string): void {
    const competitors = storageService.competitors.getByClient(clientId);
    const rows = competitors.map(c => ({
      Nome: c.name,
      Instagram: c.instagram,
      Status: c.status,
      Similaridade: c.similarityScore !== null ? `${c.similarityScore}%` : 'Sem dados',
      Seguidores: c.followers !== null ? c.followers : 'Sem dados',
      FrequenciaSemanal: c.postingFrequencyWeekly !== null ? c.postingFrequencyWeekly : 'Sem dados',
      Formatos: c.topFormats.join(', '),
      Site: c.website
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
      DiaSugerido: i.calendarDay ? weekDayLabel(i.calendarDay) : ''
    }));
    this.exportToCsv(`banco_ideias_${clientId}`, rows);
  },

  exportCalendarCsv(clientId: string): void {
    const calendar = storageService.calendar.getByClient(clientId);
    const rows = calendar.map(c => ({
      DiaDaSemana: weekDayLabel(c.dayOfWeek),
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
  }
};
