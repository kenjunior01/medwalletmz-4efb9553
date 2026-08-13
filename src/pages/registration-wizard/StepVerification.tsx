import { ShieldCheck, Sparkles, Info, Loader2, CheckCircle2 } from '@/components/icons/lucide-compat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card as ShadcnCard } from '@/components/ui/card';
import { LicenseUpload, LogoUpload } from '@/components/upload';
import { FormData, Role } from './types';

interface StepVerificationProps {
  formData: FormData;
  handleInputChange: (field: string, value: any) => void;
  selectedRole: Role;
  country: any;
  loading: boolean;
  submitRegistration: () => void;
}

export function StepVerification({ formData, handleInputChange, selectedRole, country, loading, submitRegistration }: StepVerificationProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      <ShadcnCard className="p-6 border-2 border-primary/20 bg-primary/5 rounded-[2rem]">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Verificação de Segurança</h3>
            <p className="text-xs text-muted-foreground">Para garantir a segurança dos pacientes, precisamos validar a sua licença profissional ou do estabelecimento.</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-[8px] bg-primary/5 text-primary border-primary/20 font-black">
                <Sparkles className="h-2 w-2 mr-1" /> GOOGLE DOCUMENT AI READY
              </Badge>
            </div>
          </div>
        </div>
      </ShadcnCard>

      <div className="space-y-6">
        {selectedRole === 'driver' ? (
          <>
            <LicenseUpload
              slot="carta"
              label="Carta de Condução *"
              description="Upload da frente (Foto/PDF)"
              value={formData.licenseCartaUrl}
              onUploaded={(p) => handleInputChange('licenseCartaUrl', p)}
            />
            {formData.vehicleType !== 'bicycle' && (
              <LicenseUpload
                slot="viatura"
                label="Livrete / Registo do Veículo *"
                description="Documento oficial da viatura"
                value={formData.licenseViaturaUrl}
                onUploaded={(p) => handleInputChange('licenseViaturaUrl', p)}
              />
            )}
          </>
        ) : (
          <LicenseUpload
            slot="registration-license"
            label={selectedRole === 'doctor' ? "Cédula Profissional / Alvará *" : "Licença Sanitária / MISAU *"}
            description="Carregue uma foto ou PDF nítido"
            value={formData.licenseUrl}
            onUploaded={(p) => handleInputChange('licenseUrl', p)}
          />
        )}

        {(selectedRole === 'clinic' || selectedRole === 'store_owner' || selectedRole === 'laboratory') && (
          <LogoUpload
            label="Logotipo do Estabelecimento"
            description="Aparecerá no perfil público"
            value={formData.logoUrl}
            onUploaded={(p) => handleInputChange('logoUrl', p)}
            bucket="licenses"
            folder="business-logos"
          />
        )}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 mt-4">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[10px] text-amber-800 font-black leading-tight uppercase tracking-wider">
            O seu perfil passará por uma curadoria manual pelo Gestor Regional de {country?.name || 'MedWallet'}.
          </p>
          <p className="text-[9px] text-amber-700/70 font-bold uppercase tracking-tighter">
            Tempo estimado: 2 a 24 horas úteis.
          </p>
        </div>
      </div>

      <Button
        className="w-full h-16 rounded-[2rem] font-black text-lg shadow-premium mt-8 bg-primary"
        onClick={submitRegistration}
        disabled={loading || (selectedRole === 'driver' ? !formData.licenseCartaUrl : !formData.licenseUrl)}
      >
        {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (
          <span className="flex items-center gap-2">
            Finalizar Registo <CheckCircle2 className="h-5 w-5" />
          </span>
        )}
      </Button>
    </div>
  );
}
