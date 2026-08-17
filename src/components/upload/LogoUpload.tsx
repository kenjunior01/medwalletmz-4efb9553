import { useRef, useState } from 'react';
import { Upload, X } from '@/components/icons/lucide-compat';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface LogoUploadProps {
  onFileSelect?: (file: File) => void;
  onUploaded?: (url: string) => void;
  value?: string | null;
  label?: string;
  description?: string;
  accept?: string;
  className?: string;
  bucket?: string;
  folder?: string;
}

export function LogoUpload({
  onFileSelect,
  onUploaded,
  value,
  label = 'Carregar logo',
  description,
  accept = 'image/*',
  className,
  bucket,
  folder,
}: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onFileSelect?.(file);

    if (onUploaded && bucket) {
      setUploading(true);
      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = folder
          ? `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          : `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, file, { upsert: true });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
        setPreview(pub.publicUrl);
        onUploaded(pub.publicUrl);
      } catch {
        // If upload fails, still show local preview
        const localUrl = URL.createObjectURL(file);
        setPreview(localUrl);
      } finally {
        setUploading(false);
      }
    } else {
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);
    }
  };

  return (
    <div
      className={cn(
        'border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer relative',
        uploading && 'opacity-60 pointer-events-none',
        className
      )}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="max-h-24 mx-auto rounded-lg object-contain" />
          <button
            type="button"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
            onClick={(e) => { e.stopPropagation(); setPreview(null); onUploaded?.(''); }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <>
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {description && <p className="text-[10px] text-muted-foreground/60 mt-1">{description}</p>}
        </>
      )}
      {uploading && <p className="text-[10px] text-primary mt-1">A carregar...</p>}
    </div>
  );
}
