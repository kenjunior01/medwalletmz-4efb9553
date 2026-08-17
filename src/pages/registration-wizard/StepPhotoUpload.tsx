import { Camera, ChevronRight } from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FormData, Role, roleOptions } from './types';

interface StepPhotoUploadProps {
  formData: FormData;
  handleInputChange: (field: string, value: any) => void;
  selectedRole: Role;
  uploadAvatar: (file: File) => Promise<string>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  nextStep: () => void;
}

export function StepPhotoUpload({ formData, handleInputChange, selectedRole, uploadAvatar, loading, setLoading, nextStep }: StepPhotoUploadProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
          <Camera className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-black">Foto de Perfil</h2>
          <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">
            {selectedRole === 'driver' ? 'Identificação facial obrigatória' : 'Passo opcional para ' + roleOptions.find(r => r.id === selectedRole)?.title}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="avatar-upload"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              setLoading(true);
              const url = await uploadAvatar(file);
              handleInputChange('avatarUrl', url);
              toast.success('Foto carregada com sucesso!');
            } catch (err: any) {
              toast.error(err.message || 'Erro ao carregar foto');
            } finally {
              setLoading(false);
            }
          }}
        />
        <label
          htmlFor="avatar-upload"
          className={cn(
            "w-[120px] h-[120px] rounded-full flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden",
            formData.avatarUrl
              ? "border-2 border-primary shadow-lg"
              : selectedRole === 'driver'
                ? "border-2 border-red-400 border-dashed bg-red-50"
                : "border-2 border-slate-300 border-dashed bg-slate-50 hover:border-primary/50"
          )}
        >
          {formData.avatarUrl ? (
            <img
              src={formData.avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <Camera className={cn("h-8 w-8", selectedRole === 'driver' ? "text-red-400" : "text-muted-foreground")} />
              <span className={cn("text-[10px] mt-1 font-bold", selectedRole === 'driver' ? "text-red-400" : "text-muted-foreground")}>
                Adicionar
              </span>
            </>
          )}
        </label>

        {selectedRole === 'driver' ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center max-w-xs">
            <p className="text-xs font-black text-red-700">⚠️ OBRIGATÓRIO — Foto do rosto para identificação</p>
            <p className="text-[10px] text-red-600/70 mt-1">Sera utilizada para confirmar sua identidade nas entregas</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">Opcional — Adicione uma foto profissional</p>
        )}
      </div>

      <Button
        className="w-full h-16 rounded-[2rem] font-black text-lg shadow-premium mt-8"
        onClick={nextStep}
        disabled={selectedRole === 'driver' ? !formData.avatarUrl : false}
      >
        Próximo Passo <ChevronRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}
