import { ImageIcon, Info, ChevronRight } from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { VehiclePhotoUpload } from '@/components/upload';
import { FormData, Role } from './types';

interface StepVehiclePhotosProps {
  formData: FormData;
  handleInputChange: (field: string, value: any) => void;
  selectedRole: Role;
  userId?: string;
  nextStep: () => void;
}

export function StepVehiclePhotos({ formData, handleInputChange, selectedRole, userId, nextStep }: StepVehiclePhotosProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
          <ImageIcon className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-black">Fotos do Veiculo</h2>
          <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">
            Frente e traseira obrigatórias para {formData.vehicleType === 'bicycle' ? 'bicicleta' : formData.vehicleType === 'motorcycle' ? 'mota' : 'carro'}
          </p>
        </div>
      </div>

      {formData.vehicleType === 'bicycle' ? (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-blue-800">Bicicletas não necessitam de fotos do veículo</p>
            <p className="text-[10px] text-blue-700/70 mt-0.5">Pode avançar directamente para os documentos.</p>
          </div>
        </div>
      ) : (
        <VehiclePhotoUpload
          driverId={userId}
          photos={{
            front: formData.vehiclePhotoFront,
            side: formData.vehiclePhotoSide,
            back: formData.vehiclePhotoBack,
            interior: formData.vehiclePhotoInterior,
          }}
          onChange={(p) => {
            handleInputChange('vehiclePhotoFront', p.front);
            handleInputChange('vehiclePhotoSide', p.side);
            handleInputChange('vehiclePhotoBack', p.back);
            handleInputChange('vehiclePhotoInterior', p.interior);
          }}
          required={formData.vehicleType !== 'bicycle' ? ['front', 'back'] : []}
        />
      )}

      <Button
        className="w-full h-16 rounded-[2rem] font-black text-lg shadow-premium mt-8"
        onClick={nextStep}
        disabled={
          formData.vehicleType !== 'bicycle' &&
          (!formData.vehiclePhotoFront || !formData.vehiclePhotoBack)
        }
      >
        Documentos do Condutor <ChevronRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}
