import { FileUploadField } from './FileUploadField';

export interface LicenseUploadProps {
  slot?: string;
  label?: string;
  description?: string;
  value?: string | null;
  accept?: string;
  className?: string;
  onUploaded?: (url: string) => void;
  onFileSelect?: (file: File) => void;
}

export function LicenseUpload({ slot = 'license', label = 'Carregar licença', description, value, accept = 'image/*,.pdf', className, onUploaded }: LicenseUploadProps) {
  return (
    <FileUploadField
      label={label}
      description={description}
      value={value}
      bucket="licenses"
      folder={slot}
      accept={accept}
      className={className}
      onUploaded={onUploaded}
    />
  );
}
