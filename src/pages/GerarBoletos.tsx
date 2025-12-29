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
import { renderizarBoleto, DadosBoleto, ElementoParaRender } from '@/lib/pdfModelRenderer';
import { parseCNAB, DadosCNAB } from '@/lib/cnabParser';
import { useBancos } from '@/hooks/useBancos';
import { supabase } from '@/integrations/supabase/client';
import { getPdfUrl } from '@/lib/pdfStorage';
import { useQuery } from '@tanstack/react-query';

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
  const { toast } = useToast();
  const { data: bancos = [], isLoading: bancosLoading } = useBancos();
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

  const banco = bancos.find(b => b.id === bancoSelecionado) || {
    id: 'unknown',
    nome_banco: 'Banco Desconhecido',
    codigo_banco: '000',
    tipo_layout_padrao: 'CNAB_400',
    ativo: false
  } as any;

  // Configuração bancária específica (agência, conta, juros) deve vir de um store real.
  const configuracao = undefined;

  // Carregar modelos do Supabase
  const { data: modelos = [] } = useQuery({
    queryKey: ['modelos-boleto-geracao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_modelos_boleto')
        .select('*')
        .is('deleted', null)
        .order('padrao', { ascending: false });
      
      if (error) {
        console.error('[GerarBoletos] Erro ao carregar modelos:', error);
        return [];
      }
      
      return (data || []).map((m: any): ModeloBoleto => ({
        id: m.id,
        nome_modelo: m.nome_modelo,
        banco_id: m.banco_id || '',
        bancos_compativeis: m.bancos_compativeis || [],
        tipo_layout: m.tipo_layout || 'CNAB_400',
        padrao: m.padrao || false,
        campos_mapeados: (m.campos_mapeados || []).map((c: any) => ({
          id: String(c.id),
          nome: c.nome || '',
          variavel: c.variavel || '',
          posicao_x: c.posicao_x || 0,
          posicao_y: c.posicao_y || 0,
          largura: c.largura || 100,
          altura: c.altura || 20,
        })),
        texto_instrucoes: m.texto_instrucoes || '',
        template_pdf_id: m.template_pdf_id,
        criado_em: m.created_at,
        atualizado_em: m.updated_at,
      }));
    }
  });

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
  const handleGerar = async () => {
    if (!banco || !tipoOrigem) return;

    // Filtrar notas selecionadas
    const notasParaGerar = notas.filter(n => notasSelecionadas.includes(n.id));
    
    // Buscar modelo selecionado
    const modelo = modelos.find(m => m.id === modeloSelecionado);
    
    console.log('[GerarBoletos] Modelo selecionado:', modelo?.nome_modelo);
    console.log('[GerarBoletos] Campos mapeados:', modelo?.campos_mapeados?.length || 0);
    
    // Tentar buscar modelo do banco de dados com PDF base
    try {
      const { data: modeloDB } = await supabase
        .from('vv_b_modelos_boleto')
        .select('*')
        .eq('id', modeloSelecionado)
        .is('deleted', null)
        .maybeSingle();
      
      if (modeloDB?.pdf_storage_path) {
        // Usar o renderizador de cópia fiel
        const pdfUrl = await getPdfUrl(modeloDB.pdf_storage_path);
        if (pdfUrl) {
          const response = await fetch(pdfUrl);
          if (!response.ok) {
            throw new Error('Falha ao baixar PDF base');
          }
          const basePdfBytes = await response.arrayBuffer();
          
          const camposMapeados = Array.isArray(modeloDB.campos_mapeados) 
            ? modeloDB.campos_mapeados 
            : [];
          
          console.log('[GerarBoletos] Campos do modelo DB:', camposMapeados.length);
          
          // Converter elementos para o formato esperado pelo renderizador
          const elementos: ElementoParaRender[] = camposMapeados.map((campo: any) => ({
            id: String(campo.id),
            tipo: 'campo' as const,
            nome: campo.nome || '',
            x: campo.posicao_x || 0,
            y: campo.posicao_y || 0,
            largura: campo.largura || 100,
            altura: campo.altura || 20,
            variavel: campo.variavel || '',
            corTexto: campo.corTexto || '#000000',
            tamanhoFonte: campo.tamanhoFonte || 10,
            alinhamento: campo.alinhamento || 'left',
            visivel: true, // Garantir que o elemento seja visível
          }));
          
          console.log('[GerarBoletos] Elementos para render:', elementos.length);
          
          // Gerar PDF para cada nota
          for (let i = 0; i < notasParaGerar.length; i++) {
            const nota = notasParaGerar[i];
            const cliente = clientes.find(c => c.id === nota.codigo_cliente);
            
            // Mapear dados para as variáveis usadas nos campos
            const dadosBoleto: DadosBoleto = {
              // Dados do pagador/cliente
              pagador_nome: cliente?.razao_social || '',
              pagador_cnpj: cliente?.cnpj || '',
              pagador_endereco: cliente?.endereco || '',
              pagador_cidade_uf: cliente?.cidade ? `${cliente.cidade}/${cliente.estado}` : '',
              pagador_cep: cliente?.cep || '',
              
              // Aliases para variáveis comuns
              cliente_razao_social: cliente?.razao_social || '',
              cliente_cnpj: cliente?.cnpj || '',
              cliente_endereco: cliente?.endereco || '',
              
              // Dados do título/boleto
              valor_documento: nota.valor_titulo.toFixed(2),
              valor_titulo: nota.valor_titulo.toFixed(2),
              data_vencimento: nota.data_vencimento,
              data_emissao: nota.data_emissao,
              nosso_numero: nota.numero_nota,
              numero_documento: nota.numero_nota,
              numero_nota: nota.numero_nota,
              
              // Dados do banco
              banco_nome: banco.nome_banco,
              banco_codigo: banco.codigo_banco,
              
              // Linha digitável e código de barras (placeholder)
              linha_digitavel: '00000.00000 00000.000000 00000.000000 0 00000000000000',
              codigo_barras: '00000000000000000000000000000000000000000000',
              
              // Local de pagamento padrão
              local_pagamento: 'PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO',
            };
            
            const pdfBytes = await renderizarBoleto(
              basePdfBytes,
              elementos,
              dadosBoleto,
            );
            
            // Download do PDF
            const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = tipoSaida === 'arquivo_unico' 
              ? `boletos_${Date.now()}.pdf`
              : `boleto_${nota.numero_nota}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            
            // Se arquivo único, gerar só uma vez com todos
            if (tipoSaida === 'arquivo_unico') break;
          }
          
          toast({
            title: 'Boletos gerados com sucesso!',
            description: `${notasSelecionadas.length} boleto(s) foram gerados usando o modelo "${modeloDB.nome_modelo}".`
          });
          return;
        }
      }
    } catch (err) {
      console.error('[GerarBoletos] Erro ao buscar modelo:', err);
    }

    // Fallback para geração com jsPDF
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