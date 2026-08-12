import { FileUploadField } from './FileUploadField';

export { FileUploadField } from './FileUploadField';

export interface LicenseUploadProps {
  slot?: string;
  label: string;
  description?: string;
  value?: string | null;
  onUploaded: (path: string) => void;
  bucket?: string;
  folder?: string;
}

export function LicenseUpload({
  slot = 'license',
  label,
  description,
  value,
  onUploaded,
  bucket = 'licenses',
  folder,
}: LicenseUploadProps) {
  return (
    <FileUploadField
      label={label}
      description={description}
      value={value}
      onUploaded={onUploaded}
      bucket={bucket}
      folder={folder || `licenses/${slot}`}
    />
  );
}

export interface LogoUploadProps {
  label: string;
  description?: string;
  value?: string | null;
  onUploaded: (path: string) => void;
  bucket?: string;
  folder?: string;
}

export function LogoUpload({
  label,
  description,
  value,
  onUploaded,
  bucket = 'licenses',
  folder = 'logos',
}: LogoUploadProps) {
  return (
    <FileUploadField
      label={label}
      description={description}
      value={value}
      onUploaded={onUploaded}
      bucket={bucket}
      folder={folder}
      accept="image/png,image/jpeg,image/jpg,image/webp"
      maxSizeMb={5}
    />
  );
}

export interface VehiclePhotos {
  front?: string | null;
  side?: string | null;
  back?: string | null;
  interior?: string | null;
}

export interface VehiclePhotoUploadProps {
  driverId?: string | null;
  photos: VehiclePhotos;
  onChange: (photos: VehiclePhotos) => void;
  /** Slots obrigatórios (marcados com *) */
  required?: string[];
}

const VEHICLE_SLOTS: { key: keyof VehiclePhotos; label: string; description: string }[] = [
  { key: 'front', label: 'Frente do veículo *', description: 'Matrícula visível' },
  { key: 'side', label: 'Lateral do veículo *', description: 'Vista completa de lado' },
  { key: 'back', label: 'Traseira do veículo', description: 'Matrícula traseira' },
  { key: 'interior', label: 'Interior', description: 'Bancos e área de carga' },
];

export function VehiclePhotoUpload({ driverId, photos, onChange, required }: VehiclePhotoUploadProps) {
  const isRequired = (key: string) => (required ? required.includes(key) : false);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {VEHICLE_SLOTS.map((slot) => (
        <FileUploadField
          key={slot.key}
          label={isRequired(slot.key) ? `${slot.label.replace(' *', '')} *` : slot.label.replace(' *', '')}
          description={slot.description}
          value={photos[slot.key]}
          bucket="licenses"
          folder={`vehicles/${driverId || 'pending'}/${slot.key}`}
          accept="image/png,image/jpeg,image/jpg,image/webp"
          maxSizeMb={8}
          onUploaded={(path) => onChange({ ...photos, [slot.key]: path })}
        />
      ))}
    </div>
  );
}