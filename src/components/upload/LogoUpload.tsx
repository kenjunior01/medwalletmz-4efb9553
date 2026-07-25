import { useRef, useState } from 'react';
import { Upload, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LogoUploadProps {
  label: string;
  description?: string;
  value?: string | null;
  onUploaded: (url: string) => void;
}

/**
 * Uploads a logo/image to the public `logos` bucket and returns the public URL.
 */
export function LogoUpload({ label, description, value, onUploaded }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? 'anon';
      const ext = file.name.split('.').pop() || 'png';
      const path = `${uid}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('logos').getPublicUrl(path);
      onUploaded(pub.publicUrl);
      toast.success('Logotipo carregado');
    } catch (e: any) {
      console.error('[LogoUpload]', e);
      toast.error(e.message || 'Erro ao carregar logotipo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="Logo" className="h-16 w-16 rounded-lg object-cover border" />
        ) : (
          <div className="h-16 w-16 rounded-lg border border-dashed flex items-center justify-center bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A carregar...</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" /> {value ? 'Substituir' : 'Carregar'}</>
          )}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}

export default LogoUpload;