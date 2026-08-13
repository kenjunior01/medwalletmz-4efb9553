import { useRef, useState } from 'react';
import { Upload } from '@/components/icons/lucide-compat';
import { cn } from '@/lib/utils';

interface LogoUploadProps {
  onFileSelect?: (file: File) => void;
  label?: string;
  accept?: string;
  className?: string;
}

export function LogoUpload({ onFileSelect, label = 'Carregar logo', accept = 'image/*', className }: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      onFileSelect?.(file);
    }
  };

  return (
    <div className={cn("border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors cursor-pointer", className)} onClick={() => inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      {preview ? (
        <img src={preview} alt="Preview" className="max-h-24 mx-auto rounded-lg object-contain" />
      ) : (
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
      )}
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}