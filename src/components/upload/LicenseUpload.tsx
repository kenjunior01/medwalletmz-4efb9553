import React, { useRef } from 'react';
import { Upload } from '@/components/icons/lucide-compat';

interface LicenseUploadProps {
  onUpload: (file: File) => void;
  accept?: string;
  label?: string;
}

export function LicenseUpload({ onUpload, accept = 'image/*,.pdf', label = 'Carregar Licença' }: LicenseUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="h-8 w-8 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </div>
  );
}

export default LicenseUpload;
