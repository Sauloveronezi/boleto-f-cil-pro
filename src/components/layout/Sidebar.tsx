import { useState } from 'react';
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
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissoes } from '@/hooks/usePermissoes';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function Sidebar() {
  const location = useLocation();
  const { canAccess } = usePermissoes();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      title: 'Principal',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
        ...(canAccess('boletos_api') ? [{ icon: CloudDownload, label: 'Boletos via API', href: '/boletos-api' }] : []),
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
        ...(canAccess('templates') ? [{ icon: Palette, label: 'Templates de Boleto', href: '/templates-boleto' }] : []),
        ...(canAccess('cnab') ? [{ icon: FileCode, label: 'Padrões CNAB', href: '/configuracao-cnab' }] : []),
        ...(canAccess('importar_layout') ? [{ icon: Upload, label: 'Importar Layout (IA)', href: '/importar-layout' }] : []),
        ...(canAccess('configuracoes') ? [{ icon: Settings, label: 'Configurações', href: '/configuracoes' }] : []),
      ]
    },
    {
      title: 'Boletos (PDF)',
      items: [
        ...(canAccess('boletos_pdf') ? [{ icon: FileText, label: 'Gerar Boletos (PDF)', href: '/gerar-boletos-pdf' }] : []),
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
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'bg-sidebar border-r border-sidebar-border min-h-[calc(100vh-60px)] transition-all duration-200 relative',
          collapsed ? 'w-16' : 'w-52'
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-3 z-10 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-sm"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        <nav className={cn('p-3 space-y-4', collapsed && 'px-2')}>
          {menuItems.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  {section.title}
                </h3>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  const linkContent = (
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md text-sm font-medium transition-colors',
                        collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-2',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate text-[13px]">{item.label}</span>}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <li key={item.href}>
                        <Tooltip>
                          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  }

                  return <li key={item.href}>{linkContent}</li>;
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
