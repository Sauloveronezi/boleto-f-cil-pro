import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { WizardSteps, WizardStep } from '@/components/boleto/WizardSteps';
import { BancoSelector } from '@/components/boleto/BancoSelector';
import { ClienteFilter } from '@/components/boleto/ClienteFilter';
import { NotaFiscalFilter } from '@/components/boleto/NotaFiscalFilter';
import { ResumoGeracao } from '@/components/boleto/ResumoGeracao';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { TipoOrigem, Cliente, NotaFiscal, ConfiguracaoCNAB, ModeloBoleto } from '@/types/boleto';
import { gerarPDFBoletos } from '@/lib/pdfGenerator';
import { parseCNAB, DadosCNAB } from '@/lib/cnabParser';
import { listarTemplates } from '@/lib/pdfTemplateGenerator';
import { useBancos } from '@/hooks/useBancos';
import { DEFAULT_MODELOS } from '@/data/templates';
const WIZARD_STEPS: WizardStep[] = [{
  id: 1,
  title: 'Origem e Banco',
  description: 'Selecione a origem dos dados e o banco'
}, {
  id: 2,
  title: 'Clientes',
  description: 'Filtre e selecione os clientes'
}, {
  id: 3,
  title: 'Notas Fiscais',
  description: 'Selecione as notas para gerar boletos'
}, {
  id: 4,
  title: 'Gerar',
  description: 'Configure e gere os boletos'
}];
export default function GerarBoletos() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    data: bancos = [],
    isLoading: bancosLoading
  } = useBancos();
  const [currentStep, setCurrentStep] = useState(1);
  const [tipoOrigem, setTipoOrigem] = useState<TipoOrigem | null>(null);
  const [bancoSelecionado, setBancoSelecionado] = useState<string | null>(null);
  const [arquivoCNAB, setArquivoCNAB] = useState<File | null>(null);
  const [padraoCNAB, setPadraoCNAB] = useState<ConfiguracaoCNAB | null>(null);
  const [dadosCNAB, setDadosCNAB] = useState<DadosCNAB | null>(null);
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);
  const [notasSelecionadas, setNotasSelecionadas] = useState<string[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState<string | null>(null);
  const [tipoSaida, setTipoSaida] = useState<'arquivo_unico' | 'individual'>('arquivo_unico');
  const [modelos, setModelos] = useState<ModeloBoleto[]>(DEFAULT_MODELOS);
  const banco = bancos.find(b => b.id === bancoSelecionado) || {
    id: 'unknown',
    nome_banco: 'Banco Desconhecido',
    codigo_banco: '000',
    tipo_layout_padrao: 'CNAB_400',
    ativo: false
  } as any;

  // Configuração bancária específica (agência, conta, juros) deve vir de um store real.
  // Por enquanto, passamos undefined para usar os valores padrão do gerador ou inseridos manualmente no template.
  const configuracao = undefined;

  // Carregar modelos salvos do localStorage (templates importados)
  useEffect(() => {
    const templatesImportados = listarTemplates();

    // Converter templates para ModeloBoleto
    const modelosImportados: ModeloBoleto[] = templatesImportados.map(template => ({
      id: template.id,
      nome_modelo: template.nome,
      banco_id: template.bancos_compativeis[0] || '',
      bancos_compativeis: template.bancos_compativeis,
      tipo_layout: 'CNAB_400',
      // Default, ajustado conforme necessidade
      padrao: false,
      campos_mapeados: template.campos.map(campo => ({
        id: campo.tipo,
        nome: campo.label,
        variavel: `{{${campo.tipo}}}`,
        posicao_x: campo.x,
        posicao_y: campo.y,
        largura: campo.largura,
        altura: campo.altura
      })),
      texto_instrucoes: '',
      criado_em: template.criado_em,
      atualizado_em: template.atualizado_em,
      template_pdf_id: template.id
    }));

    // Combinar com modelos padrão
    setModelos([...DEFAULT_MODELOS, ...modelosImportados]);
  }, []);

  // Dados a usar (apenas CNAB importado, sem mocks)
  const isCNAB = tipoOrigem === 'CNAB_240' || tipoOrigem === 'CNAB_400';
  const clientes: Cliente[] = isCNAB ? dadosCNAB?.clientes || [] : [];
  const notas: NotaFiscal[] = isCNAB ? dadosCNAB?.notas || [] : [];

  // Processar arquivo CNAB quando selecionado
  useEffect(() => {
    if (arquivoCNAB && tipoOrigem && isCNAB && padraoCNAB) {
      const reader = new FileReader();
      reader.onload = e => {
        const conteudo = e.target?.result as string;
        const dados = parseCNAB(conteudo, tipoOrigem, padraoCNAB);
        setDadosCNAB(dados);

        // Resetar seleções
        setClientesSelecionados([]);
        setNotasSelecionadas([]);
        if (dados.notas.length === 0) {
          toast({
            title: 'Atenção',
            description: 'Nenhum boleto encontrado no arquivo utilizando o padrão selecionado. Verifique se o padrão corresponde ao arquivo.',
            variant: 'destructive'
          });
        } else {
          // Verifica se houve fallback (notas com numero_nota começando com RAW-)
          const temFallback = dados.notas.some(n => n.numero_nota.startsWith('RAW-'));
          if (temFallback) {
            toast({
              title: 'Arquivo processado com ressalvas',
              description: `${dados.notas.length} registro(s) bruto(s) importados. Os dados podem estar incompletos.`
            });
          } else {
            toast({
              title: 'Arquivo processado!',
              description: `${dados.clientes.length} cliente(s) e ${dados.notas.length} nota(s) importados do arquivo CNAB.`
            });
          }
        }
      };
      reader.readAsText(arquivoCNAB);
    }
  }, [arquivoCNAB, tipoOrigem, isCNAB, padraoCNAB, toast]);

  // Selecionar modelo padrão quando o banco é selecionado
  useEffect(() => {
    if (bancoSelecionado) {
      const modeloPadrao = modelos.find(m => (m.banco_id === bancoSelecionado || m.bancos_compativeis?.includes(bancoSelecionado)) && m.padrao);
      if (modeloPadrao) {
        setModeloSelecionado(modeloPadrao.id);
      } else {
        // Se não houver modelo padrão, seleciona o primeiro disponível para o banco
        const primeiroModelo = modelos.find(m => m.banco_id === bancoSelecionado || m.bancos_compativeis?.includes(bancoSelecionado));
        if (primeiroModelo) {
          setModeloSelecionado(primeiroModelo.id);
        }
      }
    }
  }, [bancoSelecionado, modelos]);

  // Limpar dados CNAB ao trocar tipo de origem
  useEffect(() => {
    if (!isCNAB) {
      setDadosCNAB(null);
      setArquivoCNAB(null);
      setPadraoCNAB(null);
    }
  }, [tipoOrigem, isCNAB]);
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // Para CNAB, exige arquivo E padrão selecionado
        // Para API_CDS, apenas tipo e banco
        if (isCNAB) {
          // Se tem arquivo CNAB, precisa de padrão selecionado
          if (arquivoCNAB) {
            return tipoOrigem && bancoSelecionado && padraoCNAB;
          }
          // Se não tem arquivo ainda, não pode avançar
          return false;
        }
        return tipoOrigem && bancoSelecionado;
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
    if (!banco || !tipoOrigem) return;

    // Filtrar notas selecionadas
    const notasParaGerar = notas.filter(n => notasSelecionadas.includes(n.id));

    // Gerar o PDF com o modelo do banco
    gerarPDFBoletos(notasParaGerar, clientes, banco, configuracao, tipoOrigem, tipoSaida);
    toast({
      title: 'Boletos gerados com sucesso!',
      description: `${notasSelecionadas.length} boleto(s) foram gerados e o download foi iniciado.`
    });
  };
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        if (bancosLoading) {
          return <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>;
        }
        return <BancoSelector bancos={bancos} bancoSelecionado={bancoSelecionado} tipoImpressao={tipoOrigem} arquivoCNAB={arquivoCNAB} padraoCNAB={padraoCNAB} onBancoChange={setBancoSelecionado} onTipoImpressaoChange={setTipoOrigem} onArquivoChange={setArquivoCNAB} onPadraoCNABChange={setPadraoCNAB} />;
      case 2:
        return <ClienteFilter clientes={clientes} clientesSelecionados={clientesSelecionados} onClientesChange={setClientesSelecionados} />;
      case 3:
        return <NotaFiscalFilter notas={notas} clientes={clientes} clientesSelecionados={clientesSelecionados} notasSelecionadas={notasSelecionadas} onNotasChange={setNotasSelecionadas} />;
      case 4:
        return <ResumoGeracao tipoOrigem={tipoOrigem} banco={banco} clientes={clientes} clientesSelecionados={clientesSelecionados} notas={notas} notasSelecionadas={notasSelecionadas} modelos={modelos} modeloSelecionado={modeloSelecionado} onModeloChange={setModeloSelecionado} tipoSaida={tipoSaida} onTipoSaidaChange={setTipoSaida} onGerar={handleGerar} />;
      default:
        return null;
    }
  };
  return <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerar Boletos_teste</h1>
          <p className="text-muted-foreground">
            Siga as etapas para selecionar origem dos dados, banco, clientes, notas e gerar os boletos em PDF
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
          <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Etapa {currentStep} de {WIZARD_STEPS.length}
            </span>
          </div>

          {currentStep < 4 ? <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              Avançar
              <ArrowRight className="h-4 w-4" />
            </Button> : <div /> // Placeholder para manter o layout
        }
        </div>
      </div>
    </MainLayout>;
}