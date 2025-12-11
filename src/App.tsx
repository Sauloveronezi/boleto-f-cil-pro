import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import GerarBoletos from "./pages/GerarBoletos";
import Clientes from "./pages/Clientes";
import NotasFiscais from "./pages/NotasFiscais";
import Bancos from "./pages/Bancos";
import Modelos from "./pages/Modelos";
import ImportarLayout from "./pages/ImportarLayout";
import Configuracoes from "./pages/Configuracoes";
import ConfiguracaoCNAB from "./pages/ConfiguracaoCNAB";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/gerar-boletos" element={<GerarBoletos />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/notas" element={<NotasFiscais />} />
          <Route path="/bancos" element={<Bancos />} />
          <Route path="/modelos" element={<Modelos />} />
          <Route path="/importar-layout" element={<ImportarLayout />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/configuracao-cnab" element={<ConfiguracaoCNAB />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
