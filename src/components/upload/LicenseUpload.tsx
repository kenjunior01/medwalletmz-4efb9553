import { useRef, useState } from 'react';
import { Upload, FileCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LicenseUploadProps {
  slot: string;
  label: string;
  description?: string;
  value?: string | null;
  onUploaded: (path: string) => void;
}

/**
 * Simple document upload for professional licenses / vehicle documents.
 * Stores files in the `licenses` bucket under the current user's folder.
 */
export function LicenseUpload({ slot, label, description, value, onUploaded }: LicenseUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? 'anon';
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${uid}/${slot}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('licenses').upload(path, file, { upsert: true });
      if (error) throw error;
      onUploaded(path);
      toast.success('Documento carregado');
    } catch (e: any) {
      console.error('[LicenseUpload]', e);
      toast.error(e.message || 'Erro ao carregar documento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A carregar...</>
          ) : value ? (
            <><FileCheck className="h-4 w-4 mr-2 text-primary" /> Substituir</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" /> Carregar ficheiro</>
          )}
        </Button>
        {value && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{value.split('/').pop()}</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}

export default LicenseUpload;