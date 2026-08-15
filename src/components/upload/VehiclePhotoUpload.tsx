import { FileUploadField } from './FileUploadField';

export type VehiclePhotos = {
  front?: string | null;
  side?: string | null;
  back?: string | null;
  interior?: string | null;
};

export interface VehiclePhotoUploadProps {
  driverId?: string;
  photos?: VehiclePhotos;
  required?: string[];
  className?: string;
  onChange?: (photos: VehiclePhotos) => void;
  onFileSelect?: (file: File) => void;
}

const SLOTS: { key: keyof VehiclePhotos; label: string }[] = [
  { key: 'front', label: 'Frente' },
  { key: 'side', label: 'Lateral' },
  { key: 'back', label: 'Traseira' },
  { key: 'interior', label: 'Interior' },
];

export function VehiclePhotoUpload({ photos = {}, required = [], className, onChange }: VehiclePhotoUploadProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className || ''}`}>
      {SLOTS.map(({ key, label }) => (
        <FileUploadField
          key={key}
          label={`${label}${required.includes(key) ? ' *' : ''}`}
          value={photos[key]}
          bucket="licenses"
          folder={`vehicle/${key}`}
          accept="image/*"
          onUploaded={(url) => onChange?.({ ...photos, [key]: url })}
        />
      ))}
    </div>
  );
}
