import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import GerarBoletos from "./pages/GerarBoletos";
import Clientes from "./pages/Clientes";
import NotasFiscais from "./pages/NotasFiscais";
import Bancos from "./pages/Bancos";
import Modelos from "./pages/Modelos";
import ImportarLayout from "./pages/ImportarLayout";
import Configuracoes from "./pages/Configuracoes";
import ConfiguracaoCNAB from "./pages/ConfiguracaoCNAB";
import BoletosApi from "./pages/BoletosApi";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Usuarios from "./pages/Usuarios";
import PerfisAcesso from "./pages/PerfisAcesso";
import AguardandoAprovacao from "./pages/AguardandoAprovacao";
import NotFound from "./pages/NotFound";

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
            <Route path="/gerar-boletos" element={<ProtectedRoute><GerarBoletos /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/notas" element={<ProtectedRoute><NotasFiscais /></ProtectedRoute>} />
            <Route path="/bancos" element={<ProtectedRoute><Bancos /></ProtectedRoute>} />
            <Route path="/modelos" element={<ProtectedRoute><Modelos /></ProtectedRoute>} />
            <Route path="/importar-layout" element={<ProtectedRoute><ImportarLayout /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="/configuracao-cnab" element={<ProtectedRoute><ConfiguracaoCNAB /></ProtectedRoute>} />
            <Route path="/boletos-api" element={<ProtectedRoute><BoletosApi /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
            <Route path="/perfis-acesso" element={<ProtectedRoute><PerfisAcesso /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
