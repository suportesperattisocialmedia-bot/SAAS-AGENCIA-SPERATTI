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
import { formatMetric, signedPct } from '../utils/metrics';
import { weekDayLabel } from './storage/migration';
import { brasiliaDay } from './dashboardInsights';
import { notificationService } from './notificationService';

/** Próximas ações do último diagnóstico importado (se houver). */
function latestDiagnosticActions(clientId: string): string[] | null {
  const last = storageService.aiAnalyses.getByClient(clientId).find((a) => a.analysisType === 'PROFILE_DIAGNOSTIC');
  const actions = (last?.output as { nextActions?: unknown } | undefined)?.nextActions;
  return Array.isArray(actions) && actions.length > 0 && actions.every((x) => typeof x === 'string') ? actions.slice(0, 5) : null;
}

/** De onde vieram os dados do cliente, dito com precisão (vai no rodapé do PDF). */
function provenanceLines(clientId: string): string[] {
  const contents = storageService.contents.getAll().filter((c) => c.clientId === clientId);
  const snaps = storageService.history.getByClient(clientId);
  const fromCsv = contents.some((c) => c.instagramMediaId?.startsWith('import:'));
  const fromApi = contents.some((c) => c.instagramMediaId && !c.instagramMediaId.startsWith('import:')) || snaps.some((s) => s.source === 'META_API');
  const sources = [fromCsv && 'importadas do Meta Business Suite (CSV)', fromApi && 'sincronizadas pela API oficial do Instagram'].filter(Boolean);
  const lines = [sources.length ? `Métricas das publicações: ${sources.join(' e ')}.` : 'Nenhuma métrica de publicação registrada no período.'];
  if (snaps.some((s) => s.source === 'MANUAL')) lines.push('Seguidores: registrados manualmente pelo gestor.');
  lines.push('Comparações: calculadas contra o período anterior de mesma duração. Sem dado aparece como n/d; nada é estimado.');
  return lines;
}

export const reportService = {
  /**
   * Generate an executive performance report based purely on client metrics
   */
  async generateReport(client: Client, periodDays: 7 | 14 | 30 | 90 = 30): Promise<Report> {
    const snapshots = storageService.history.getByClient(client.id);
    const contents = storageService.contents.getByClient(client.id);
    const period = analyticsService.calculatePeriod(snapshots, periodDays, undefined, contents);

    // Destaques só do período do relatório (data de publicação em Brasília).
    const periodContents = contents.filter((c) => {
      const d = brasiliaDay(c.publishedAt);
      return d >= period.startDate && d <= period.endDate;
    });
    const ranked = analyticsService.rankContents(periodContents, 'score', false);
    const topContents = ranked.slice(0, 3);
    const worstContents = ranked.length > 3 ? ranked.slice(-2) : [];

    const br = (iso: string) => iso.split('-').reverse().join('/');
    const periodLabel = `${br(period.startDate)} a ${br(period.endDate)} (${periodDays} dias)`;
    const pct = (v: number | null) => signedPct(v);
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
      nextSteps: latestDiagnosticActions(client.id) ?? aiService.generateNextActions(client, contents, snapshots)
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
        diff: signedPct(report.kpis.followersDiffPct) ?? 'n/d'
      },
      {
        label: 'Visualizações',
        val: formatMetric(report.kpis.views),
        diff: signedPct(report.kpis.viewsDiffPct) ?? 'n/d'
      },
      {
        label: 'Alcance Total',
        val: formatMetric(report.kpis.reach),
        diff: signedPct(report.kpis.reachDiffPct) ?? 'n/d'
      },
      {
        label: 'Engajamento',
        val: formatMetric(report.kpis.engagementRate, { suffix: '%' }),
        diff: signedPct(report.kpis.engagementDiffPct) ?? 'n/d'
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
    provenanceLines(client.id).forEach((line, i) => doc.text(`• ${line}`, margin + 4, y + 11 + i * 4));

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
      notificationService.showToast('Não há dados para exportar nesta tabela ainda.', 'info');
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

  /** CSV do relatório: resumo (KPIs) + todos os posts do período, com todas as métricas (n/d quando indisponível). */
  exportReportCsv(report: Report): void {
    const nd = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? 'n/d' : v);
    const pct = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? 'n/d' : `${Math.round(v * 100) / 100}%`);
    const posts = storageService.contents
      .getAll()
      .filter((c) => c.clientId === report.clientId)
      .filter((c) => {
        const day = brasiliaDay(c.publishedAt);
        return day >= report.startDate.slice(0, 10) && day <= report.endDate.slice(0, 10);
      })
      .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
    const k = report.kpis;
    const rows: Record<string, string | number>[] = [
      { Tipo: 'Resumo', Data: `${report.startDate.slice(0, 10)} a ${report.endDate.slice(0, 10)}`, Publicacao: 'Publicações no período', Formato: '', Visualizacoes: k.postsCount, Alcance: '', Curtidas: '', Comentarios: '', Salvamentos: '', Compartilhamentos: '', Engajamento: '' },
      { Tipo: 'Resumo', Data: '', Publicacao: 'Totais do período', Formato: '', Visualizacoes: nd(k.views), Alcance: nd(k.reach), Curtidas: '', Comentarios: '', Salvamentos: '', Compartilhamentos: '', Engajamento: pct(k.engagementRate) },
      ...posts.map((c) => ({
        Tipo: 'Post',
        Data: brasiliaDay(c.publishedAt),
        Publicacao: c.title,
        Formato: c.format,
        Visualizacoes: nd(c.metrics.views),
        Alcance: nd(c.metrics.reach),
        Curtidas: nd(c.metrics.likes),
        Comentarios: nd(c.metrics.comments),
        Salvamentos: nd(c.metrics.saves),
        Compartilhamentos: nd(c.metrics.shares),
        Engajamento: pct(c.metrics.engagementRate)
      }))
    ];
    const slug = report.clientName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
    this.exportToCsv(`relatorio_${slug}_${report.startDate.slice(0, 10)}_${report.endDate.slice(0, 10)}`, rows);
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
      TaxaEngajamento: s.engagementRate === null || s.engagementRate === undefined ? 'n/d' : `${s.engagementRate}%`,
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
