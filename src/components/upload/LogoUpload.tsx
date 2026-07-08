import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle2, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Props {
  label: string;
  description?: string;
  value?: string | null;
  onUploaded: (url: string) => void;
  bucket?: string;
  folder?: string;
}

export function LogoUpload({
  label,
  description,
  value,
  onUploaded,
  bucket = 'logos',
  folder = 'institutions'
}: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      if (value.startsWith('http')) {
        setPreviewUrl(value);
      } else {
        // Resolve path from supabase storage
        supabase.storage.from(bucket).getPublicUrl(value).data.publicUrl && setPreviewUrl(supabase.storage.from(bucket).getPublicUrl(value).data.publicUrl);
      }
    }
  }, [value, bucket]);

  const handleFile = async (file: File) => {
    if (!user) { toast.error('Inicia sessão primeiro'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 5 MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('O ficheiro deve ser uma imagem'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const path = folder ? `${folder}/${fileName}` : fileName;

      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      setPreviewUrl(publicUrl);
      onUploaded(path);
      toast.success('Imagem carregada com sucesso');
    } catch (e: any) {
      toast.error('Erro no envio: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.preventDefault();
    setPreviewUrl(null);
    onUploaded('');
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      {description && <p className="text-xs text-muted-foreground -mt-1">{description}</p>}

      <div className="relative group">
        <label className={`
          flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed
          transition-all duration-200 cursor-pointer overflow-hidden aspect-video
          ${previewUrl ? 'border-primary/40 bg-muted/30' : 'border-border hover:border-primary/40 hover:bg-primary/5'}
        `}>
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-sm font-bold">Clica para carregar</p>
                    <p className="text-[10px] opacity-70">PNG, JPG ou WebP até 5MB</p>
                  </div>
                </>
              )}
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>

        {previewUrl && !uploading && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={clear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
