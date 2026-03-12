import { Navigate } from 'react-router-dom';
import { usePermissoes } from '@/hooks/usePermissoes';
import { Loader2 } from 'lucide-react';
import { Permissoes } from '@/hooks/usePerfisAcesso';

const routeOrder: { path: string; modulo: keyof Permissoes }[] = [
  { path: '/', modulo: 'dashboard' },
  { path: '/boletos-api', modulo: 'boletos_api' },
  { path: '/gerar-boletos', modulo: 'boletos' },
  { path: '/gerar-boletos-pdf', modulo: 'boletos_pdf' },
  { path: '/clientes', modulo: 'clientes' },
  { path: '/notas', modulo: 'notas' },
  { path: '/bancos', modulo: 'bancos' },
  { path: '/modelos', modulo: 'modelos' },
  { path: '/templates-boleto', modulo: 'templates' },
  { path: '/configuracao-cnab', modulo: 'cnab' },
  { path: '/importar-layout', modulo: 'importar_layout' },
  { path: '/configuracoes', modulo: 'configuracoes' },
  { path: '/usuarios', modulo: 'usuarios' },
  { path: '/perfis-acesso', modulo: 'perfis' },
];

export function SmartRedirect() {
  const { canAccess, isLoading } = usePermissoes();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  for (const route of routeOrder) {
    if (canAccess(route.modulo)) {
      return <Navigate to={route.path} replace />;
    }
  }

  // Nenhum acesso - redireciona para referência de versões (rota sem restrição)
  return <Navigate to="/referencia-versoes" replace />;
}
