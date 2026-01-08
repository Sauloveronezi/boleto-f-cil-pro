import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página. Entre em contato com o administrador do sistema se acreditar que isso é um erro.
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={() => navigate("/")}>
            Ir para Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
