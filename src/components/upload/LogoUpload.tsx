/**
 * LogoUpload — Logo upload component for establishments
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, X, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LogoUploadProps {
  label: string;
  description?: string;
  value?: string | null;
  onUploaded: (path: string) => void;
  bucket?: string;
  folder?: string;
  maxSizeMB?: number;
}

export function LogoUpload({
  label,
  description,
  value,
  onUploaded,
  bucket = 'licenses',
  folder = 'business-logos',
  maxSizeMB = 5,
}: LogoUploadProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleFile = useCallback(async (file: File) => {
    if (!user) {
      toast.error('É preciso iniciar sessão');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Ficheiro muito grande. Máx ${maxSizeMB}MB`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/${folder}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(data.publicUrl);
      setPreview(data.publicUrl);
      toast.success('Logotipo enviado');
    } catch (err: any) {
      console.error('Logo upload error:', err);
      toast.error('Falha no envio');
    } finally {
      setUploading(false);
    }
  }, [user, folder, bucket, maxSizeMB, onUploaded]);

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
        accept="image/*"
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
            className="relative border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-3 flex items-center gap-3"
          >
            <img src={preview} alt="Logotipo" className="w-16 h-16 rounded-xl object-cover bg-white" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Logotipo enviado</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs text-emerald-600 underline"
              >
                Substituir
              </button>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remover logotipo"
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
              <Loader2 className="h-8 w-8 text-primary animate-spin" aria-hidden="true" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            )}
            <p className="text-sm font-bold">{uploading ? 'A enviar...' : 'Enviar logotipo'}</p>
            <p className="text-[10px] text-muted-foreground">PNG/JPG · máx {maxSizeMB}MB</p>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
