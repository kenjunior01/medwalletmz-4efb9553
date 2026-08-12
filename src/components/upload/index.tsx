import { useRef, useState } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle2 } from '@/components/icons/lucide-compat';
import { uploadImageToStorage } from '@/lib/imageUpload';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// LicenseUpload — single file upload (photo or PDF)
// ---------------------------------------------------------------------------

interface LicenseUploadProps {
  slot?: string;
  label: string;
  description?: string;
  value?: string;
  onUploaded?: (url: string) => void;
}

export function LicenseUpload({ label, description, value, onUploaded }: LicenseUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const path = await uploadImageToStorage(file, { bucket: 'licenses', folder: 'registration' });
      const { data } = supabase.storage.from('licenses').getPublicUrl(path);
      const url = data.publicUrl;
      setPreview(url);
      onUploaded?.(url);
    } catch (err) {
      console.error('[LicenseUpload] Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-foreground">{label}</label>
      {description && (
        <p className="text-[11px] text-muted-foreground">{description}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFile}
      />

      {preview ? (
        <div className="relative rounded-2xl border-2 border-primary/20 overflow-hidden bg-card">
          {preview.endsWith('.pdf') ? (
            <div className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">Documento carregado</span>
              <button
                type="button"
                onClick={() => { setPreview(null); onUploaded?.(''); if (inputRef.current) inputRef.current.value = ''; }}
                className="ml-auto p-1 rounded-full hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <img src={preview} alt={label} className="w-full h-40 object-cover" />
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/25 p-6 transition-colors',
            'hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]',
            'disabled:opacity-50 disabled:pointer-events-none'
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-muted-foreground">
            {uploading ? 'A carregar...' : 'Toque para carregar'}
          </span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LogoUpload — business logo upload
// ---------------------------------------------------------------------------

interface LogoUploadProps {
  label: string;
  description?: string;
  value?: string;
  onUploaded?: (url: string) => void;
  bucket?: string;
  folder?: string;
}

export function LogoUpload({ label, description, value, onUploaded, bucket = 'licenses', folder = 'business-logos' }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const path = await uploadImageToStorage(file, { bucket, folder });
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const url = data.publicUrl;
      setPreview(url);
      onUploaded?.(url);
    } catch (err) {
      console.error('[LogoUpload] Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-foreground">{label}</label>
      {description && (
        <p className="text-[11px] text-muted-foreground">{description}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'w-20 h-20 rounded-2xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center shrink-0 transition-colors',
            'hover:border-primary/50 hover:bg-primary/5',
            'disabled:opacity-50'
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          ) : preview ? (
            <img src={preview} alt={label} className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <Camera className="h-6 w-6 text-muted-foreground" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {preview ? 'Logotipo carregado' : 'Adicionar logotipo'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {uploading ? 'A carregar...' : 'PNG, JPG — máx. 10 MB'}
          </p>
          {preview && (
            <button
              type="button"
              onClick={() => { setPreview(null); onUploaded?.(''); if (inputRef.current) inputRef.current.value = ''; }}
              className="text-[11px] text-destructive font-semibold mt-1"
            >
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VehiclePhotoUpload — multi-photo upload for drivers
// ---------------------------------------------------------------------------

interface VehiclePhotos {
  front?: string;
  side?: string;
  back?: string;
  interior?: string;
}

interface VehiclePhotoUploadProps {
  driverId?: string;
  photos: VehiclePhotos;
  onChange: (photos: VehiclePhotos) => void;
  required?: string[];
}

const PHOTO_SLOTS = [
  { key: 'front' as const, label: 'Frente', icon: '🚗' },
  { key: 'side' as const, label: 'Lateral', icon: '📸' },
  { key: 'back' as const, label: 'Traseira', icon: '🔄' },
  { key: 'interior' as const, label: 'Interior', icon: '💺' },
];

export function VehiclePhotoUpload({ photos, onChange, required = [] }: VehiclePhotoUploadProps) {
  const [uploading, setUploading] = useState<string | null>(null);

  const handleUpload = async (key: keyof VehiclePhotos, file: File) => {
    setUploading(key);
    try {
      const path = await uploadImageToStorage(file, { bucket: 'licenses', folder: 'vehicle-photos' });
      const { data } = supabase.storage.from('licenses').getPublicUrl(path);
      onChange({ ...photos, [key]: data.publicUrl });
    } catch (err) {
      console.error(`[VehiclePhotoUpload] ${key} upload failed:`, err);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {PHOTO_SLOTS.map(({ key, label, icon }) => {
          const isRequired = required.includes(key);
          const hasPhoto = !!photos[key];
          const isUploading = uploading === key;

          return (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1">
                <span>{icon}</span> {label}
                {isRequired && <span className="text-destructive">*</span>}
              </label>

              <PhotoSlot
                preview={photos[key]}
                uploading={isUploading}
                onPick={(file) => handleUpload(key, file)}
                onRemove={() => onChange({ ...photos, [key]: undefined })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PhotoSlot — reusable photo capture/upload slot
// ---------------------------------------------------------------------------

interface PhotoSlotProps {
  preview?: string;
  uploading?: boolean;
  onPick: (file: File) => void;
  onRemove?: () => void;
}

function PhotoSlot({ preview, uploading, onPick, onRemove }: PhotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />

      {preview ? (
        <div className="relative rounded-2xl overflow-hidden h-24 bg-card border border-border">
          <img src={preview} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
          >
            <X className="h-3 w-3 text-white" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'w-full h-24 rounded-2xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 transition-colors',
            'hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]',
            'disabled:opacity-50'
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-[10px] font-semibold text-muted-foreground">
            {uploading ? 'A carregar...' : 'Foto'}
          </span>
        </button>
      )}
    </>
  );
}