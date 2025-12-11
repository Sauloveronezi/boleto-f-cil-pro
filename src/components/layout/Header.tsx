import { FileText, Settings, HelpCircle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface HeaderProps {
  modoDemo: boolean;
}

export function Header({ modoDemo }: HeaderProps) {
  return (
    <header className="bg-header text-header-foreground border-b border-border">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">BoletoERP</h1>
              <p className="text-xs text-muted-foreground">Sistema de Gestão de Boletos</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {modoDemo && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              Modo Demonstração
            </Badge>
          )}
          
          <Button variant="ghost" size="icon" className="text-header-foreground hover:bg-header-foreground/10">
            <Bell className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="text-header-foreground hover:bg-header-foreground/10">
            <HelpCircle className="h-5 w-5" />
          </Button>
          
          <Link to="/configuracoes">
            <Button variant="ghost" size="icon" className="text-header-foreground hover:bg-header-foreground/10">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
