import { FileUploadField } from './FileUploadField';

export interface LogoUploadProps {
  label?: string;
  description?: string;
  value?: string | null;
  bucket?: string;
  folder?: string;
  className?: string;
  onUploaded?: (url: string) => void;
  onFileSelect?: (file: File) => void;
}

export function LogoUpload({ label = 'Carregar logotipo', description, value, bucket = 'avatars', folder = 'logos', className, onUploaded }: LogoUploadProps) {
  return (
    <FileUploadField
      label={label}
      description={description}
      value={value}
      bucket={bucket}
      folder={folder}
      accept="image/*"
      className={className}
      onUploaded={onUploaded}
    />
  );
}
