import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={`/auth?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (allowedRoles && profile?.role && !allowedRoles.includes(profile.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="max-w-md w-full p-6 flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <Shield className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Não tem permissão para aceder a esta página
          </p>
          <Button variant="outline" className="mt-2" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Início
          </Button>
        </Card>
      </div>
    );
  }

  return <Outlet />;
}
