import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, ShieldCheck } from '@/components/icons/lucide-compat';
import { toast } from 'sonner';

/** Rota do painel correspondente ao papel do gestor. */
function panelFor(hasRole: (r: string) => boolean): string | null {
  if (hasRole('admin')) return '/admin';
  if (hasRole('country_manager')) return '/manager';
  if (hasRole('provincial_manager') || hasRole('regional_manager') || hasRole('regional_ceo')) return '/regional';
  return null;
}

export default function ManagerLogin() {
  const { signIn, user, hasRole, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Se já houver sessão de gestor, entra directamente no painel certo.
  useEffect(() => {
    if (loading || !user) return;
    const target = panelFor(hasRole);
    if (target) navigate(target, { replace: true });
  }, [loading, user, hasRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        toast.error(error.message || 'Credenciais inválidas');
        return;
      }
      toast.success('Sessão iniciada. A abrir o seu painel...');
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível iniciar sessão');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
      <Helmet>
        <title>Login do Gestor | MedWallet</title>
        <meta name="description" content="Acesso ao painel de gestão MedWallet." />
      </Helmet>

      <Card className="w-full max-w-md p-8 rounded-3xl shadow-xl border-primary/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black leading-tight">Painel de Gestão Regional</h1>
            <p className="text-xs text-muted-foreground">Acesso reservado a gestores autorizados</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="manager-email">Email institucional</Label>
            <Input
              id="manager-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gestor@medwalletmz.online"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="manager-password">Palavra-passe</Label>
            <Input
              id="manager-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full h-12 rounded-2xl font-bold" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar no painel'}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-border text-center">
          <button
            type="button"
            className="text-xs text-primary font-semibold hover:underline"
            onClick={() => navigate('/auth/forgot-password')}
          >
            Esqueci a minha palavra-passe
          </button>
        </div>
      </Card>
    </div>
  );
}
