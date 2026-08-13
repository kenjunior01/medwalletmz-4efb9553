import { useRef, useState } from 'react';
import { Upload } from '@/components/icons/lucide-compat';
import { cn } from '@/lib/utils';

interface LicenseUploadProps {
  onFileSelect?: (file: File) => void;
  label?: string;
  accept?: string;
  className?: string;
}

export function LicenseUpload({ onFileSelect, label = 'Carregar licença', accept = 'image/*,.pdf', className }: LicenseUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect?.(file);
    }
  };

  return (
    <div className={cn("border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer", className)} onClick={() => inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      {fileName ? (
        <p className="text-xs font-medium text-primary">{fileName}</p>
      ) : (
        <>
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </>
      )}
    </div>
  );
}