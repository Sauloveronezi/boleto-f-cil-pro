import { FileText, Settings, HelpCircle, Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { APP_VERSION } from '@/data/changelog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  modoDemo: boolean;
}

export function Header({ modoDemo }: HeaderProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await signOut();
    toast({
      title: 'Sessão encerrada',
      description: 'Você foi desconectado com sucesso.',
    });
    navigate('/auth', { replace: true });
  };

  return (
    <header className="bg-header text-header-foreground border-b border-border">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-bold">BoletoERP</h1>
                <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>
              </div>
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

          {user && (
            <span className="text-xs text-muted-foreground hidden md:inline">
              {user.email}
            </span>
          )}
          
          <Button variant="ghost" size="icon" className="text-header-foreground hover:bg-header-foreground/10">
            <Bell className="h-5 w-5" />
          </Button>
          
          <Link to="/referencia-versoes">
            <Button variant="ghost" size="icon" className="text-header-foreground hover:bg-header-foreground/10" title="Referência de Versões">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </Link>
          
          <Link to="/configuracoes">
            <Button variant="ghost" size="icon" className="text-header-foreground hover:bg-header-foreground/10">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
