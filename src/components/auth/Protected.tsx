import { ReactNode } from 'react';
import { usePermissoes } from '@/hooks/usePermissoes';
import { Permissoes, Permissao } from '@/hooks/usePerfisAcesso';

interface ProtectedProps {
  modulo: keyof Permissoes;
  acao?: keyof Permissao;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Protected({ 
  modulo, 
  acao = 'visualizar', 
  children, 
  fallback = null 
}: ProtectedProps) {
  const { hasPermission } = usePermissoes();

  if (!hasPermission(modulo, acao)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
