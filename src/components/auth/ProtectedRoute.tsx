import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUsuarioAtual } from '@/hooks/useUsuarioAtual';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { usuarioAtual, isLoading: usuarioLoading, isPendente } = useUsuarioAtual();
  const location = useLocation();

  const isLoading = authLoading || (requireAuth && user && usuarioLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    // Redireciona para login guardando a rota original
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Se o usuário está autenticado mas ainda não foi aprovado
  if (requireAuth && user && isPendente && location.pathname !== '/aguardando-aprovacao') {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  return <>{children}</>;
}
