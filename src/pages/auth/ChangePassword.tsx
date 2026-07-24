import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff, Loader2, KeyRound, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
  const [touched, setTouched] = useState<{ current?: boolean; new?: boolean; confirm?: boolean }>({});

  // Validation helpers
  const validate = (): boolean => {
    const newErrors: { current?: string; new?: string; confirm?: string } = {};

    if (!currentPassword.trim()) {
      newErrors.current = t('changePassword.errors.currentRequired') || 'A senha atual é obrigatória';
    }

    if (newPassword.length < 6) {
      newErrors.new = t('changePassword.errors.minLength') || 'A nova senha deve ter no mínimo 6 caracteres';
    }

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      newErrors.confirm = t('changePassword.errors.mismatch') || 'As senhas não coincidem';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirm = t('changePassword.errors.confirmRequired') || 'Confirme a nova senha';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: 'current' | 'new' | 'confirm') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Run field-specific validation on blur
    const newErrors: typeof errors = { ...errors };

    if (field === 'current' && touched.current && !currentPassword.trim()) {
      newErrors.current = t('changePassword.errors.currentRequired') || 'A senha atual é obrigatória';
    } else {
      delete newErrors.current;
    }

    if (field === 'new' && touched.new) {
      if (newPassword.length > 0 && newPassword.length < 6) {
        newErrors.new = t('changePassword.errors.minLength') || 'A nova senha deve ter no mínimo 6 caracteres';
      } else {
        delete newErrors.new;
      }
    }

    if (field === 'confirm' && touched.confirm) {
      if (!confirmPassword.trim()) {
        newErrors.confirm = t('changePassword.errors.confirmRequired') || 'Confirme a nova senha';
      } else if (newPassword !== confirmPassword) {
        newErrors.confirm = t('changePassword.errors.mismatch') || 'As senhas não coincidem';
      } else {
        delete newErrors.confirm;
      }
    }

    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error(t('changePassword.errors.fixErrors') || 'Corrija os erros antes de continuar');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Re-authenticate with current password to verify identity
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error(t('changePassword.errors.invalidSession') || 'Sessão inválida. Faça login novamente.');
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInErr) {
        setErrors({ current: t('changePassword.errors.wrongPassword') || 'Senha atual incorreta' });
        throw new Error(t('changePassword.errors.wrongPassword') || 'Senha atual incorreta');
      }

      // Update the password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success(t('changePassword.success') || 'Senha alterada com sucesso!');

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTouched({});
      setErrors({});

      // Navigate back to profile after a brief delay
      setTimeout(() => {
        navigate('/profile');
      }, 800);
    } catch (err: any) {
      const message = err.message || t('changePassword.errors.generic') || 'Erro ao alterar senha. Tente novamente.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!newPassword) return { level: 0, label: '', color: '' };
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 10) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 1) return { level: 1, label: t('changePassword.strength.weak') || 'Fraca', color: 'bg-destructive' };
    if (score <= 3) return { level: 2, label: t('changePassword.strength.medium') || 'Média', color: 'bg-yellow-500' };
    return { level: 3, label: t('changePassword.strength.strong') || 'Forte', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength();

  // Validation visual states
  const getInputState = (field: 'current' | 'new' | 'confirm') => {
    if (!touched[field]) return '';
    if (errors[field]) return 'border-destructive ring-destructive/20 focus-visible:ring-destructive/30';
    if (field === 'new' && newPassword.length >= 6) return 'border-emerald-500 ring-emerald-500/20 focus-visible:ring-emerald-500/30';
    if (field === 'confirm' && confirmPassword && newPassword === confirmPassword) return 'border-emerald-500 ring-emerald-500/20 focus-visible:ring-emerald-500/30';
    if (field === 'current' && currentPassword) return 'border-emerald-500 ring-emerald-500/20 focus-visible:ring-emerald-500/30';
    return '';
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="-ml-2"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">Alterar Senha</h1>
        <ShieldCheck className="h-5 w-5 text-primary" />
      </header>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Info Card */}
        <Card className="rounded-2xl border-2 bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-start gap-3">
            <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary">
                {t('changePassword.info.title') || 'Proteja sua conta'}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('changePassword.info.description') ||
                  'Escolha uma senha forte com letras maiúsculas, números e caracteres especiais para maior segurança.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Form */}
        <Card className="rounded-2xl border-2">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-sm font-semibold">
                  {t('changePassword.current') || 'Senha atual'}
                </Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrent ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (errors.current) setErrors((prev) => ({ ...prev, current: undefined }));
                    }}
                    onBlur={() => handleBlur('current')}
                    className={`pr-10 ${getInputState('current')}`}
                    disabled={loading}
                    aria-invalid={!!errors.current}
                    aria-describedby={errors.current ? 'current-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showCurrent ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.current && (
                  <p id="current-error" className="text-xs text-destructive flex items-center gap-1">
                    {errors.current}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-semibold">
                  {t('changePassword.new') || 'Nova senha'}
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.new) setErrors((prev) => ({ ...prev, new: undefined }));
                      // Also re-validate confirm if it was touched
                      if (touched.confirm && confirmPassword) {
                        if (e.target.value !== confirmPassword) {
                          setErrors((prev) => ({ ...prev, confirm: t('changePassword.errors.mismatch') || 'As senhas não coincidem' }));
                        } else {
                          setErrors((prev) => ({ ...prev, confirm: undefined }));
                        }
                      }
                    }}
                    onBlur={() => handleBlur('new')}
                    className={`pr-10 ${getInputState('new')}`}
                    disabled={loading}
                    aria-invalid={!!errors.new}
                    aria-describedby={errors.new ? 'new-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showNew ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.new && (
                  <p id="new-error" className="text-xs text-destructive flex items-center gap-1">
                    {errors.new}
                  </p>
                )}

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            strength.level >= level ? strength.color : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-[10px] font-medium ${
                      strength.level === 1 ? 'text-destructive' :
                      strength.level === 2 ? 'text-yellow-600' :
                      'text-emerald-600'
                    }`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-semibold">
                  {t('changePassword.confirm') || 'Confirmar nova senha'}
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
                    }}
                    onBlur={() => handleBlur('confirm')}
                    className={`pr-10 ${getInputState('confirm')}`}
                    disabled={loading}
                    aria-invalid={!!errors.confirm}
                    aria-describedby={errors.confirm ? 'confirm-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirm && (
                  <p id="confirm-error" className="text-xs text-destructive flex items-center gap-1">
                    {errors.confirm}
                  </p>
                )}
                {/* Success indicator when passwords match */}
                {!errors.confirm && confirmPassword && newPassword === confirmPassword && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('changePassword.match') || 'As senhas coincidem'}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full font-bold rounded-xl h-12"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('changePassword.submitting') || 'A alterar senha...'}
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 mr-2" />
                    {t('changePassword.submit') || 'Alterar Senha'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Tips */}
        <Card className="rounded-2xl border-2 bg-muted/30">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t('changePassword.tips.title') || 'Dicas de segurança'}
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {t('changePassword.tips.tip1') || 'Use pelo menos 6 caracteres com letras e números'}
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {t('changePassword.tips.tip2') || 'Não reutilize senhas de outros serviços'}
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {t('changePassword.tips.tip3') || 'Evite informações pessoais como datas ou nomes'}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
