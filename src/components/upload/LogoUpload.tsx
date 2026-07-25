import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';

interface LogoUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  bucket?: string;
  disabled?: boolean;
  className?: string;
}

export function LogoUpload({
  value,
  onChange,
  label = 'Upload Logo',
  accept = 'image/*',
  maxSizeMB = 2,
  bucket = 'logos',
  disabled = false,
  className,
}: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(urlData.publicUrl);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
    setError(null);
  };

  if (value) {
    return (
      <div className={`relative inline-block ${className || ''}`}>
        <img
          src={value}
          alt="Logo"
          className="h-16 w-16 rounded-xl object-cover border"
        />
        {!disabled && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
            >
              <Camera className="h-3 w-3" />
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-red-500 text-white hover:bg-red-600"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading || disabled}
        className="gap-2"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        {uploading ? 'Uploading...' : label}
      </Button>
      {error && (
        <div className="flex items-center gap-1 text-red-500">
          <AlertCircle className="h-3 w-3" />
          <span className="text-[10px]">{error}</span>
        </div>
      )}
    </div>
  );
}
