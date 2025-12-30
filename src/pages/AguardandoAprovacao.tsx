import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Clock, LogOut, Mail } from 'lucide-react';

export default function AguardandoAprovacao() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <CardTitle className="text-2xl">Aguardando Aprovação</CardTitle>
          <CardDescription className="text-base">
            Sua conta foi criada com sucesso, mas precisa ser aprovada por um administrador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email cadastrado:</span>
            </div>
            <p className="font-medium">{user?.email}</p>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Um email foi enviado aos administradores do sistema. Você receberá uma notificação 
            quando sua conta for aprovada.
          </p>

          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sair e tentar novamente depois
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
