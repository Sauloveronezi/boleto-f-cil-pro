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
import { TipoOrigem, Cliente, NotaFiscal, ConfiguracaoCNAB, ModeloBoleto, ConfiguracaoBanco } from '@/types/boleto';
import { gerarPDFBoletos } from '@/lib/pdfGenerator';
import { renderizarBoleto, DadosBoleto, ElementoParaRender } from '@/lib/pdfModelRenderer';
import { parseCNAB, DadosCNAB } from '@/lib/cnabParser';
import { mapearBoletoApiParaModelo, BoletoApiData, mapearModeloParaCNAB } from '@/lib/boletoMapping';
import { useBancos } from '@/hooks/useBancos';
import { supabase } from '@/integrations/supabase/client';
import { getPdfUrl } from '@/lib/pdfStorage';
import { gerarArquivoCNABFromConfig, downloadArquivoCNAB } from '@/lib/cnabGenerator';
import { useQuery } from '@tanstack/react-query';
import { usePermissoes } from '@/hooks/usePermissoes';
import { format } from 'date-fns';
import { gerarCodigoBarras } from '@/lib/barcodeCalculator';

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
  const { hasPermission } = usePermissoes();

  const canCreate = hasPermission('boletos', 'criar');

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
  const [imprimirFundo, setImprimirFundo] = useState(false);

  const banco = bancos.find(b => b.id === bancoSelecionado) || {
    id: 'unknown',
    nome_banco: 'Banco Desconhecido',
    codigo_banco: '000',
    tipo_layout_padrao: 'CNAB_400',
    ativo: false
  } as any;

  // Carregar configuração bancária específica
  const { data: configuracao } = useQuery({
    queryKey: ['configuracao-banco', bancoSelecionado],
    enabled: !!bancoSelecionado,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_configuracoes_banco')
        .select('*')
        .eq('banco_id', bancoSelecionado)
        .is('deleted', null)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar configuração do banco:', error);
      }
      return data as ConfiguracaoBanco | null;
    }
  });

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

  // Buscar dados da empresa para preencher o beneficiário
  const { data: empresa } = useQuery({
    queryKey: ['empresa-dados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_empresas')
        .select('*')
        .is('deleted', null)
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar dados da empresa:', error);
      }
      return data;
    }
  });

  // Carregar dados da API (vv_b_boletos_api) quando selecionado
  const { data: dadosApi } = useQuery({
    queryKey: ['boletos-api-geracao'],
    enabled: tipoOrigem === 'API_CDS',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_boletos_api')
        .select('*')
        .is('deleted', null);
      
      if (error) {
        console.error('[GerarBoletos] Erro ao carregar dados da API:', error);
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar os dados da tabela vv_b_boletos_api.',
          variant: 'destructive'
        });
        return { clientes: [], notas: [] };
      }

      const clientesMap = new Map<string, Cliente>();
      const notas: NotaFiscal[] = [];

      data.forEach((item: any) => {
        // Mapear Cliente
        // Priorizar dados diretos da API pois o vínculo com tabela de clientes foi removido
        const clienteId = item.cliente_id || `temp_${item.id}`;
        
        if (!clientesMap.has(clienteId)) {
            const cliente: Cliente = {
                id: clienteId,
                business_partner: item.dados_extras?.business_partner || '',
                razao_social: item.dyn_nome_do_cliente || 'Cliente Desconhecido',
                cnpj: item.taxnumber1 || '',
                lzone: item.dados_extras?.lzone || '',
                estado: item.uf || '',
                cidade: item.dyn_cidade || '',
                parceiro_negocio: item.dados_extras?.parceiro_negocio || '',
                agente_frete: item.dyn_zonatransporte || '',
                endereco: item.dados_extras?.endereco || '',
                cep: item.dados_extras?.cep || '',
                email: item.dados_extras?.email || '',
                telefone: item.dados_extras?.telefone || ''
            };
            clientesMap.set(clienteId, cliente);
        }

        // Mapear Nota Fiscal
        notas.push({
            id: item.id,
            numero_nota: item.numero_nota,
            serie: item.dados_extras?.serie || '1',
            data_emissao: item.data_emissao,
            data_vencimento: item.data_vencimento,
            valor_titulo: item.valor || 0,
            moeda: 'BRL',
            codigo_cliente: clienteId,
            status: 'aberta',
            referencia_interna: item.numero_cobranca || '',
            cliente: clientesMap.get(clienteId),
            // @ts-ignore - Adicionando dados originais para uso posterior
            dados_api: item 
        } as NotaFiscal);
      });
      
      return { 
        clientes: Array.from(clientesMap.values()), 
        notas 
      };
    }
  });

  // Dados a usar
  const isCNAB = tipoOrigem === 'CNAB_240' || tipoOrigem === 'CNAB_400';
  const isAPI = tipoOrigem === 'API_CDS';
  
  const clientes: Cliente[] = isCNAB ? dadosCNAB?.clientes || [] : (isAPI ? dadosApi?.clientes || [] : []);
  const notas: NotaFiscal[] = isCNAB ? dadosCNAB?.notas || [] : (isAPI ? dadosApi?.notas || [] : []);

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
    if (!canCreate) {
      toast({
        title: 'Sem permissão',
        description: 'Você precisa de permissão de criação para gerar boletos.',
        variant: 'destructive',
      });
      return;
    }

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
          
          // Converter elementos para o formato esperado pelo renderizador, mantendo todas as propriedades de estilo
          const elementos: ElementoParaRender[] = camposMapeados.map((campo: any) => ({
            id: String(campo.id),
            tipo: campo.tipo || 'campo',
            nome: campo.nome || '',
            x: campo.posicao_x || 0,
            y: campo.posicao_y || 0,
            largura: campo.largura || 100,
            altura: campo.altura || 20,
            variavel: campo.variavel || '',
            textoFixo: campo.textoFixo || '',
            corTexto: campo.corTexto || '#000000',
            tamanhoFonte: campo.tamanhoFonte || 10,
            alinhamento: campo.alinhamento || 'left',
            corFundo: campo.corFundo || 'transparent',
            negrito: campo.negrito || false,
            italico: campo.italico || false,
            bordaSuperior: campo.bordaSuperior || false,
            bordaInferior: campo.bordaInferior || false,
            bordaEsquerda: campo.bordaEsquerda || false,
            bordaDireita: campo.bordaDireita || false,
            espessuraBorda: campo.espessuraBorda || 1,
            corBorda: campo.corBorda || '#000000',
            visivel: campo.visivel !== false, // default true
          }));
          
          console.log('[GerarBoletos] Elementos para render:', elementos.length);
          
          // Preparar lista de dados de todos os boletos
          const listaDadosBoletos: DadosBoleto[] = [];

          for (let i = 0; i < notasParaGerar.length; i++) {
            const nota = notasParaGerar[i];
            const cliente = clientes.find(c => c.id === nota.codigo_cliente);
            
            // @ts-ignore
            const dadosApiItem = nota.dados_api;

            // Configuração para cálculo do código de barras
            const dadosCNABPartial = (tipoOrigem === 'CNAB_240' || tipoOrigem === 'CNAB_400') ? (dadosApiItem as Partial<DadosBoleto>) : undefined;
            
            const configParaBarcode = {
                agencia: dadosCNABPartial?.agencia || configuracao?.agencia || '0000',
                conta: dadosCNABPartial?.conta || configuracao?.conta || '00000',
                carteira: dadosCNABPartial?.carteira || configuracao?.carteira || '17',
                codigo_cedente: dadosCNABPartial?.codigo_cedente || configuracao?.codigo_cedente || '',
                convenio: configuracao?.convenio || '1234567',
            };

            // Gerar código de barras e linha digitável
            const dadosBarcode = gerarCodigoBarras(banco, nota, configParaBarcode as any);

            let dadosBoleto: DadosBoleto;

            // Se for CNAB e já tivermos os dados pré-mapeados
            if (dadosCNABPartial && 'pagador_nome' in dadosApiItem) {
                dadosBoleto = {
                    ...dadosApiItem,
                    // Garante campos calculados
                    linha_digitavel: dadosBarcode.linhaDigitavel,
                    codigo_barras: dadosBarcode.codigoBarras,
                    nosso_numero: dadosBarcode.nossoNumero,
                    
                    // Garante dados do banco
                    banco_nome: banco.nome_banco || '',
                    banco_codigo: banco.codigo_banco || '',
                    
                    // Fallbacks para campos obrigatórios se faltarem no CNAB
                    valor_documento: dadosApiItem.valor_documento || dadosBarcode.valorFormatado,
                    valor_cobrado: dadosApiItem.valor_cobrado || dadosBarcode.valorFormatado,
                    data_processamento: dadosApiItem.data_processamento || format(new Date(), 'dd/MM/yyyy'),
                    local_pagamento: dadosApiItem.local_pagamento || 'PAGÁVEL EM QUALQUER AGÊNCIA BANCÁRIA ATÉ O VENCIMENTO',
                } as DadosBoleto;
            } else {
                // Fluxo API
                const boletoData: BoletoApiData = dadosApiItem || {
                  id: nota.id,
                  numero_nota: nota.numero_nota,
                  numero_cobranca: nota.referencia_interna,
                  data_emissao: nota.data_emissao,
                  data_vencimento: nota.data_vencimento,
                  valor: nota.valor_titulo,
                  dados_extras: {},
                };

                dadosBoleto = mapearBoletoApiParaModelo(
                  boletoData,
                  cliente,
                  empresa,
                  banco,
                  configuracao,
                  dadosBarcode
                );
            }
            listaDadosBoletos.push(dadosBoleto);
          }

          // Importar função de geração
          const { gerarBoletosComModelo } = await import('@/lib/pdfModelRenderer');
          
          if (tipoSaida === 'arquivo_unico') {
             const pdfBytes = await gerarBoletosComModelo(
               modeloDB.pdf_storage_path,
               elementos,
               listaDadosBoletos,
               2,
               imprimirFundo
             );
             
             // Download único
             const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = `boletos_${Date.now()}.pdf`;
             a.click();
             URL.revokeObjectURL(url);

          } else {
             // Gerar individualmente
             for (let i = 0; i < listaDadosBoletos.length; i++) {
                const dadosBoleto = listaDadosBoletos[i];
                const nota = notasParaGerar[i];
                
                const pdfBytes = await renderizarBoleto(
                  basePdfBytes,
                  elementos,
                  dadosBoleto,
                  2,
                  imprimirFundo
                );
                
                const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `boleto_${nota.numero_nota}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
             }
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
  const handleGerarCNAB = async () => {
    if (!banco || !tipoOrigem) return;

    // 1. Obter configuração CNAB
    let configCNAB = padraoCNAB;
    
    // Se não tiver padrão selecionado (API), tenta buscar o padrão do banco
    if (!configCNAB && bancoSelecionado) {
        try {
            const { data } = await supabase
                .from('vv_b_configuracoes_cnab')
                .select('*')
                .eq('banco_id', bancoSelecionado)
                .is('deleted', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
                
            if (data) {
                configCNAB = {
                    id: data.id,
                    banco_id: data.banco_id || '',
                    tipo_cnab: (data.tipo_cnab as any) || 'CNAB_400',
                    nome: data.nome,
                    descricao: data.descricao || '',
                    campos: (data.campos as any[]) || [],
                    linhas: (data.linhas as any[]) || undefined,
                    criado_em: data.created_at,
                    atualizado_em: data.updated_at
                };
            } else {
                toast({
                    title: 'Configuração CNAB não encontrada',
                    description: 'Configure um padrão CNAB para este banco antes de exportar.',
                    variant: 'destructive'
                });
                return;
            }
        } catch (error) {
            console.error('Erro ao buscar config CNAB:', error);
            return;
        }
    }

    if (!configCNAB) return;

    // 2. Filtrar notas
    const notasParaGerar = notas.filter(n => notasSelecionadas.includes(n.id));
    
    // 3. Gerar dados para cada boleto
    const registrosCNAB: Record<string, string>[] = [];
    
    for (const nota of notasParaGerar) {
        const cliente = clientes.find(c => c.id === nota.codigo_cliente);
        
        // @ts-ignore
        const dadosApiItem = nota.dados_api;
        
        // Dados para barcode
        const configParaBarcode = {
            agencia: configuracao?.agencia || '0000',
            conta: configuracao?.conta || '00000',
            carteira: configuracao?.carteira || '17',
            codigo_cedente: configuracao?.codigo_cedente || '',
            convenio: configuracao?.convenio || '1234567',
        };

        const dadosBarcode = gerarCodigoBarras(banco, nota, configParaBarcode as any);

        // Mapear para DadosBoleto
        const boletoData: BoletoApiData = dadosApiItem || {
            id: nota.id,
            numero_nota: nota.numero_nota,
            numero_cobranca: nota.referencia_interna,
            data_emissao: nota.data_emissao,
            data_vencimento: nota.data_vencimento,
            valor: nota.valor_titulo,
            dados_extras: {},
        };

        const dadosBoleto = mapearBoletoApiParaModelo(
            boletoData,
            cliente,
            empresa,
            banco,
            configuracao,
            dadosBarcode
        );

        // Mapear para registro CNAB
        const registro = mapearModeloParaCNAB(dadosBoleto);
        registrosCNAB.push(registro);
    }

    // 4. Gerar conteúdo do arquivo
    const conteudo = gerarArquivoCNABFromConfig(
        configCNAB, 
        registrosCNAB, 
        'remessa'
    );
    
    // 5. Download
    downloadArquivoCNAB(conteudo, `remessa_${banco.nome_banco}_${Date.now()}`, 'remessa');
    
    toast({
        title: 'Arquivo CNAB gerado',
        description: `${registrosCNAB.length} registros exportados com sucesso.`
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
        return (
          <ResumoGeracao
            tipoOrigem={tipoOrigem}
            banco={banco}
            clientes={clientes}
            clientesSelecionados={clientesSelecionados}
            notas={notas}
            notasSelecionadas={notasSelecionadas}
            modelos={modelos}
            modeloSelecionado={modeloSelecionado}
            onModeloChange={setModeloSelecionado}
            tipoSaida={tipoSaida}
            onTipoSaidaChange={setTipoSaida}
            onGerar={handleGerar}
            onGerarCNAB={(isCNAB || isAPI) ? handleGerarCNAB : undefined}
            imprimirFundo={imprimirFundo}
            onImprimirFundoChange={setImprimirFundo}
          />
        );
      default:
        return null;
    }
  };
  return <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerar Boletos</h1>
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