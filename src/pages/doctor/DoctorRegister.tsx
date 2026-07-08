import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Stethoscope, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LicenseUpload } from '@/components/upload/LicenseUpload';

export default function DoctorRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country: currentCountry, t } = useCountry();
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [country, setCountry] = useState('MZ');
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    license_number: '',
    crm_number: '',
    crm_uf: '',
    specialty_id: '',
    bio: '',
    consultation_fee: '500',
    years_experience: '0',
    license_url: '',
  });

  const countries = [
    { code: 'MZ', name: 'Moçambique', flag: '🇲🇿' },
    { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
    { code: 'AO', name: 'Angola', flag: '🇦🇴' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    { code: 'IN', name: 'Índia', flag: '🇮🇳' },
  ];

  useEffect(() => {
    supabase.from('medical_specialties').select('*').order('name').then(({ data }) => setSpecialties(data || []));
  }, []);

  const submit = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!form.specialty_id || !form.full_name) {
      toast.error(t('doctor_register.required_fields_error')); return;
    }
    if (country === 'BR' && (!form.crm_number || !form.crm_uf)) {
      toast.error(t('doctor_register.crm_error')); return;
    }
    if (country !== 'BR' && !form.license_number) {
      toast.error(t('doctor_register.license_error')); return;
    }

    if (!form.license_url) {
      toast.error(country === 'BR' ? t('doctor_register.document_error') : t('doctor_register.license_upload_label')); return;
    }
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        full_name: form.full_name,
        phone: form.phone,
        default_city: country === 'BR' ? form.crm_uf : null // Usando city para guardar UF temporariamente
      }).eq('user_id', user.id);

      const licenseDisplay = country === 'BR' ? `CRM-${form.crm_uf} ${form.crm_number}` : form.license_number;

      const { error: pErr } = await supabase.from('doctor_profiles').upsert({
        user_id: user.id,
        license_number: licenseDisplay,
        specialty_id: form.specialty_id,
        bio: form.bio,
        consultation_fee: parseInt(form.consultation_fee) || 500,
        years_experience: parseInt(form.years_experience) || 0,
        is_available: true,
        license_url: form.license_url || null,
      }, { onConflict: 'user_id' });
      if (pErr) throw pErr;
      await supabase.from('user_roles').upsert({ user_id: user.id, role: 'doctor' }, { onConflict: 'user_id,role' });
      toast.success(t('doctor_register.success_msg'));
      navigate('/doctor/dashboard');
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-bold">{t('doctor_register.title')}</h1>
      </header>
      <div className="p-4 max-w-xl mx-auto space-y-4">
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-pharmacy/10 flex items-center justify-center mb-3">
            <Stethoscope className="h-8 w-8 text-pharmacy" />
          </div>
          <h2 className="text-xl font-bold">{t('doctor_register.join_title')}</h2>
          <p className="text-sm text-muted-foreground">{t('doctor_register.join_subtitle')}</p>
        </div>

        <div><Label>{t('doctor_register.full_name')} *</Label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t('doctor_register.country_of_practice')} *</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>{t('doctor_register.phone')}</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+..." /></div>
        </div>

        {country === 'BR' ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>CRM (Número) *</Label>
              <Input value={form.crm_number} onChange={e => setForm({...form, crm_number: e.target.value})} placeholder="000000" />
            </div>
            <div>
              <Label>UF *</Label>
              <Input value={form.crm_uf} onChange={e => setForm({...form, crm_uf: e.target.value})} placeholder="SP" maxLength={2} />
            </div>
          </div>
        ) : (
          <div><Label>{t('doctor_register.license_number')} *</Label><Input value={form.license_number} onChange={e => setForm({...form, license_number: e.target.value})} /></div>
        )}

        <div>
          <Label>{t('doctor_register.specialty')} *</Label>
          <Select value={form.specialty_id} onValueChange={v => setForm({...form, specialty_id: v})}>
            <SelectTrigger><SelectValue placeholder={t('doctor_register.specialty_placeholder')} /></SelectTrigger>
            <SelectContent>
              {specialties.map(s => <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>{t('doctor_register.bio')}</Label><Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} rows={3} /></div>
        <LicenseUpload
          slot="cedula"
          label={`${t('doctor_register.license_upload_label')} *`}
          description={t('doctor_register.license_upload_desc')}
          value={form.license_url}
          onUploaded={(p) => setForm({ ...form, license_url: p })}
        />
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{t('doctor_register.consultation_fee', { currency: currentCountry?.currency_code || 'MZN' })}</Label><Input type="number" value={form.consultation_fee} onChange={e => setForm({...form, consultation_fee: e.target.value})} /></div>
          <div><Label>{t('doctor_register.years_experience')}</Label><Input type="number" value={form.years_experience} onChange={e => setForm({...form, years_experience: e.target.value})} /></div>
        </div>
        <p className="text-xs text-muted-foreground">{t('doctor_register.manual_verification_notice')}</p>
      </div>
      <div className="fixed bottom-0 inset-x-0 p-4 bg-background border-t">
        <Button className="w-full" size="lg" onClick={submit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} {t('doctor_register.submit_button')}
        </Button>
      </div>
    </div>
  );
}