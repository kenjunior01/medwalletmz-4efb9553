import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingLayout } from '@/components/layout/OnboardingLayout';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
import { Role, FormData, roleOptions } from './types';
import { StepRoleSelection } from './StepRoleSelection';
import { StepIdentity } from './StepIdentity';
import { StepPhotoUpload } from './StepPhotoUpload';
import { StepSpecificInfo } from './StepSpecificInfo';
import { StepVehiclePhotos } from './StepVehiclePhotos';
import { StepVerification } from './StepVerification';

export default function RegistrationWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, roles, refreshRoles } = useAuth();
  const { country } = useCountry();

  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [specialties, setSpecialties] = useState<any[]>([]);

  // Verifica se o utilizador já tem o papel que está a tentar registar
  useEffect(() => {
    if (user && selectedRole && roles.includes(selectedRole as any)) {
      toast.info(`Você já está registado como ${roleOptions.find(r => r.id === selectedRole)?.title}.`);

      // Redireciona para o dashboard apropriado
      const dashboardMap: Record<string, string> = {
        doctor: '/doctor/dashboard',
        store_owner: '/store/dashboard',
        clinic: '/clinic/dashboard',
        laboratory: '/lab/dashboard',
        driver: '/driver/dashboard',
        insurance: '/insurance/dashboard',
        veterinary: '/health/veterinary'
      };

      navigate(dashboardMap[selectedRole] || '/');
    }
  }, [user, selectedRole, roles, navigate]);

  // Form States
  const [formData, setFormData] = useState<FormData>({
    // Common
    fullName: user?.user_metadata?.full_name || '',
    phone: '',
    city: country?.config?.cities?.[0] || 'Maputo',
    address: '',
    avatarUrl: '',

    // Doctor specific
    specialtyId: '',
    licenseNumber: '',
    bio: '',
    consultationFee: String(country?.config?.registration_defaults?.consultation_fee || 500),
    yearsExperience: '0',

    // Store/Clinic/Lab specific
    businessName: '',
    businessType: 'pharmacy',
    description: '',
    licenseUrl: '',
    logoUrl: '',
    deliveryTime: '30-45 min',
    deliveryFee: String(country?.config?.registration_defaults?.delivery_fee || 50),

    // Driver specific
    vehicleType: '',
    licensePlate: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleYear: '',
    licenseCartaUrl: '',
    licenseViaturaUrl: '',

    // Vehicle photos
    vehiclePhotoFront: null,
    vehiclePhotoSide: null,
    vehiclePhotoBack: null,
    vehiclePhotoInterior: null,
  });

  useEffect(() => {
    if (country) {
      setFormData(prev => ({
        ...prev,
        city: country.config?.cities?.[0] || prev.city,
        consultationFee: String(country.config?.registration_defaults?.consultation_fee || 500),
        deliveryFee: String(country.config?.registration_defaults?.delivery_fee || 50),
      }));
    }
  }, [country]);

  useEffect(() => {
    // Detect role from URL param or pathname
    const roleParam = searchParams.get('role') as Role;
    const path = window.location.pathname;

    let detectedRole: Role | null = null;
    if (roleParam && roleOptions.find(r => r.id === roleParam)) {
      detectedRole = roleParam;
    } else if (path.includes('/doctor/')) {
      detectedRole = 'doctor';
    } else if (path.includes('/store/') || path.includes('/pharmacy/')) {
      detectedRole = 'store_owner';
    } else if (path.includes('/clinic/') || path.includes('/hospital/')) {
      detectedRole = 'clinic';
    } else if (path.includes('/lab/')) {
      detectedRole = 'laboratory';
    } else if (path.includes('/insurance/')) {
      detectedRole = 'insurance';
    } else if (path.includes('/driver/')) {
      detectedRole = 'driver';
    }

    if (detectedRole) {
      setSelectedRole(detectedRole);
      setStep(2);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedRole === 'doctor') {
      supabase.from('medical_specialties').select('*').order('name').then(({ data }) => setSpecialties(data || []));
    }
  }, [selectedRole]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const uploadAvatar = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `registrations/${user!.id}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('avatars').upload(path, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    return publicUrl;
  };

  const nextStep = async () => {
    if (step === 1 && !selectedRole) return toast.error('Selecione um perfil');
    if (step === 2 && selectedRole !== 'customer' && !formData.fullName) return toast.error('Nome é obrigatório');
    if (step === 3 && selectedRole === 'driver' && !formData.avatarUrl) {
      toast.error('Foto do rosto é obrigatória para entregadores');
      return;
    }

    if (selectedRole === 'customer' && step === 1) {
      if (user) {
        try {
          await supabase.from('profiles').upsert({
            user_id: user.id,
            onboarding_completed: true,
            country_id: country?.id || 'MZ',
            full_name: formData.fullName || user.user_metadata?.full_name || user.email?.split('@')[0],
          }, { onConflict: 'user_id' });
        } catch (e) { /* non-blocking */ }
      }
      navigate('/');
      return;
    }

    setStep(prev => prev + 1);
  };

  const submitRegistration = async () => {
    if (!user) {
      toast.info('Crie a sua conta primeiro para continuarmos o seu registo profissional.');
      const params = new URLSearchParams({
        tab: 'register',
        mode: 'professional',
        next: `/register?role=${selectedRole ?? ''}`,
      });
      return navigate(`/auth?${params.toString()}`);
    }
    setLoading(true);
    try {
      // 1. Update Profile (common)
      await supabase.from('profiles').upsert({
        user_id: user.id,
        full_name: formData.fullName || user.user_metadata?.full_name || user.email?.split('@')[0],
        phone: formData.phone,
        country_id: country?.id || 'MZ',
        default_city: formData.city,
        avatar_url: formData.avatarUrl || user.user_metadata?.avatar_url || null,
        onboarding_completed: true,
      }, { onConflict: 'user_id' });

      // 2. Role specific logic
      if (selectedRole === 'doctor' || selectedRole === 'veterinary') {
        if (!formData.licenseNumber?.trim()) {
          toast.error('Número de licença profissional é obrigatório');
          setLoading(false);
          return;
        }
        const { error: dErr } = await supabase.from('doctor_profiles').upsert({
          user_id: user.id,
          license_number: formData.licenseNumber.trim(),
          specialty_id: formData.specialtyId || null,
          bio: formData.bio || null,
          consultation_fee: parseInt(formData.consultationFee) || 500,
          years_experience: parseInt(formData.yearsExperience) || 0,
          is_available: true,
          license_url: formData.licenseUrl || null,
        }, { onConflict: 'user_id' });
        if (dErr) throw dErr;
        await supabase.from('user_roles').upsert({ user_id: user.id, role: selectedRole, country_id: country?.id || 'MZ' }, { onConflict: 'user_id,role,country_id' });
        await refreshRoles();
        navigate(selectedRole === 'doctor' ? '/doctor/dashboard' : '/health/veterinary');
      }
      else if (selectedRole === 'store_owner') {
        const { data: store, error: sErr } = await supabase.from('stores').insert({
          name: formData.businessName,
          type: formData.businessType,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          country_id: country?.id || 'MZ',
          delivery_time: formData.deliveryTime,
          delivery_fee: parseFloat(formData.deliveryFee),
          image_url: formData.logoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
          owner_id: user.id,
          is_active: true
        }).select().single();
        if (sErr) throw sErr;
        await supabase.from('user_roles').upsert({ user_id: user.id, role: 'store_owner', country_id: country?.id || 'MZ' }, { onConflict: 'user_id,role,country_id' });
        await refreshRoles();
        navigate('/store/dashboard');
      }
      else if (selectedRole === 'clinic' || selectedRole === 'laboratory') {
        const { error: cErr } = await supabase.from('clinics').insert({
          name: formData.businessName,
          type: selectedRole === 'laboratory' ? 'laboratory' : (formData.businessType as any),
          description: formData.description,
          address: formData.address,
          city: formData.city,
          country_id: country?.id || 'MZ',
          phone: formData.phone,
          email: user.email,
          license_url: formData.licenseUrl,
          logo_url: formData.logoUrl,
          owner_id: user.id,
          is_active: false // Needs verification
        });
        if (cErr) throw cErr;
        await supabase.from('user_roles').upsert({ user_id: user.id, role: 'clinic', country_id: country?.id || 'MZ' }, { onConflict: 'user_id,role,country_id' });
        await refreshRoles();
        navigate(selectedRole === 'laboratory' ? '/lab/dashboard' : '/clinic/dashboard');
      }

      else if (selectedRole === 'insurance') {
        const { error: iErr } = await supabase.from('insurance_companies').insert({
          name: formData.businessName,
          description: formData.description,
          phone: formData.phone,
          email: user.email,
          city: formData.city,
          address: formData.address,
          owner_id: user.id,
          is_active: false
        });
        if (iErr) throw iErr;
        await supabase.from('user_roles').upsert({ user_id: user.id, role: 'insurance', country_id: country?.id || 'MZ' }, { onConflict: 'user_id,role,country_id' });
        await refreshRoles();
        navigate('/insurance/dashboard');
      }
      else if (selectedRole === 'driver') {
        // 1. Atualizar perfil basico
        const { error: pErr } = await supabase.from('profiles').upsert({
          user_id: user.id,
          vehicle_type: formData.vehicleType,
          license_plate: formData.licensePlate || null,
          vehicle_brand: formData.vehicleBrand,
          vehicle_model: formData.vehicleModel,
          vehicle_color: formData.vehicleColor,
          vehicle_year: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
          is_available: true,
          license_carta_url: formData.licenseCartaUrl || null,
          license_viatura_url: formData.licenseViaturaUrl || null,
          onboarding_completed: true,
          country_id: country?.id || 'MZ',
          full_name: formData.fullName || user.user_metadata?.full_name || user.email?.split('@')[0],
          avatar_url: formData.avatarUrl || user.user_metadata?.avatar_url || null,
        }, { onConflict: 'user_id' });
        if (pErr) throw pErr;

        // 2. Registar veiculo na tabela driver_vehicles (funcao atomica)
        const { data: vehicleId, error: vErr } = await supabase.rpc('register_driver_vehicle', {
          p_driver_id: user.id,
          p_vehicle_type: formData.vehicleType,
          p_brand: formData.vehicleBrand,
          p_model: formData.vehicleModel,
          p_color: formData.vehicleColor,
          p_year: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
          p_license_plate: formData.licensePlate || null,
          p_photo_front: formData.vehiclePhotoFront,
          p_photo_side: formData.vehiclePhotoSide,
          p_photo_back: formData.vehiclePhotoBack,
          p_license_carta_url: formData.licenseCartaUrl || null,
          p_license_viatura_url: formData.licenseViaturaUrl || null,
        });
        if (vErr) logger.warn('Vehicle table error (non-blocking):', vErr);

        await supabase.from('user_roles').upsert({ user_id: user.id, role: 'driver', country_id: country?.id || 'MZ' }, { onConflict: 'user_id,role,country_id' });
        await refreshRoles();
        navigate('/driver/dashboard');
      }

      toast.success('Registo concluído com sucesso!');
    } catch (e: any) {
      logger.error('Unexpected error', { error: e });
      toast.error(e.message || 'Erro ao processar registo');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepRoleSelection
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
            nextStep={nextStep}
            user={user}
          />
        );

      case 2:
        return (
          <StepIdentity
            formData={formData}
            handleInputChange={handleInputChange}
            selectedRole={selectedRole!}
            country={country}
            nextStep={nextStep}
          />
        );

      case 3:
        return (
          <StepPhotoUpload
            formData={formData}
            handleInputChange={handleInputChange}
            selectedRole={selectedRole!}
            uploadAvatar={uploadAvatar}
            loading={loading}
            setLoading={setLoading}
            nextStep={nextStep}
          />
        );

      case 4:
        return (
          <StepSpecificInfo
            formData={formData}
            handleInputChange={handleInputChange}
            selectedRole={selectedRole!}
            country={country}
            specialties={specialties}
            nextStep={nextStep}
          />
        );

      case 5:
        return (
          <StepVehiclePhotos
            formData={formData}
            handleInputChange={handleInputChange}
            selectedRole={selectedRole!}
            userId={user?.id}
            nextStep={nextStep}
          />
        );

      case 6:
        return (
          <StepVerification
            formData={formData}
            handleInputChange={handleInputChange}
            selectedRole={selectedRole!}
            country={country}
            loading={loading}
            submitRegistration={submitRegistration}
          />
        );

      default:
        return null;
    }
  };

  return (
    <OnboardingLayout
      title={selectedRole ? `Registo de ${roleOptions.find(r => r.id === selectedRole)?.title}` : "Bem-vindo ao MedWallet"}
      subtitle={selectedRole ? "Complete o seu perfil profissional" : "Escolha como deseja usar a plataforma"}
      step={step}
      totalSteps={selectedRole === 'customer' ? 1 : (selectedRole === 'driver' ? 6 : 5)}
      onBack={() => step > 1 ? setStep(step - 1) : navigate(-1)}
      countryName={country?.name}
    >
      {renderStep()}
    </OnboardingLayout>
  );
}
