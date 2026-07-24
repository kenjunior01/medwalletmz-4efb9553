import { useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LicenseUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
}

export function LicenseUpload({ value, onChange, label = "Carregar documento", accept = ".pdf,.jpg,.jpeg,.png", maxSizeMB = 5 }: LicenseUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Ficheiro demasiado grande (máx ${maxSizeMB}MB)`);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange?.(url);
  };

  const remove = () => {
    setPreview(null);
    onChange?.("");
  };

  if (preview) {
    return (
      <div className="relative rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-3 p-3">
          <FileText className="h-8 w-8 text-primary shrink-0" />
          <span className="text-sm font-medium truncate flex-1">Documento carregado</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={remove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-6 cursor-pointer transition-colors",
        error && "border-destructive"
      )}>
        <Upload className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">PDF, JPG, PNG (máx {maxSizeMB}MB)</span>
        <input type="file" accept={accept} onChange={handleFile} className="hidden" />
      </label>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
