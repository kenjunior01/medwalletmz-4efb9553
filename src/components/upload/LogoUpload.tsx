import { useRef, useState } from 'react';
import { Upload, Loader2 } from '@/components/icons/lucide-compat';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LogoUploadProps {
  label?: string;
  description?: string;
  value?: string;
  onUploaded?: (path: string) => void;
  onFileSelect?: (file: File) => void;
  accept?: string;
  bucket?: string;
  folder?: string;
  className?: string;
}

export function LogoUpload({
  label = 'Carregar logo',
  description,
  value,
  onUploaded,
  onFileSelect,
  accept = 'image/*',
  bucket = 'licenses',
  folder = 'business-logos',
  className,
}: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileSelect?.(file);
    setPreview(URL.createObjectURL(file));

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10 MB');
      return;
    }

    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Inicie sessão para carregar imagens');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${folder}/${auth.user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'image/jpeg',
      });
      if (error) throw error;
      onUploaded?.(path);
      toast.success('Imagem carregada');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar imagem');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer',
        value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        className,
      )}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      {uploading ? (
        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
      ) : preview ? (
        <img src={preview} alt="Pré-visualização do logotipo" className="max-h-24 mx-auto rounded-lg object-contain" />
      ) : (
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
      )}
      <p className="text-xs font-bold mt-1">{label}</p>
      {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}
