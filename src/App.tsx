import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Protected } from "@/components/auth/Protected";
import Dashboard from "./pages/Dashboard";
import GerarBoletos from "./pages/GerarBoletos";
import Clientes from "./pages/Clientes";
import NotasFiscais from "./pages/NotasFiscais";
import Bancos from "./pages/Bancos";
import Modelos from "./pages/Modelos";
import ImportarLayout from "./pages/ImportarLayout";
import Configuracoes from "./pages/Configuracoes";
import ConfiguracaoCNAB from "./pages/ConfiguracaoCNAB";
import ArquivosCNAB from "./pages/ArquivosCNAB";
import BoletosApi from "./pages/BoletosApi";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Usuarios from "./pages/Usuarios";
import PerfisAcesso from "./pages/PerfisAcesso";
import AguardandoAprovacao from "./pages/AguardandoAprovacao";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/gerar-boletos" element={<ProtectedRoute><Protected modulo="boletos" fallback={<AccessDenied />}><GerarBoletos /></Protected></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Protected modulo="clientes" fallback={<AccessDenied />}><Clientes /></Protected></ProtectedRoute>} />
            <Route path="/notas" element={<ProtectedRoute><Protected modulo="notas" fallback={<AccessDenied />}><NotasFiscais /></Protected></ProtectedRoute>} />
            <Route path="/bancos" element={<ProtectedRoute><Protected modulo="bancos" fallback={<AccessDenied />}><Bancos /></Protected></ProtectedRoute>} />
            <Route path="/modelos" element={<ProtectedRoute><Protected modulo="modelos" fallback={<AccessDenied />}><Modelos /></Protected></ProtectedRoute>} />
            <Route path="/importar-layout" element={<ProtectedRoute><Protected modulo="modelos" fallback={<AccessDenied />}><ImportarLayout /></Protected></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Protected modulo="configuracoes" fallback={<AccessDenied />}><Configuracoes /></Protected></ProtectedRoute>} />
            <Route path="/configuracao-cnab" element={<ProtectedRoute><Protected modulo="configuracoes" fallback={<AccessDenied />}><ConfiguracaoCNAB /></Protected></ProtectedRoute>} />
            <Route path="/arquivos-cnab" element={<ProtectedRoute><Protected modulo="configuracoes" fallback={<AccessDenied />}><ArquivosCNAB /></Protected></ProtectedRoute>} />
            <Route path="/boletos-api" element={<ProtectedRoute><Protected modulo="integracoes" fallback={<AccessDenied />}><BoletosApi /></Protected></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><Protected modulo="usuarios" fallback={<AccessDenied />}><Usuarios /></Protected></ProtectedRoute>} />
            <Route path="/perfis-acesso" element={<ProtectedRoute><Protected modulo="perfis" fallback={<AccessDenied />}><PerfisAcesso /></Protected></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
