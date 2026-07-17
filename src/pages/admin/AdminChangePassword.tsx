import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from 'lucide-react';

export default function AdminChangePassword() {
  const [current, setCurrent] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) return toast.error('A nova password deve ter pelo menos 8 caracteres.');
    if (pwd !== confirm) return toast.error('As passwords não coincidem.');

    setLoading(true);
    try {
      // Reautentica com password atual (garante que não é apenas sessão antiga)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Sessão inválida.');
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email, password: current,
      });
      if (signInErr) throw new Error('Password atual incorreta.');

      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;

      toast.success('Password atualizada com sucesso.');
      setCurrent(''); setPwd(''); setConfirm('');
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao atualizar password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Alterar Password
          </CardTitle>
          <CardDescription>
            Substitua a password temporária por uma nova de sua escolha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="current">Password atual</Label>
              <Input id="current" type="password" autoComplete="current-password"
                value={current} onChange={e => setCurrent(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="pwd">Nova password</Label>
              <Input id="pwd" type="password" autoComplete="new-password" minLength={8}
                value={pwd} onChange={e => setPwd(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar nova password</Label>
              <Input id="confirm" type="password" autoComplete="new-password" minLength={8}
                value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Atualizar password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}