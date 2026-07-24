import { useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LogoUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  label?: string;
  maxSizeMB?: number;
}

export function LogoUpload({ value, onChange, label = "Carregar logo", maxSizeMB = 2 }: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Ficheiro demasiado grande (máx {maxSizeMB}MB)`);
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
      <div className="relative inline-block">
        <div className="h-20 w-20 rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center">
          <img src={preview} alt="Logo" className="h-full w-full object-cover" />
        </div>
        <Button
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
          onClick={remove}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <label className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-4 cursor-pointer transition-colors",
        error && "border-destructive"
      )}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">PNG, JPG (máx {maxSizeMB}MB)</span>
        <input type="file" accept=".png,.jpg,.jpeg" onChange={handleFile} className="hidden" />
      </label>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
