import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Upload, Check, X, FileText } from '@/components/icons/lucide-compat';
import { logError, logInfo, newRequestId } from '@/lib/logger';
import { ensureFreshSession } from '@/lib/authSession';

export interface FileUploadFieldProps {
  label: string;
  description?: string;
  value?: string | null;
  onUploaded: (path: string) => void;
  bucket?: string;
  folder?: string;
  accept?: string;
  maxSizeMb?: number;
}

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,application/pdf';

export function FileUploadField({
  label,
  description,
  value,
  onUploaded,
  bucket = 'licenses',
  folder = 'documents',
  accept = DEFAULT_ACCEPT,
  maxSizeMb = 10,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const requestId = newRequestId('upload');
      setLastRequestId(requestId);
      setUploading(true);
      try {
        if (file.size > maxSizeMb * 1024 * 1024) {
          throw new Error(`O ficheiro deve ter no máximo ${maxSizeMb} MB`);
        }

        // Garante sessão válida — o bucket exige utilizador autenticado
        const { session } = await ensureFreshSession(requestId);
        if (!session?.user) {
          throw new Error('Sessão expirada. Inicie sessão novamente para enviar documentos.');
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        // Primeiro segmento = user id (exigido pelas políticas de armazenamento)
        const path = `${session.user.id}/${folder}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        logInfo('upload', 'A iniciar envio', { bucket, path, size: file.size, type: file.type }, requestId);

        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });

        if (error) throw error;

        logInfo('upload', 'Envio concluído', { bucket, path }, requestId);

        if (file.type.startsWith('image/')) {
          setPreview(URL.createObjectURL(file));
        } else {
          setPreview(null);
        }
        onUploaded(path);
        toast.success('Documento enviado com sucesso');
      } catch (err: any) {
        logError('upload', 'Falha no envio', err, requestId);
        toast.error('Erro no envio', {
          description: `${err?.message || 'Tente novamente'} (ref: ${requestId})`,
        });
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [bucket, folder, maxSizeMb, onUploaded],
  );

  const hasValue = Boolean(value);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">{label}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {hasValue && (
          <span className="flex items-center gap-1 text-xs font-bold text-primary">
            <Check className="h-3 w-3" /> Enviado
          </span>
        )}
      </div>

      {preview && (
        <img src={preview} alt={`Pré-visualização de ${label}`} className="h-28 w-full object-cover rounded-xl" />
      )}
      {!preview && hasValue && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-4 w-4" /> <span className="truncate">{value}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-label={label}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant={hasValue ? 'outline' : 'default'}
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'A enviar…' : hasValue ? 'Substituir' : 'Carregar'}
        </Button>
        {hasValue && !uploading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => {
              setPreview(null);
              onUploaded('');
            }}
          >
            <X className="h-4 w-4" /> Remover
          </Button>
        )}
      </div>
      {lastRequestId && <p className="text-[10px] text-muted-foreground">ref: {lastRequestId}</p>}
    </div>
  );
}