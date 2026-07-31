import { useRef, useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle2 } from '@/components/icons/lucide-compat';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LicenseUploadProps {
  /** Optional identifier used to build the storage path. */
  slot?: string;
  label?: string;
  description?: string;
  /** Current stored path/url. */
  value?: string;
  onUploaded?: (path: string) => void;
  onFileSelect?: (file: File) => void;
  accept?: string;
  bucket?: string;
  folder?: string;
  className?: string;
}

export function LicenseUpload({
  slot = 'license',
  label = 'Carregar licença',
  description,
  value,
  onUploaded,
  onFileSelect,
  accept = 'image/*,.pdf',
  bucket = 'licenses',
  folder = 'registrations',
  className,
}: LicenseUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileSelect?.(file);
    setFileName(file.name);

    if (file.size > 10 * 1024 * 1024) {
      toast.error('O ficheiro deve ter no máximo 10 MB');
      return;
    }

    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Inicie sessão para carregar documentos');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${folder}/${auth.user.id}/${slot}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
      });
      if (error) throw error;
      onUploaded?.(path);
      toast.success('Documento carregado');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar documento');
      setFileName(null);
    } finally {
      setUploading(false);
    }
  };

  const done = Boolean(value);

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer',
        done ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        className,
      )}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      {uploading ? (
        <Loader2 className="w-7 h-7 mx-auto mb-2 animate-spin text-primary" />
      ) : done ? (
        <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-primary" />
      ) : (
        <Upload className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
      )}
      <p className={cn('text-xs font-bold', done ? 'text-primary' : 'text-foreground')}>{label}</p>
      {(fileName || description) && (
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
          {fileName && <FileText className="h-3 w-3" />}
          {fileName || description}
        </p>
      )}
    </div>
  );
}
