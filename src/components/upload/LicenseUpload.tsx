import { useCallback, useState } from 'react';
import { Upload, X } from '@/components/icons/lucide-compat';

interface LicenseUploadProps {
  slot: string;
  label: string;
  description: string;
  value?: string;
  onUploaded?: (url: string) => void;
}

export function LicenseUpload({ slot, label, description, value, onUploaded }: LicenseUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = URL.createObjectURL(file);
      onUploaded?.(url);
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  return (
    <div className="rounded-2xl border-2 border-dashed border-primary/20 p-4 text-center">
      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm font-bold">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      {value && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-primary">
          <span>✓ Carregado</span>
          <X className="h-3 w-3 cursor-pointer" onClick={() => onUploaded?.('')} />
        </div>
      )}
      {!value && (
        <label className="mt-3 inline-block cursor-pointer rounded-xl bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors">
          {uploading ? 'A enviar...' : 'Escolher ficheiro'}
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
        </label>
      )}
    </div>
  );
}
