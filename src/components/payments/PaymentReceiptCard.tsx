import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Share2, ReceiptText } from '@/components/icons/lucide-compat';
import { buildDocumentPdf, downloadPdf, sharePdf, formatMoney } from '@/lib/documents';
import { toast } from 'sonner';

export interface ReceiptRecord {
  id: string;
  receipt_number: string;
  payer_id: string;
  payee_id: string | null;
  service_type: string;
  reference_id: string | null;
  gross_amount: number;
  discount_amount: number;
  amount_paid: number;
  commission_rate: number;
  commission_amount: number;
  net_payout: number;
  currency: string;
  payment_method: string;
  created_at: string;
  payer_name?: string;
  payee_name?: string;
}

const SERVICE_LABEL: Record<string, string> = {
  consultation: 'Consulta médica',
  delivery: 'Entrega',
  pharmacy: 'Farmácia',
  lab: 'Exame laboratorial',
};

export function PaymentReceiptCard({ receipt, perspective }: { receipt: ReceiptRecord; perspective: 'payer' | 'payee' }) {
  const [busy, setBusy] = useState(false);
  const label = SERVICE_LABEL[receipt.service_type] || receipt.service_type;
  const cur = receipt.currency || 'MZN';

  const buildDoc = () =>
    buildDocumentPdf({
      kind: 'Recibo',
      number: receipt.receipt_number,
      issuedAt: receipt.created_at,
      fromName: 'MedWallet — Plataforma de Saúde',
      fromMeta: `Método: ${receipt.payment_method === 'wallet' ? 'Saldo da carteira' : receipt.payment_method}`,
      toName: receipt.payer_name || 'Paciente',
      toMeta: receipt.payee_name ? `Profissional: ${receipt.payee_name}` : undefined,
      items: [{ description: label, qty: 1, total: Number(receipt.amount_paid) }],
      totals: [
        { label: 'Subtotal', value: formatMoney(Number(receipt.gross_amount), cur) },
        ...(Number(receipt.discount_amount) > 0
          ? [{ label: 'Desconto', value: `- ${formatMoney(Number(receipt.discount_amount), cur)}` }]
          : []),
        { label: `Comissao plataforma (${Number(receipt.commission_rate)}%)`, value: formatMoney(Number(receipt.commission_amount), cur) },
        { label: 'Liquidado ao profissional', value: formatMoney(Number(receipt.net_payout), cur) },
        { label: 'Total pago', value: formatMoney(Number(receipt.amount_paid), cur) },
      ],
      currency: cur,
      reference: receipt.reference_id || receipt.id,
      footerNote: 'Pagamento efectuado com saldo da carteira MedWallet. A plataforma liquida o valor ao profissional.',
    });

  const fileName = `recibo-${receipt.receipt_number}.pdf`;

  const onDownload = () => {
    downloadPdf(buildDoc(), fileName);
    toast.success('Recibo descarregado');
  };

  const onShare = async () => {
    setBusy(true);
    try {
      const res = await sharePdf(buildDoc(), fileName, {
        title: `Recibo ${receipt.receipt_number} — MedWallet`,
        text: `${label} • ${formatMoney(Number(receipt.amount_paid), cur)} pago em ${new Date(receipt.created_at).toLocaleDateString('pt-PT')}.`,
      });
      if (res === 'downloaded') toast.info('PDF descarregado — anexa-o na conversa do WhatsApp.');
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Não foi possível partilhar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ReceiptText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{label}</p>
            <p className="text-xs text-muted-foreground">
              {receipt.receipt_number} • {new Date(receipt.created_at).toLocaleString('pt-PT')}
            </p>
          </div>
          <Badge variant="outline">{receipt.payment_method === 'wallet' ? 'Carteira' : receipt.payment_method}</Badge>
        </div>

        <div className="rounded-xl bg-muted/50 p-3 text-sm space-y-1">
          <Row label="Valor pago" value={formatMoney(Number(receipt.amount_paid), cur)} strong />
          <Row label={`Comissão (${Number(receipt.commission_rate)}%)`} value={formatMoney(Number(receipt.commission_amount), cur)} />
          <Row
            label={perspective === 'payee' ? 'Recebido por si' : 'Liquidado ao profissional'}
            value={formatMoney(Number(receipt.net_payout), cur)}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onDownload}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onShare} disabled={busy}>
            <Share2 className="h-4 w-4 mr-1" /> Partilhar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-semibold' : ''}>{value}</span>
    </div>
  );
}
