import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Receipt, 
  Settings, 
  Palette,
  Building2,
  Upload,
  FileCode,
  CloudDownload,
  UserCog,
  Shield,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissoes } from '@/hooks/usePermissoes';

export function Sidebar() {
  const location = useLocation();
  const { canAccess } = usePermissoes();

  const menuItems = [
    {
      title: 'Principal',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
        ...(canAccess('boletos') ? [{ icon: FileText, label: 'Gerar Boletos', href: '/gerar-boletos' }] : []),
        ...(canAccess('integracoes') ? [{ icon: CloudDownload, label: 'Boletos via API', href: '/boletos-api' }] : []),
      ]
    },
    {
      title: 'Cadastros',
      items: [
        ...(canAccess('clientes') ? [{ icon: Users, label: 'Clientes', href: '/clientes' }] : []),
        ...(canAccess('notas') ? [{ icon: Receipt, label: 'Notas Fiscais', href: '/notas' }] : []),
        ...(canAccess('bancos') ? [{ icon: Building2, label: 'Bancos', href: '/bancos' }] : []),
      ]
    },
    {
      title: 'Configurações',
      items: [
        ...(canAccess('modelos') ? [{ icon: Palette, label: 'Modelos de Layout', href: '/modelos' }] : []),
        ...(canAccess('modelos') ? [{ icon: Palette, label: 'Templates de Boleto', href: '/templates-boleto' }] : []),
        ...(canAccess('configuracoes') ? [{ icon: FileCode, label: 'Padrões CNAB', href: '/configuracao-cnab' }] : []),
        ...(canAccess('modelos') ? [{ icon: Upload, label: 'Importar Layout (IA)', href: '/importar-layout' }] : []),
        ...(canAccess('configuracoes') ? [{ icon: Settings, label: 'Configurações', href: '/configuracoes' }] : []),
      ]
    },
    {
      title: 'Boletos (PDF)',
      items: [
        ...(canAccess('boletos') ? [{ icon: FileText, label: 'Gerar Boletos (PDF)', href: '/gerar-boletos-pdf' }] : []),
      ]
    },
    {
      title: 'Administração',
      items: [
        ...(canAccess('usuarios') ? [{ icon: UserCog, label: 'Usuários', href: '/usuarios' }] : []),
        ...(canAccess('perfis') ? [{ icon: Shield, label: 'Perfis de Acesso', href: '/perfis-acesso' }] : []),
      ].filter(Boolean)
    },
    {
      title: 'Ajuda',
      items: [
        { icon: HelpCircle, label: 'Referência de Versões', href: '/referencia-versoes' }
      ]
    }
  ].filter(section => section.items.length > 0);

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border min-h-[calc(100vh-60px)]">
      <nav className="p-4 space-y-6">
        {menuItems.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
