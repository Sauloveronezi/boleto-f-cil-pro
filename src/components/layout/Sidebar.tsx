import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Receipt, 
  Settings, 
  Palette,
  Building2,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    title: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
      { icon: FileText, label: 'Gerar Boletos', href: '/gerar-boletos' },
    ]
  },
  {
    title: 'Cadastros',
    items: [
      { icon: Users, label: 'Clientes', href: '/clientes' },
      { icon: Receipt, label: 'Notas Fiscais', href: '/notas' },
      { icon: Building2, label: 'Bancos', href: '/bancos' },
    ]
  },
  {
    title: 'Configurações',
    items: [
      { icon: Palette, label: 'Modelos de Layout', href: '/modelos' },
      { icon: Upload, label: 'Importar Layout (IA)', href: '/importar-layout' },
      { icon: Settings, label: 'Configurações', href: '/configuracoes' },
    ]
  }
];

export function Sidebar() {
  const location = useLocation();

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
