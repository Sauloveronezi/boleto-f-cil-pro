import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { WizardSteps, WizardStep } from '@/components/boleto/WizardSteps';
import { BancoSelector } from '@/components/boleto/BancoSelector';
import { ClienteFilter } from '@/components/boleto/ClienteFilter';
import { NotaFiscalFilter } from '@/components/boleto/NotaFiscalFilter';
import { ResumoGeracao } from '@/components/boleto/ResumoGeracao';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { TipoImpressao, Banco } from '@/types/boleto';
import {
  bancosMock,
  clientesMock,
  notasFiscaisMock,
  modelosBoletoMock,
} from '@/data/mockData';

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Banco e Tipo', description: 'Selecione o banco e tipo de impressão' },
  { id: 2, title: 'Clientes', description: 'Filtre e selecione os clientes' },
  { id: 3, title: 'Notas Fiscais', description: 'Selecione as notas para gerar boletos' },
  { id: 4, title: 'Gerar', description: 'Configure e gere os boletos' },
];

export default function GerarBoletos() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [tipoImpressao, setTipoImpressao] = useState<TipoImpressao | null>(null);
  const [bancoSelecionado, setBancoSelecionado] = useState<string | null>(null);
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);
  const [notasSelecionadas, setNotasSelecionadas] = useState<string[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState<string | null>(null);
  const [tipoSaida, setTipoSaida] = useState<'arquivo_unico' | 'individual'>('arquivo_unico');

  const banco = bancosMock.find((b) => b.id === bancoSelecionado) || null;

  // Selecionar modelo padrão quando o banco é selecionado
  useEffect(() => {
    if (bancoSelecionado) {
      const modeloPadrao = modelosBoletoMock.find(
        (m) => m.banco_id === bancoSelecionado && m.padrao
      );
      if (modeloPadrao) {
        setModeloSelecionado(modeloPadrao.id);
      }
    }
  }, [bancoSelecionado]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return tipoImpressao && bancoSelecionado;
      case 2:
        return clientesSelecionados.length > 0;
      case 3:
        return notasSelecionadas.length > 0;
      case 4:
        return modeloSelecionado && notasSelecionadas.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGerar = () => {
    toast({
      title: 'Boletos gerados com sucesso!',
      description: `${notasSelecionadas.length} boleto(s) foram gerados e estão prontos para download.`,
    });

    // Em uma implementação real, aqui seria feita a geração dos boletos
    // e o download do arquivo
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BancoSelector
            bancos={bancosMock}
            bancoSelecionado={bancoSelecionado}
            tipoImpressao={tipoImpressao}
            onBancoChange={setBancoSelecionado}
            onTipoImpressaoChange={setTipoImpressao}
          />
        );
      case 2:
        return (
          <ClienteFilter
            clientes={clientesMock}
            clientesSelecionados={clientesSelecionados}
            onClientesChange={setClientesSelecionados}
          />
        );
      case 3:
        return (
          <NotaFiscalFilter
            notas={notasFiscaisMock}
            clientes={clientesMock}
            clientesSelecionados={clientesSelecionados}
            notasSelecionadas={notasSelecionadas}
            onNotasChange={setNotasSelecionadas}
          />
        );
      case 4:
        return (
          <ResumoGeracao
            tipoImpressao={tipoImpressao}
            banco={banco}
            clientes={clientesMock}
            clientesSelecionados={clientesSelecionados}
            notas={notasFiscaisMock}
            notasSelecionadas={notasSelecionadas}
            modelos={modelosBoletoMock}
            modeloSelecionado={modeloSelecionado}
            onModeloChange={setModeloSelecionado}
            tipoSaida={tipoSaida}
            onTipoSaidaChange={setTipoSaida}
            onGerar={handleGerar}
          />
        );
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerar Boletos</h1>
          <p className="text-muted-foreground">
            Siga as etapas para selecionar banco, clientes, notas e gerar os boletos
          </p>
        </div>

        {/* Wizard Steps */}
        <Card>
          <CardContent className="py-6">
            <WizardSteps steps={WIZARD_STEPS} currentStep={currentStep} />
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="min-h-[400px]">{renderStepContent()}</div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Etapa {currentStep} de {WIZARD_STEPS.length}
            </span>
          </div>

          {currentStep < 4 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              Avançar
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div /> // Placeholder para manter o layout
          )}
        </div>
      </div>
    </MainLayout>
  );
}
