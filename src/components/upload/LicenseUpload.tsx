/**
 * LicenseUpload — File upload component for licenses/permits
 * Used in RegistrationWizard for doctor/clinic/driver licenses.
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, CheckCircle2, X, AlertCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LicenseUploadProps {
  slot: string;
  label: string;
  description?: string;
  value?: string | null;
  onUploaded: (path: string) => void;
  bucket?: string;
  folder?: string;
  accept?: string;
  maxSizeMB?: number;
}

export function LicenseUpload({
  slot,
  label,
  description,
  value,
  onUploaded,
  bucket = 'licenses',
  folder = 'documents',
  accept = 'image/*,.pdf',
  maxSizeMB = 10,
}: LicenseUploadProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleFile = useCallback(async (file: File) => {
    if (!user) {
      toast.error('É preciso iniciar sessão para enviar documentos');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Ficheiro muito grande. Máx ${maxSizeMB}MB`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${user.id}/${folder}/${slot}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(data.publicUrl);
      setPreview(data.publicUrl);
      toast.success('Documento enviado com sucesso');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Falha no envio');
      toast.error('Falha no envio do documento');
    } finally {
      setUploading(false);
    }
  }, [user, slot, folder, bucket, maxSizeMB, onUploaded]);

  const handleRemove = () => {
    setPreview(null);
    onUploaded('');
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold block">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="uploaded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-4 flex items-center gap-3"
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-600 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Documento enviado</p>
              <a href={preview} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline truncate block">
                Ver ficheiro
              </a>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remover documento"
              className="p-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="upload"
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-colors min-h-[120px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              uploading ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30'
            )}
            aria-label={label}
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-primary animate-spin" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">A enviar...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-bold">Clique para enviar</p>
                <p className="text-[10px] text-muted-foreground">Foto ou PDF · máx {maxSizeMB}MB</p>
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive" role="alert">
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}
