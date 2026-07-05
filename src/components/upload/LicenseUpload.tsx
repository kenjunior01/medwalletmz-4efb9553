import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  label: string;
  description?: string;
  /** unique slot name, e.g. 'carta', 'viatura', 'cedula', 'misau' */
  slot: string;
  value?: string | null;
  onUploaded: (url: string) => void;
  accept?: string;
}

export function LicenseUpload({ label, description, slot, value, onUploaded, accept = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx' }: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value ?? null);

  const handleFile = async (file: File) => {
    if (!user) { toast.error('Inicia sessão primeiro'); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error('Ficheiro deve ter no máximo 15 MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/${slot}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('licenses').upload(path, file, {
        cacheControl: '3600', upsert: true, contentType: file.type,
      });
      if (error) throw error;
      setPreviewUrl(path);
      onUploaded(path);
      toast.success('Licença enviada');
    } catch (e: any) {
      toast.error('Erro no envio: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const hasFile = !!previewUrl;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground -mt-1">{description}</p>}
      <label className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-3 cursor-pointer transition-colors ${hasFile ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40'}`}>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${hasFile ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : hasFile ? <CheckCircle2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {hasFile ? 'Ficheiro enviado' : uploading ? 'A enviar…' : 'Carregar ficheiro'}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {hasFile ? previewUrl?.split('/').pop() : 'JPG, PNG, PDF ou DOC · máx. 15 MB'}
          </p>
        </div>
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={uploading}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {hasFile && (
          <Button type="button" variant="ghost" size="sm" onClick={async (e) => {
            e.preventDefault();
            if (!previewUrl) return;
            const { data } = await supabase.storage.from('licenses').createSignedUrl(previewUrl, 60);
            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
          }}>
            <FileText className="h-4 w-4" />
          </Button>
        )}
      </label>
    </div>
  );
}