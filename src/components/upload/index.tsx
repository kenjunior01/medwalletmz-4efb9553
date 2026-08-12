import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2 } from '@/components/icons/lucide-compat';
import { uploadImageToStorage } from '@/lib/imageUpload';

// =========================================================================
// LicenseUpload — single-file upload (photo/PDF) for licenses, permits, etc.
// =========================================================================
interface LicenseUploadProps {
  slot?: string;
  label: string;
  description?: string;
  value?: string;
  onUploaded: (url: string) => void;
  accept?: string;
  bucket?: string;
}

export function LicenseUpload({
  slot,
  label,
  description,
  value,
  onUploaded,
  accept = 'image/*,.pdf',
  bucket = 'licenses',
}: LicenseUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const path = await uploadImageToStorage(file, { bucket, folder: slot || 'licenses' });
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch (e: any) {
      setError(e?.message || 'Erro no upload');
    } finally {
      setUploading(false);
    }
  }, [bucket, slot, onUploaded]);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30">
          {value.endsWith('.pdf') ? (
            <div className="flex items-center gap-3 p-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="text-red-600 dark:text-red-400 text-xs font-bold">PDF</span>
              </div>
              <span className="text-xs text-muted-foreground truncate flex-1">Documento carregado</span>
              <button
                type="button"
                onClick={() => onUploaded('')}
                className="p-1 rounded-lg hover:bg-destructive/10 text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <img src={value} alt={label} className="w-full h-32 object-cover" />
          )}
          <button
            type="button"
            onClick={() => onUploaded('')}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full min-h-[100px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {uploading ? 'Enviando...' : 'Toque para carregar'}
          </span>
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// =========================================================================
// LogoUpload — single-image upload for logos / avatars
// =========================================================================
interface LogoUploadProps {
  label: string;
  description?: string;
  value?: string;
  onUploaded: (url: string) => void;
  bucket?: string;
  folder?: string;
  className?: string;
}

export function LogoUpload({
  label,
  description,
  value,
  onUploaded,
  bucket = 'licenses',
  folder = 'logos',
  className = '',
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const path = await uploadImageToStorage(file, { bucket, folder });
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch (e: any) {
      setError(e?.message || 'Erro no upload');
    } finally {
      setUploading(false);
    }
  }, [bucket, folder, onUploaded]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            className={`w-20 h-20 rounded-xl object-cover border border-border ${className}`}
          />
          <button
            type="button"
            onClick={() => onUploaded('')}
            className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-destructive text-destructive-foreground shadow-md"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`flex items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors disabled:opacity-50 ${className}`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <Camera className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// =========================================================================
// VehiclePhotoUpload — multi-photo upload for driver vehicle registration
// =========================================================================
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
}

const VEHICLE_SLOTS: { key: keyof VehiclePhotos; label: string; placeholder: string }[] = [
  { key: 'front', label: 'Frente', placeholder: 'Foto da frente do veículo' },
  { key: 'side', label: 'Lateral', placeholder: 'Foto lateral do veículo' },
  { key: 'back', label: 'Traseira', placeholder: 'Foto da traseira do veículo' },
  { key: 'interior', label: 'Interior', placeholder: 'Foto do interior do veículo' },
];

function VehiclePhotoSlot({
  slot,
  value,
  onUploaded,
}: {
  slot: { key: keyof VehiclePhotos; label: string; placeholder: string };
  value?: string;
  onUploaded: (key: keyof VehiclePhotos, url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const path = await uploadImageToStorage(file, { bucket: 'licenses', folder: 'vehicles' });
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(slot.key, data.publicUrl);
    } catch (e) {
      console.error('Vehicle photo upload error:', e);
    } finally {
      setUploading(false);
    }
  }, [slot.key, onUploaded]);

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{slot.label}</label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          <img src={value} alt={slot.label} className="w-full h-24 object-cover" />
          <button
            type="button"
            onClick={() => onUploaded(slot.key, '')}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full min-h-[80px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <Camera className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="text-[10px] text-muted-foreground">{slot.placeholder}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function VehiclePhotoUpload({ photos, onChange }: VehiclePhotoUploadProps) {
  const handleUploaded = useCallback(
    (key: keyof VehiclePhotos, url: string) => {
      onChange({ ...photos, [key]: url || undefined });
    },
    [photos, onChange],
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      {VEHICLE_SLOTS.map((slot) => (
        <VehiclePhotoSlot
          key={slot.key}
          slot={slot}
          value={photos[slot.key]}
          onUploaded={handleUploaded}
        />
      ))}
    </div>
  );
}
