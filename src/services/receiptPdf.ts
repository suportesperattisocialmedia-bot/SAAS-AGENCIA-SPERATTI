/**
 * Recibo / demonstrativo de cobrança em PDF (documento interno, sem valor fiscal).
 */

import type { Invoice } from '../types';
import { brl, formatInvoiceNumber, invoiceTotal, PAYMENT_METHODS, receivedOf } from './finance';

const br = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export async function downloadReceiptPdf(inv: Invoice, agencyName: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 18;
  const paid = inv.status === 'paga';
  const method = PAYMENT_METHODS.find((m) => m.id === inv.paymentMethod)?.label ?? inv.paymentMethod;

  // Cabeçalho
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 34, 'F');
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(agencyName || 'Agência', M, 15);
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(paid ? 'Recibo de pagamento' : 'Demonstrativo de cobrança', M, 23);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(formatInvoiceNumber(inv.number), W - M, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Emitido em ${br(inv.issueDate)}`, W - M, 23, { align: 'right' });

  let y = 48;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text('CLIENTE', M, y);
  doc.text('VENCIMENTO', W / 2, y);
  y += 6;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(inv.clientName, M, y);
  doc.text(br(inv.dueDate), W / 2, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(doc.splitTextToSize(inv.description, W / 2 - M - 4), M, y);
  doc.text(`Forma: ${method}`, W / 2, y);

  // Itens
  y += 14;
  doc.setFillColor(241, 245, 249);
  doc.rect(M, y - 5, W - 2 * M, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO', M + 2, y);
  doc.text('QTD', W - M - 62, y, { align: 'right' });
  doc.text('UNITÁRIO', W - M - 32, y, { align: 'right' });
  doc.text('TOTAL', W - M - 2, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  y += 8;
  inv.items.forEach((it) => {
    const lines = doc.splitTextToSize(it.description, W - 2 * M - 80);
    doc.text(lines, M + 2, y);
    doc.text(String(it.quantity).replace('.', ','), W - M - 62, y, { align: 'right' });
    doc.text(brl(it.unitCents), W - M - 32, y, { align: 'right' });
    doc.text(brl(Math.round(it.quantity * it.unitCents)), W - M - 2, y, { align: 'right' });
    y += Math.max(7, lines.length * 4.5 + 2.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(M, y - 4, W - M, y - 4);
  });

  // Totais
  y += 2;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 12 : 9);
    doc.text(label, W - M - 60, y);
    doc.text(value, W - M - 2, y, { align: 'right' });
    y += bold ? 8 : 6;
  };
  if (inv.discountCents > 0) row('Desconto', `- ${brl(inv.discountCents)}`);
  row('Total', brl(invoiceTotal(inv)), true);

  // Situação
  y += 4;
  if (paid) {
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(M, y, W - 2 * M, 16, 2, 2, 'F');
    doc.setTextColor(21, 128, 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`PAGO em ${br(inv.paidAt ?? inv.dueDate)} · ${brl(receivedOf(inv))} via ${method}`, M + 5, y + 10);
    y += 22;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      doc.splitTextToSize(`Recebemos de ${inv.clientName} a importância de ${brl(receivedOf(inv))} referente a: ${inv.description}.`, W - 2 * M),
      M,
      y
    );
    y += 14;
  } else if (inv.status === 'cancelada') {
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('COBRANÇA CANCELADA', M, y + 8);
    y += 16;
  }

  if (inv.notes) {
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(`Observações: ${inv.notes}`, W - 2 * M), M, y + 4);
  }

  // Rodapé
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(M, H - 22, W - M, H - 22);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.text(
    inv.fiscalNumber
      ? `Documento interno. Nota fiscal correspondente: ${inv.fiscalNumber}.`
      : 'Documento interno de controle, sem valor fiscal. A nota fiscal, quando houver, é emitida à parte.',
    M,
    H - 15
  );

  const slug = inv.clientName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
  doc.save(`${paid ? 'recibo' : 'cobranca'}-${String(inv.number).padStart(4, '0')}-${slug}.pdf`);
}
