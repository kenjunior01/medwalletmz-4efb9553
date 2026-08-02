import jsPDF from 'jspdf';

export interface DocLine {
  label: string;
  value: string;
}

export interface DocumentPayload {
  /** "RECIBO" | "FACTURA" | ... */
  kind: string;
  number: string;
  issuedAt: string | Date;
  fromName: string;
  fromMeta?: string;
  toName: string;
  toMeta?: string;
  items: { description: string; qty?: number; unit?: number; total: number }[];
  totals: DocLine[];
  currency: string;
  footerNote?: string;
  reference?: string;
}

export function formatMoney(value: number, currency = 'MZN', locale = 'pt-PT') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value || 0);
  } catch {
    return `${(value || 0).toFixed(2)} ${currency}`;
  }
}

/** Constrói um PDF A4 (recibo / factura) com identidade MedWallet. */
export function buildDocumentPdf(p: DocumentPayload): jsPDF {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const left = 15;
  const right = pageW - 15;
  let y = 20;

  doc.setFillColor(6, 95, 70);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MedWallet', left, 18);
  doc.setFontSize(12);
  doc.text(p.kind.toUpperCase(), right, 18, { align: 'right' });

  doc.setTextColor(0);
  y = 40;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Nº ${p.number}`, left, y);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(p.issuedAt).toLocaleString('pt-PT'), right, y, { align: 'right' });
  y += 8;
  doc.setDrawColor(210);
  doc.line(left, y, right, y);
  y += 9;

  doc.setFont('helvetica', 'bold');
  doc.text('Emitido por', left, y);
  doc.text('Para', pageW / 2, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(p.fromName || '-', left, y, { maxWidth: pageW / 2 - 20 });
  doc.text(p.toName || '-', pageW / 2, y, { maxWidth: pageW / 2 - 20 });
  y += 5;
  if (p.fromMeta) doc.text(p.fromMeta, left, y, { maxWidth: pageW / 2 - 20 });
  if (p.toMeta) doc.text(p.toMeta, pageW / 2, y, { maxWidth: pageW / 2 - 20 });
  y += 12;

  doc.setFillColor(240, 245, 243);
  doc.rect(left, y - 5, right - left, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Descrição', left + 2, y);
  doc.text('Qtd', right - 60, y, { align: 'right' });
  doc.text('Valor', right - 2, y, { align: 'right' });
  y += 9;
  doc.setFont('helvetica', 'normal');

  p.items.forEach((it) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.text(it.description, left + 2, y, { maxWidth: right - left - 70 });
    doc.text(String(it.qty ?? 1), right - 60, y, { align: 'right' });
    doc.text(formatMoney(it.total, p.currency), right - 2, y, { align: 'right' });
    y += 7;
  });

  y += 3;
  doc.setDrawColor(210);
  doc.line(right - 90, y, right, y);
  y += 7;
  p.totals.forEach((t, i) => {
    const bold = i === p.totals.length - 1;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(t.label, right - 90, y);
    doc.text(t.value, right - 2, y, { align: 'right' });
    y += 6;
  });

  doc.setFontSize(8);
  doc.setTextColor(120);
  if (p.reference) doc.text(`Ref: ${p.reference}`, left, 283);
  doc.text(p.footerNote || 'Documento gerado automaticamente pela plataforma MedWallet.', left, 289, { maxWidth: right - left });
  return doc;
}

export function pdfBlob(doc: jsPDF): Blob {
  return doc.output('blob') as Blob;
}

export function downloadPdf(doc: jsPDF, fileName: string) {
  doc.save(fileName);
}

/** Partilha o PDF (Web Share API com ficheiro) ou abre o WhatsApp com o texto + descarrega o PDF. */
export async function sharePdf(
  doc: jsPDF,
  fileName: string,
  opts: { title: string; text: string; channel?: 'native' | 'whatsapp'; phone?: string },
): Promise<'shared' | 'downloaded'> {
  const blob = pdfBlob(doc);
  const file = new File([blob], fileName, { type: 'application/pdf' });
  const navAny = navigator as any;
  if (opts.channel !== 'whatsapp' && navAny?.canShare?.({ files: [file] })) {
    await navAny.share({ files: [file], title: opts.title, text: opts.text });
    return 'shared';
  }
  const base = opts.phone ? `https://wa.me/${opts.phone.replace(/\D/g, '')}` : 'https://wa.me/';
  window.open(`${base}?text=${encodeURIComponent(`${opts.title}\n\n${opts.text}`)}`, '_blank', 'noopener,noreferrer');
  doc.save(fileName);
  return 'downloaded';
}
