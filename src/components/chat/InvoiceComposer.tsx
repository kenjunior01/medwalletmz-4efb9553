import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, Trash2, Loader2 } from '@/components/icons/lucide-compat';
import { buildDocumentPdf, pdfBlob, formatMoney } from '@/lib/documents';
import { uploadChatFile } from '@/lib/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Item { description: string; qty: number; unit: number }

export function InvoiceComposer({
  threadId, userId, fromName, toName, currency = 'MZN',
}: { threadId: string; userId: string; fromName: string; toName: string; currency?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>([{ description: '', qty: 1, unit: 0 }]);
  const [note, setNote] = useState('');

  const total = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unit) || 0), 0);

  const update = (idx: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const submit = async () => {
    const valid = items.filter((i) => i.description.trim() && Number(i.unit) > 0);
    if (!valid.length) { toast.error('Adiciona pelo menos um item com valor'); return; }
    setBusy(true);
    try {
      const number = `FT-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const doc = buildDocumentPdf({
        kind: 'Factura',
        number,
        issuedAt: new Date(),
        fromName,
        toName,
        items: valid.map((i) => ({ description: i.description, qty: i.qty, unit: i.unit, total: i.qty * i.unit })),
        totals: [{ label: 'Total', value: formatMoney(total, currency) }],
        currency,
        reference: threadId,
        footerNote: note || 'Factura emitida através da plataforma MedWallet.',
      });
      const fileName = `factura-${number}.pdf`;
      const { url } = await uploadChatFile(userId, threadId, pdfBlob(doc), fileName);
      const { error } = await (supabase as any).from('chat_messages').insert({
        thread_id: threadId,
        sender_id: userId,
        kind: 'invoice',
        body: `🧾 Factura ${number} — ${formatMoney(total, currency)}`,
        attachment_url: url,
        attachment_type: 'pdf',
        attachment_name: fileName,
        metadata: { number, total, currency, items: valid, note },
      });
      if (error) throw error;
      toast.success('Factura enviada na conversa');
      setOpen(false);
      setItems([{ description: '', qty: 1, unit: 0 }]);
      setNote('');
    } catch (e: any) {
      toast.error(e.message || 'Não foi possível emitir a factura');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Emitir factura">
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Emitir factura</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs flex-1">Item {idx + 1}</Label>
                {items.length > 1 && (
                  <Button variant="ghost" size="icon" aria-label="Remover item" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Input placeholder="Descrição do serviço" value={it.description} onChange={(e) => update(idx, { description: e.target.value })} />
              <div className="flex gap-2">
                <Input type="number" min={1} placeholder="Qtd" value={it.qty} onChange={(e) => update(idx, { qty: Number(e.target.value) })} aria-label="Quantidade" />
                <Input type="number" min={0} placeholder="Preço unitário" value={it.unit} onChange={(e) => update(idx, { unit: Number(e.target.value) })} aria-label="Preço unitário" />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={() => setItems((p) => [...p, { description: '', qty: 1, unit: 0 }])}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar item
          </Button>
          <Textarea placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          <div className="flex justify-between font-semibold">
            <span>Total</span><span>{formatMoney(total, currency)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy} className="w-full">
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Emitir e enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
