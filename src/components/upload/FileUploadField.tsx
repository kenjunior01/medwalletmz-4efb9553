import { useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle2 } from '@/components/icons/lucide-compat';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface FileUploadFieldProps {
  label?: string;
  description?: string;
  value?: string | null;
  bucket?: string;
  folder?: string;
  accept?: string;
  className?: string;
  preview?: boolean;
  onUploaded?: (url: string) => void;
}

export function FileUploadField({
  label = 'Carregar ficheiro',
  description,
  value,
  bucket = 'licenses',
  folder = 'docs',
  accept = 'image/*,.pdf',
  className,
  preview = true,
  onUploaded,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Ficheiro demasiado grande (máx. 8 MB)');
      return;
    }
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (!uid) {
        toast.error('Sessão expirada. Inicie sessão novamente.');
        return;
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const path = `${uid}/${folder}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (error) throw error;

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      let url = pub?.publicUrl || path;
      if (!url || bucket === 'licenses') {
        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed?.signedUrl) url = signed.signedUrl;
      }
      if (file.type.startsWith('image/')) setLocalPreview(URL.createObjectURL(file));
      onUploaded?.(url);
      toast.success('Ficheiro carregado com sucesso');
    } catch (err: any) {
      logger.error('Upload falhou', { bucket, folder, error: err?.message });
      toast.error(err?.message || 'Não foi possível carregar o ficheiro');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const shown = localPreview || (value && /^https?:/.test(value) ? value : null);

  return (
    <div
      className={cn(
        'border-2 border-dashed border-border rounded-xl p-4 text-center transition-colors cursor-pointer',
        busy ? 'opacity-70' : 'hover:border-primary/50',
        value && 'border-primary/50 bg-primary/5',
        className,
      )}
      onClick={() => !busy && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      {busy ? (
        <Loader2 className="w-7 h-7 mx-auto mb-2 animate-spin text-primary" />
      ) : shown && preview ? (
        <img src={shown} alt={label} className="max-h-24 mx-auto mb-2 rounded-lg object-contain" />
      ) : value ? (
        <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-primary" />
      ) : (
        <Upload className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
      )}
      <p className="text-xs font-semibold">{label}</p>
      {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}
