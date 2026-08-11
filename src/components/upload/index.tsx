// Stub upload components — TODO: implement actual upload UI
export function LicenseUpload({ onChange, value, ...props }: any) {
  return <input type="file" accept="image/*" onChange={(e) => onChange?.(e.target.files?.[0])} {...props} />;
}
export function LogoUpload({ onChange, value, ...props }: any) {
  return <input type="file" accept="image/*" onChange={(e) => onChange?.(e.target.files?.[0])} {...props} />;
}
export function VehiclePhotoUpload({ onChange, value, ...props }: any) {
  return <input type="file" accept="image/*" capture="environment" onChange={(e) => onChange?.(e.target.files?.[0])} {...props} />;
}
