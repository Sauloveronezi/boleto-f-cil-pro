import { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar, Search, Filter, Printer, FileText, RefreshCw, Layers, AlertTriangle, Info, ChevronDown, SlidersHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBoletosApi, useSyncApi, useApiIntegracoes } from '@/hooks/useApiIntegracao';
import { useClientes } from '@/hooks/useClientes';
import { useBancos } from '@/hooks/useBancos';
import { useConfiguracoesBanco } from '@/hooks/useConfiguracoesBanco';
import { usePermissoes } from '@/hooks/usePermissoes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { gerarPDFBoletos } from '@/lib/pdfGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { gerarBoletosComModelo, downloadPDF, DadosBoleto as DadosBoletoModelo, ElementoParaRender } from '@/lib/pdfModelRenderer';
import { gerarCodigoBarras } from '@/lib/barcodeCalculator';
import { mapearBoletoApiParaModelo } from '@/lib/boletoMapping';
import { mapBoletoApiToDadosBoleto, type ConfigBancoParaCalculo, type MapeamentoCampo } from '@/lib/boletoDataMapper';
import { useBoletoTemplates, useBoletoTemplateFields, useSeedDefaultTemplate } from '@/hooks/useBoletoTemplates';
import { renderBoletosV2, downloadPdfV2 } from '@/lib/templateRendererV2';
import { useBoletosApiConfigColunas, useBoletosApiConfigFiltros, BoletosApiConfigItem } from '@/hooks/useBoletosApiConfig';
import { BoletosApiConfigDialog } from '@/components/boleto/BoletosApiConfigDialog';

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function BoletosApi() {
  const { toast } = useToast();
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [integracaoSelecionada, setIntegracaoSelecionada] = useState<string>('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [ocultarEmitidos, setOcultarEmitidos] = useState(true);
  const [bancoSelecionado, setBancoSelecionado] = useState<string>('');
  const [modeloSelecionado, setModeloSelecionado] = useState<string>('');
  const [imprimirFundo, setImprimirFundo] = useState(true);
  const [barcodeConflicts, setBarcodeConflicts] = useState<{ nota: string; antigo: string; novo: string }[]>([]);
  const [showBarcodeAlert, setShowBarcodeAlert] = useState(false);
  const [pendingPrintAction, setPendingPrintAction] = useState<(() => Promise<void>) | null>(null);
  const [boletosComFalha, setBoletosComFalha] = useState<any[]>([]);
  const [showFalhaDialog, setShowFalhaDialog] = useState(false);
  const [idsComErro, setIdsComErro] = useState<Set<string>>(new Set());
  const [filtrarComErros, setFiltrarComErros] = useState(false);
  const [duplicadosSync, setDuplicadosSync] = useState<{ chave: string; numero_nota: string; numero_cobranca: string }[]>([]);
  const [showDuplicadosDialog, setShowDuplicadosDialog] = useState(false);

  const { data: clientes } = useClientes();
  const { data: integracoes } = useApiIntegracoes();
  const { data: bancos } = useBancos();
  const { data: configuracoes } = useConfiguracoesBanco();
  const { hasPermission, isLoading: isLoadingPermissoes } = usePermissoes();
  const isAdmin = hasPermission('configuracoes', 'editar');
  const canPrint = hasPermission('boletos', 'criar');

  // Config dinâmica de colunas e filtros
  const { data: colunasVisiveis } = useBoletosApiConfigColunas();
  const { data: filtrosVisiveis, primarios: filtrosPrimarios, secundarios: filtrosSecundarios } = useBoletosApiConfigFiltros();
  const [showSecundarios, setShowSecundarios] = useState(false);
  

  const { data: boletos, isLoading, refetch } = useBoletosApi({
    dataEmissaoInicio: filtros.dataEmissaoInicio || undefined,
    dataEmissaoFim: filtros.dataEmissaoFim || undefined,
    clienteId: filtros.clienteId || undefined,
    cnpj: filtros.cnpj || undefined,
    estado: filtros.estado || undefined,
    cidade: filtros.cidade || undefined
  });

  const { data: templatesV2 } = useBoletoTemplates();
  const { data: templateFieldsV2 } = useBoletoTemplateFields(modeloSelecionado || undefined);
  const seedDefault = useSeedDefaultTemplate();

  // Carregar mapeamento dinâmico de campos do boleto
  const { data: mapeamentosCampo = [] } = useQuery({
    queryKey: ['boleto-campo-mapeamento-api'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vv_b_boleto_campo_mapeamento')
        .select('campo_boleto, fonte_campo, tipo_transformacao, parametros, ativo')
        .is('deleted', null)
        .eq('ativo', true)
        .order('ordem');
      return (data || []) as MapeamentoCampo[];
    }
  });

  const { data: modelos } = useQuery({
    queryKey: ['modelos-boleto-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_modelos_boleto')
        .select('id, nome_modelo, banco_id, pdf_storage_path')
        .is('deleted', null)
        .order('nome_modelo');
      if (error) throw error;
      return data || [];
    }
  });

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

  const syncApi = useSyncApi();

  const getNested = (obj: any, path: string): any => {
    try {
      return path.split('.').reduce((o, k) => (o && k in o ? o[k] : undefined), obj);
    } catch {
      return undefined;
    }
  };

  const getCnpj = (b: any) => {
    const candidates = [
      b.taxnumber1, getNested(b, 'dados_extras.taxnumber1'),
      getNested(b, 'dados_extras.cnpj'), getNested(b, 'dados_extras.cpf_cnpj'),
      getNested(b, 'dados_extras.cnpj_cliente'), getNested(b, 'dados_extras.cnpj_pagador'),
      getNested(b, 'dados_extras.PAY_BP_TAXNO'),
      b.pagador_cnpj, b.cnpj_cliente, b.cnpj, b.cliente?.cnpj, b.cliente?.cpf_cnpj
    ];
    return candidates.find((v) => !!v && String(v).trim().length > 0) || '-';
  };

  const getTransportadora = (b: any) => {
    const candidates = [
      b.dyn_zonatransporte, b.cliente?.agente_frete,
      getNested(b, 'dados_extras.transportadora'), getNested(b, 'dados_extras.agente_frete'),
    ];
    return candidates.find((v) => !!v && String(v).trim().length > 0) || '-';
  };

  // Resolver valor de uma coluna dinâmica
  const getCellValue = (boleto: any, chave: string): any => {
    switch (chave) {
      case 'numero_nota': return boleto.numero_nota;
      case 'numero_cobranca': return boleto.numero_cobranca;
      case 'cliente': return boleto.dyn_nome_do_cliente || boleto.cliente?.razao_social || '-';
      case 'cnpj': return getCnpj(boleto);
      case 'transportadora': return getTransportadora(boleto);
      case 'banco': {
        const codigoBanco = boleto.banco?.replace(/\D/g, '').substring(0, 3);
        const bancoInfo = bancos?.find(b => b.codigo_banco.trim() === codigoBanco);
        return bancoInfo ? `${bancoInfo.codigo_banco.trim()} - ${bancoInfo.nome_banco}` : (boleto.banco || '-');
      }
      case 'data_emissao':
        if (!boleto.data_emissao) return '-';
        // Append T12:00 to avoid UTC timezone shift showing previous day
        return format(new Date(String(boleto.data_emissao).substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR });
      case 'data_vencimento':
        if (!boleto.data_vencimento) return '-';
        return format(new Date(String(boleto.data_vencimento).substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR });
      case 'valor':
        return boleto.valor !== null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(boleto.valor) : '-';
      case 'status':
        return boleto.dados_extras?.status_sap || 'ativo';
      default: {
        // Tentar campo direto ou via dados_extras
        const val = boleto[chave] ?? getNested(boleto, `dados_extras.${chave}`);
        return val !== undefined && val !== null ? String(val) : '-';
      }
    }
  };

  // Extrair estados e cidades únicos dos dados para filtros de seleção
  const estadosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    boletos?.forEach((b: any) => {
      const uf = b.uf || getNested(b, 'dados_extras.uf') || '';
      if (uf && String(uf).trim()) set.add(String(uf).trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [boletos]);

  const cidadesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    boletos?.forEach((b: any) => {
      const cidade = b.dyn_cidade || getNested(b, 'dados_extras.cidade') || '';
      const uf = b.uf || getNested(b, 'dados_extras.uf') || '';
      if (!cidade || !String(cidade).trim()) return;
      // Se estado selecionado, filtrar cidades daquele estado
      if (filtros.estado && String(uf).trim().toUpperCase() !== filtros.estado.toUpperCase()) return;
      set.add(String(cidade).trim());
    });
    return Array.from(set).sort();
  }, [boletos, filtros.estado]);

  // Filtrar boletos
  const boletosFiltrados = useMemo(() => {
    return boletos?.filter((b: any) => {
      if (ocultarEmitidos && b.cod_barras_calculado) return false;
      if (filtrarComErros && !idsComErro.has(b.id)) return false;
      if (filtros.transportadora) {
        const transportadora = getTransportadora(b);
        if (!String(transportadora).toLowerCase().includes(filtros.transportadora.toLowerCase())) return false;
      }
      if (bancoSelecionado) {
        const bancoFiltro = bancos?.find(banco => banco.id === bancoSelecionado);
        if (bancoFiltro) {
          const codigoBoleto = b.banco?.replace(/\D/g, '').substring(0, 3);
          if (codigoBoleto !== bancoFiltro.codigo_banco.trim()) return false;
        }
      }
      // Filtro estado
      if (filtros.estado) {
        const uf = b.uf || getNested(b, 'dados_extras.uf') || '';
        if (String(uf).trim().toUpperCase() !== filtros.estado.toUpperCase()) return false;
      }
      // Filtro cidade
      if (filtros.cidade) {
        const cidade = b.dyn_cidade || getNested(b, 'dados_extras.cidade') || '';
        if (String(cidade).trim().toLowerCase() !== filtros.cidade.toLowerCase()) return false;
      }
      // Filtro CNPJ (texto livre)
      if (filtros.cnpj) {
        const cnpj = getCnpj(b);
        if (!String(cnpj).includes(filtros.cnpj)) return false;
      }
      // Filtro cliente nome (texto livre)
      if (filtros.clienteNome) {
        const nome = b.dyn_nome_do_cliente || b.cliente?.razao_social || '';
        if (!String(nome).toLowerCase().includes(filtros.clienteNome.toLowerCase())) return false;
      }
      // Range filters for numbers (de->até)
      // numero_nota range
      if (filtros.numero_nota_de) {
        const val = String(b.numero_nota || '');
        if (val < filtros.numero_nota_de) return false;
      }
      if (filtros.numero_nota_ate) {
        const val = String(b.numero_nota || '');
        if (val > filtros.numero_nota_ate) return false;
      }
      // valor range
      if (filtros.valor_de) {
        if ((b.valor || 0) < parseFloat(filtros.valor_de)) return false;
      }
      if (filtros.valor_ate) {
        if ((b.valor || 0) > parseFloat(filtros.valor_ate)) return false;
      }
      // data_emissao range
      if (filtros.dataEmissaoInicio) {
        const dt = String(b.data_emissao || '').substring(0, 10);
        if (dt < filtros.dataEmissaoInicio) return false;
      }
      if (filtros.dataEmissaoFim) {
        const dt = String(b.data_emissao || '').substring(0, 10);
        if (dt > filtros.dataEmissaoFim) return false;
      }
      // data_vencimento range
      if (filtros.dataVencimentoInicio) {
        const dt = String(b.data_vencimento || '').substring(0, 10);
        if (dt < filtros.dataVencimentoInicio) return false;
      }
      if (filtros.dataVencimentoFim) {
        const dt = String(b.data_vencimento || '').substring(0, 10);
        if (dt > filtros.dataVencimentoFim) return false;
      }
      // Generic text filters for any other configured filter
      const handledKeys = new Set([
        'transportadora', 'estado', 'cidade', 'cnpj', 'clienteNome', 'clienteId',
        'numero_nota_de', 'numero_nota_ate', 'valor_de', 'valor_ate',
        'dataEmissaoInicio', 'dataEmissaoFim', 'dataVencimentoInicio', 'dataVencimentoFim',
      ]);
      for (const [key, val] of Object.entries(filtros)) {
        if (!val || handledKeys.has(key)) continue;
        const cellVal = getCellValue(b, key);
        if (!String(cellVal).toLowerCase().includes(val.toLowerCase())) return false;
      }
      return true;
    }) || [];
  }, [boletos, filtros, bancoSelecionado, bancos, ocultarEmitidos, filtrarComErros, idsComErro]);

  const todosIds = useMemo(() => boletosFiltrados.map((b: any) => b.id), [boletosFiltrados]);
  const todosSelecionados = todosIds.length > 0 && todosIds.every((id: string) => selecionados.has(id));

  const handleSelecionarTodos = (checked: boolean) => {
    setSelecionados(checked ? new Set(todosIds) : new Set());
  };

  const handleSelecionarItem = (id: string, checked: boolean) => {
    const novoSet = new Set(selecionados);
    if (checked) novoSet.add(id); else novoSet.delete(id);
    setSelecionados(novoSet);
  };

  const handleSincronizar = async () => {
    if (!integracaoSelecionada) {
      toast({ title: 'Selecione uma integração', description: 'Escolha a integração que deseja sincronizar', variant: 'destructive' });
      return;
    }
    try {
      const result = await syncApi.mutateAsync({ integracao_id: integracaoSelecionada });
      if (result.success) {
        const descParts = [`${result.registros_atualizados || 0} processados`];
        if (result.registros_duplicados > 0) {
          descParts.push(`${result.registros_duplicados} duplicados`);
        }
        toast({ title: 'Sincronização concluída', description: descParts.join(', ') });
        
        // Mostrar duplicados se houver
        if (result.duplicados && result.duplicados.length > 0) {
          setDuplicadosSync(result.duplicados);
          setShowDuplicadosDialog(true);
        }
        
        refetch();
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleLimparFiltros = () => {
    setFiltros({});
    setBancoSelecionado('');
    setSelecionados(new Set());
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleImprimirSelecionados = async (forceOverride = false) => {
    if (selecionados.size === 0) {
      toast({ title: 'Nenhum boleto selecionado', description: 'Selecione ao menos um boleto para imprimir', variant: 'destructive' });
      return;
    }

    const boletosSelecionados = boletosFiltrados.filter((b: any) => selecionados.has(b.id));
    const primeiroBoleto = boletosSelecionados[0];
    const codigoBancoBoleto = primeiroBoleto?.banco?.replace(/\D/g, '').substring(0, 3);
    const banco = bancos?.find(b => b.codigo_banco.trim() === codigoBancoBoleto);
    
    if (!banco) {
      toast({ title: 'Banco não identificado', description: 'Não foi possível identificar o banco nos boletos selecionados.', variant: 'destructive' });
      return;
    }

    const configuracao = configuracoes?.find(c => c.banco_id === banco.id);

    const boletosComFalhaLinhaDigitavel: string[] = [];
    const mapearDadosBoletos = (boletosList: any[]) => {
      return boletosList.map((boleto: any) => {
        // Extrair agência/conta dos dados da API (BankInternalID, BankAccountLongID)
        const extras = boleto.dados_extras || {};
        const bankInternalId = boleto.BankInternalID || boleto.bankinternalid || extras?.BankInternalID || extras?.bankinternalid || '';
        const bankAccountLongId = boleto.BankAccountLongID || boleto.bankaccountlongid || extras?.BankAccountLongID || extras?.bankaccountlongid || '';
        const bankControlKey = boleto.bankcontrolkey || extras?.bankcontrolkey || '';
        
        // BankInternalID pode conter banco+agência (ex: "34171463" = banco 341 + agência 1463)
        const agenciaApi = bankInternalId ? bankInternalId.toString().replace(/\D/g, '').slice(-4) : '';
        const contaApi = bankAccountLongId ? bankAccountLongId.toString().replace(/\D/g, '') : '';

        // Usar mapeamento dinâmico se disponível
        if (mapeamentosCampo.length > 0) {
          const benefEndereco = empresa
            ? [
                [empresa.endereco, empresa.numero].filter(Boolean).join(', '),
                empresa.complemento,
                empresa.bairro,
                [empresa.cidade, empresa.estado].filter(Boolean).join(' - '),
                empresa.cep,
              ].filter(Boolean).join(' - ')
            : '';
          const configCalculo: ConfigBancoParaCalculo = {
            agencia: agenciaApi || configuracao?.agencia || '',
            conta: contaApi || configuracao?.conta || '',
            carteira: configuracao?.carteira || '09',
            nomeBanco: banco.nome_banco || '',
            beneficiarioNome: empresa?.razao_social || '',
            beneficiarioCnpj: empresa?.cnpj || '',
            beneficiarioEndereco: benefEndereco,
            textoInstrucaoPadrao: configuracao?.texto_instrucao_padrao || '',
            taxaJurosMensal: configuracao?.taxa_juros_mensal || 0,
            multaPercentual: configuracao?.multa_percentual || 0,
            diasCarencia: configuracao?.dias_carencia || 0,
          };
          const dados = mapBoletoApiToDadosBoleto(boleto, configCalculo, mapeamentosCampo);
          // Inject bank logo and formatted code
          dados.banco_logo_url = banco.logo_url || '';
          const dvBanco: Record<string, string> = { '237': '2', '341': '7', '033': '7', '001': '9', '104': '0' };
          dados.banco_codigo_formatado = `${banco.codigo_banco.trim()}-${dvBanco[banco.codigo_banco.trim()] || '0'}`;
          if (!dados.linha_digitavel) {
            boletosComFalhaLinhaDigitavel.push(boleto.numero_nota || boleto.id);
          }
          return dados;
        }

        // Fallback: mapeamento hardcoded legado
        const notaFiscal = {
          id: boleto.id,
          numero_nota: boleto.numero_nota || boleto.documento || '',
          serie: boleto.dados_extras?.serie || '1',
          data_emissao: boleto.data_emissao || new Date().toISOString().split('T')[0],
          data_vencimento: boleto.data_vencimento || new Date().toISOString().split('T')[0],
          valor_titulo: boleto.valor || 0,
          moeda: 'BRL',
          codigo_cliente: boleto.cliente_id || '',
          status: 'aberta' as const,
          referencia_interna: boleto.numero_cobranca || ''
        };
        
        const configOverride = configuracao ? { ...configuracao } : undefined;
        if (configOverride && agenciaApi) configOverride.agencia = agenciaApi;
        if (configOverride && contaApi) configOverride.conta = contaApi;
        if (configOverride && bankControlKey) (configOverride as any).conta_dv = bankControlKey;
        
        const dadosCodigoBarras = gerarCodigoBarras(banco, notaFiscal, configOverride);
        const dados = mapearBoletoApiParaModelo(boleto, undefined, empresa, banco, configuracao, dadosCodigoBarras);
        // Inject bank logo and formatted code
        dados.banco_logo_url = banco.logo_url || '';
        const dvBancoLegacy: Record<string, string> = { '237': '2', '341': '7', '033': '7', '001': '9', '104': '0' };
        dados.banco_codigo_formatado = `${banco.codigo_banco.trim()}-${dvBancoLegacy[banco.codigo_banco.trim()] || '0'}`;
        if (!dados.linha_digitavel) {
          boletosComFalhaLinhaDigitavel.push(boleto.numero_nota || boleto.id);
        }
        return dados;
      });
    };

  const salvarLinhaDigitavelNoBanco = async (boletosList: any[], dadosBoletos: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;
    const agora = new Date().toISOString();

    for (let i = 0; i < boletosList.length; i++) {
      const boleto = boletosList[i];
      const dados = dadosBoletos[i];
      if (!dados.linha_digitavel || !dados.codigo_barras) continue;

      try {
        // Salvar código de barras na tabela do boleto importado
        await supabase.from('vv_b_boletos_api' as any)
          .update({
            cod_barras_calculado: dados.codigo_barras,
            linha_digitavel_calculada: dados.linha_digitavel,
            updated_at: agora,
          } as any)
          .eq('id', boleto.id);

        // Registrar na tabela de boletos gerados
        await supabase.from('vv_b_boletos_gerados').insert({
          nota_fiscal_id: null,
          modelo_boleto_id: modeloSelecionado || null,
          banco_id: banco.id,
          nosso_numero: dados.nosso_numero || '',
          linha_digitavel: dados.linha_digitavel,
          codigo_barras: dados.codigo_barras,
          valor: boleto.valor || 0,
          data_vencimento: boleto.data_vencimento || null,
          status: 'gerado',
          usuario_emissao_id: userId,
          data_emissao_boleto: agora,
        } as any);
      } catch (err) {
        console.warn('[BoletosApi] Erro ao salvar linha digitável:', err);
      }
    }
  };

    // ===== Validar código de barras: deve ser 44 dígitos numéricos =====
    const dadosBoletosCalc = mapearDadosBoletos(boletosSelecionados);
    
    const isCodigoBarrasValido = (cod: string | undefined | null): boolean => {
      if (!cod) return false;
      const limpo = String(cod).trim();
      return /^\d{44}$/.test(limpo);
    };

    // Separar boletos válidos dos inválidos
    const boletosValidos: any[] = [];
    const dadosValidos: any[] = [];
    const boletosInvalidos: any[] = [];

    for (let i = 0; i < boletosSelecionados.length; i++) {
      const boleto = boletosSelecionados[i];
      const dados = dadosBoletosCalc[i];
      if (isCodigoBarrasValido(dados?.codigo_barras) && dados?.linha_digitavel) {
        boletosValidos.push(boleto);
        dadosValidos.push(dados);
      } else {
        boletosInvalidos.push(boleto);
      }
    }

    // Se há boletos inválidos, exibir diálogo de erro
    if (boletosInvalidos.length > 0) {
      setBoletosComFalha(boletosInvalidos);
      setShowFalhaDialog(true);
      // Marcar IDs com erro para destaque na tabela
      setIdsComErro(prev => {
        const novo = new Set(prev);
        boletosInvalidos.forEach((b: any) => novo.add(b.id));
        return novo;
      });
    }
    // Remover IDs válidos do set de erros (caso tenham sido corrigidos)
    if (boletosValidos.length > 0) {
      setIdsComErro(prev => {
        const novo = new Set(prev);
        boletosValidos.forEach((b: any) => novo.delete(b.id));
        return novo.size !== prev.size ? novo : prev;
      });
    }

    // Se NENHUM boleto é válido, abortar completamente
    if (boletosValidos.length === 0) {
      toast({ 
        title: 'Emissão cancelada', 
        description: `Nenhum dos ${boletosSelecionados.length} boleto(s) possui código de barras válido. Verifique as configurações bancárias.`, 
        variant: 'destructive' 
      });
      return;
    }

    // ===== Verificar conflito de código de barras (apenas válidos) =====
    if (!forceOverride) {
      const conflicts: { nota: string; antigo: string; novo: string }[] = [];
      for (let i = 0; i < boletosValidos.length; i++) {
        const boleto = boletosValidos[i];
        const novoBarras = dadosValidos[i]?.codigo_barras;
        const barrasExistente = (boleto as any).cod_barras_calculado;
        if (novoBarras && barrasExistente && String(barrasExistente) !== String(novoBarras)) {
          conflicts.push({
            nota: boleto.numero_nota || boleto.id,
            antigo: String(barrasExistente),
            novo: novoBarras,
          });
        }
      }
      if (conflicts.length > 0) {
        setBarcodeConflicts(conflicts);
        setPendingPrintAction(() => () => handleImprimirSelecionados(true));
        setShowBarcodeAlert(true);
        return;
      }
    }

    // Tentar template V2
    const templateV2 = templatesV2?.find(t => t.id === modeloSelecionado);
    if (templateV2 && templateFieldsV2 && templateFieldsV2.length > 0) {
      try {
        const msgExtra = boletosInvalidos.length > 0 ? ` (${boletosInvalidos.length} excluído(s) por erro)` : '';
        toast({ title: 'Gerando boletos...', description: `${boletosValidos.length} boleto(s)${msgExtra}` });
        const renderOpts = imprimirFundo
          ? { usarFundo: true }
          : { usarFundo: false, debugBorders: false, borderColor: { r: 0, g: 0, b: 0 }, labelFontSize: 5 };
        const pdfBytes = await renderBoletosV2(templateV2, templateFieldsV2, dadosValidos, renderOpts);
        const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '');
        downloadPdfV2(pdfBytes, `boletos_${banco.codigo_banco}_${dataAtual}.pdf`);
        await salvarLinhaDigitavelNoBanco(boletosValidos, dadosValidos);
        toast({ title: 'PDF gerado com sucesso', description: `${boletosValidos.length} boleto(s) gerado(s) com "${templateV2.name}"${msgExtra}` });
      } catch (error: any) {
        console.error('[BoletosApi] Erro V2:', error);
        toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
      }
      return;
    }

    // Fallback modelo legado
    if (modeloSelecionado) {
      const modelo = modelos?.find(m => m.id === modeloSelecionado);
      if (!modelo) { toast({ title: 'Modelo não encontrado', variant: 'destructive' }); return; }
      if (!modelo.pdf_storage_path) { toast({ title: 'Modelo sem PDF', variant: 'destructive' }); return; }
      try {
        const msgExtra = boletosInvalidos.length > 0 ? ` (${boletosInvalidos.length} excluído(s) por erro)` : '';
        toast({ title: 'Gerando boletos...', description: `${boletosValidos.length} boleto(s)${msgExtra}` });
        const { data: modeloCompleto, error: modeloError } = await supabase
          .from('vv_b_modelos_boleto').select('campos_mapeados').eq('id', modeloSelecionado).single();
        if (modeloError) throw new Error('Erro ao carregar modelo');
        const elementos: ElementoParaRender[] = (modeloCompleto?.campos_mapeados as any[])?.map((c: any) => ({
          id: c.id || `field_${Date.now()}`, tipo: c.tipo || 'campo', nome: c.nome || '',
          x: c.posicao_x ?? c.x ?? 0, y: c.posicao_y ?? c.y ?? 0,
          largura: c.largura || 100, altura: c.altura || 20,
          variavel: c.variavel || '', textoFixo: c.textoFixo, fonte: c.fonte,
          tamanhoFonte: c.tamanhoFonte, negrito: c.negrito, italico: c.italico,
          alinhamento: c.alinhamento, corTexto: c.corTexto, corFundo: c.corFundo,
          bordaSuperior: c.bordaSuperior, bordaInferior: c.bordaInferior,
          bordaEsquerda: c.bordaEsquerda, bordaDireita: c.bordaDireita,
          espessuraBorda: c.espessuraBorda, corBorda: c.corBorda, visivel: c.visivel ?? true,
        })) || [];
        const pdfBytes = await gerarBoletosComModelo(modelo.pdf_storage_path, elementos, dadosValidos, undefined, imprimirFundo);
        const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '');
        downloadPDF(pdfBytes, `boletos_${banco.codigo_banco}_${dataAtual}.pdf`);
        await salvarLinhaDigitavelNoBanco(boletosValidos, dadosValidos);
        toast({ title: 'PDF gerado com sucesso', description: `${boletosValidos.length} boleto(s) gerado(s) com "${modelo.nome_modelo}"${msgExtra}` });
      } catch (error: any) {
        console.error('[BoletosApi] Erro legado:', error);
        toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
      }
      return;
    }

    // Fallback sem modelo - usar apenas boletos válidos
    const notasParaImprimir = boletosValidos.map((boleto: any) => ({
      id: boleto.id, numero_nota: boleto.numero_nota,
      serie: boleto.dados_extras?.serie || '1', codigo_cliente: boleto.cliente_id || '',
      data_emissao: boleto.data_emissao || new Date().toISOString().split('T')[0],
      data_vencimento: boleto.data_vencimento || new Date().toISOString().split('T')[0],
      valor_titulo: boleto.valor || 0, moeda: 'BRL', status: 'aberta' as const,
      referencia_interna: boleto.numero_cobranca || ''
    }));

    const clientesParaImprimir = boletosValidos
      .map((b: any) => b.cliente || {
        id: b.cliente_id || b.id,
        razao_social: b.dyn_nome_do_cliente || 'Cliente Sem Nome',
        cnpj: (getCnpj(b) === '-' ? '' : getCnpj(b)),
        endereco: b.endereco || '', cidade: b.dyn_cidade || '',
        estado: b.uf || '', cep: b.cep || '', agente_frete: b.dyn_zonatransporte || ''
      })
      .filter((cliente: any, index: number, self: any[]) => 
        index === self.findIndex((c) => c.id === cliente.id)
      );

    try {
      const msgExtra = boletosInvalidos.length > 0 ? ` (${boletosInvalidos.length} excluído(s) por erro)` : '';
      gerarPDFBoletos(notasParaImprimir, clientesParaImprimir, banco, configuracao, 'API_CDS', 'arquivo_unico');
      toast({ title: 'PDF gerado com sucesso', description: `${boletosValidos.length} boleto(s) gerado(s)${msgExtra}` });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  // Detect filter type from key
  const getFilterType = (chave: string): 'date' | 'number' | 'estado' | 'cidade' | 'text' | 'cnpj' | 'cliente' => {
    const lower = chave.toLowerCase();
    if (lower.includes('data') || lower.includes('date') || lower === 'postingdate') return 'date';
    if (lower === 'estado' || lower === 'uf' || lower === 'payeeregion') return 'estado';
    if (lower === 'cidade' || lower === 'dyn_cidade') return 'cidade';
    if (lower === 'cnpj' || lower.includes('taxnumber') || lower.includes('cnpj')) return 'cnpj';
    if (lower === 'clienteid' || lower === 'cliente' || lower === 'dyn_nome_do_cliente' || lower.includes('nome')) return 'cliente';
    if (lower === 'valor' || lower.includes('amount') || lower === 'numero_nota' || lower === 'numero_cobranca' || lower === 'nosso_numero') return 'number';
    return 'text';
  };

  // Renderizar um filtro dinâmico
  const renderFiltro = (filtroConfig: BoletosApiConfigItem) => {
    const { chave, label } = filtroConfig;
    const tipo = getFilterType(chave);

    // Estado - select com estados existentes nos dados
    if (tipo === 'estado') {
      return (
        <div key={chave}>
          <Label className="text-xs">{label}</Label>
          <Select value={filtros.estado || ''} onValueChange={(v) => {
            setFiltros(f => ({ ...f, estado: v === 'all' ? '' : v, cidade: '' })); // limpa cidade ao mudar estado
          }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {estadosDisponiveis.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Cidade - select com cidades filtradas pelo estado
    if (tipo === 'cidade') {
      return (
        <div key={chave}>
          <Label className="text-xs">{label}</Label>
          <Select value={filtros.cidade || ''} onValueChange={(v) => setFiltros(f => ({ ...f, cidade: v === 'all' ? '' : v }))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {cidadesDisponiveis.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // CNPJ - texto digitado
    if (tipo === 'cnpj') {
      return (
        <div key={chave}>
          <Label className="text-xs">{label}</Label>
          <Input
            value={filtros.cnpj || ''}
            onChange={(e) => setFiltros(f => ({ ...f, cnpj: e.target.value }))}
            placeholder="Digite o CNPJ..."
            className="mt-1"
          />
        </div>
      );
    }

    // Cliente nome - texto digitado
    if (tipo === 'cliente') {
      return (
        <div key={chave}>
          <Label className="text-xs">{label}</Label>
          <Input
            value={filtros.clienteNome || ''}
            onChange={(e) => setFiltros(f => ({ ...f, clienteNome: e.target.value }))}
            placeholder="Digite o nome..."
            className="mt-1"
          />
        </div>
      );
    }

    // Data - range de->até
    if (tipo === 'date') {
      const keyDe = chave.includes('vencimento') ? 'dataVencimentoInicio' : 'dataEmissaoInicio';
      const keyAte = chave.includes('vencimento') ? 'dataVencimentoFim' : 'dataEmissaoFim';
      return (
        <div key={chave} className="col-span-1 md:col-span-2">
          <Label className="text-xs">{label}</Label>
          <div className="flex gap-2 mt-1">
            <div className="flex-1">
              <Input type="date" value={filtros[keyDe] || ''} onChange={(e) => setFiltros(f => ({ ...f, [keyDe]: e.target.value }))} placeholder="De" />
            </div>
            <span className="self-center text-xs text-muted-foreground">até</span>
            <div className="flex-1">
              <Input type="date" value={filtros[keyAte] || ''} onChange={(e) => setFiltros(f => ({ ...f, [keyAte]: e.target.value }))} placeholder="Até" />
            </div>
          </div>
        </div>
      );
    }

    // Número - range de->até
    if (tipo === 'number') {
      const keyDe = `${chave}_de`;
      const keyAte = `${chave}_ate`;
      return (
        <div key={chave} className="col-span-1 md:col-span-2">
          <Label className="text-xs">{label}</Label>
          <div className="flex gap-2 mt-1">
            <div className="flex-1">
              <Input value={filtros[keyDe] || ''} onChange={(e) => setFiltros(f => ({ ...f, [keyDe]: e.target.value }))} placeholder="De" />
            </div>
            <span className="self-center text-xs text-muted-foreground">até</span>
            <div className="flex-1">
              <Input value={filtros[keyAte] || ''} onChange={(e) => setFiltros(f => ({ ...f, [keyAte]: e.target.value }))} placeholder="Até" />
            </div>
          </div>
        </div>
      );
    }

    // Texto padrão
    return (
      <div key={chave}>
        <Label className="text-xs">{label}</Label>
        <Input value={filtros[chave] || ''} onChange={(e) => setFiltros(f => ({ ...f, [chave]: e.target.value }))} placeholder={label} className="mt-1" />
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Boletos via API</h1>
            <p className="text-muted-foreground">
              Dados importados da API SAP/ERP para impressão de boletos
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={integracaoSelecionada} onValueChange={setIntegracaoSelecionada}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecione integração" /></SelectTrigger>
              <SelectContent>
                {integracoes?.map((i) => (<SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSincronizar} disabled={syncApi.isPending || !integracaoSelecionada} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${syncApi.isPending ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
            <Select value={bancoSelecionado} onValueChange={(v) => setBancoSelecionado(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar banco" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os bancos</SelectItem>
                {bancos?.filter(b => b.ativo).map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.codigo_banco.trim()} - {b.nome_banco}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={modeloSelecionado} onValueChange={setModeloSelecionado}>
              <SelectTrigger className="w-[200px]">
                <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Modelo de layout" />
              </SelectTrigger>
              <SelectContent>
                {templatesV2?.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name} {t.is_default && '⭐'}</SelectItem>))}
                {modelos?.filter(m => !templatesV2?.some(t => t.id === m.id)).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome_modelo} (legado)</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {modeloSelecionado && (
              <div className="flex items-center space-x-2 bg-muted p-2 rounded border border-border">
                <Checkbox id="imprimir-fundo-api" checked={imprimirFundo} onCheckedChange={(checked) => setImprimirFundo(!!checked)} />
                <Label htmlFor="imprimir-fundo-api" className="text-xs cursor-pointer">Fundo</Label>
              </div>
            )}

            <Button className="gap-2" onClick={() => handleImprimirSelecionados()}
              disabled={selecionados.size === 0 || (!canPrint && !isLoadingPermissoes)}
              title={isLoadingPermissoes ? "Carregando..." : selecionados.size === 0 ? "Selecione boletos" : !canPrint ? "Sem permissão" : "Imprimir selecionados"}
            >
              {isLoadingPermissoes ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              Imprimir ({selecionados.size})
            </Button>

            {/* Botão config - somente admin */}
            {isAdmin && <BoletosApiConfigDialog />}
          </div>
        </div>

        {/* Filtros dinâmicos */}
        {filtrosVisiveis && filtrosVisiveis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros primários - sempre visíveis */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filtrosPrimarios.map(f => renderFiltro(f))}
                <div className="flex items-center space-x-2">
                  <Checkbox id="ocultar-emitidos" checked={ocultarEmitidos} onCheckedChange={(checked) => setOcultarEmitidos(!!checked)} />
                  <Label htmlFor="ocultar-emitidos" className="text-sm cursor-pointer">Ocultar já emitidos</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="filtrar-com-erros" checked={filtrarComErros} onCheckedChange={(checked) => setFiltrarComErros(!!checked)} />
                  <Label htmlFor="filtrar-com-erros" className="text-sm cursor-pointer text-destructive">Apenas com erros ({idsComErro.size})</Label>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" onClick={handleLimparFiltros} className="w-full">Limpar Filtros</Button>
                </div>
              </div>

              {/* Filtros secundários - em menu suspenso */}
              {filtrosSecundarios.length > 0 && (
                <Collapsible open={showSecundarios} onOpenChange={setShowSecundarios}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-xs">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filtros Adicionais ({filtrosSecundarios.length})
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSecundarios ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-3 border border-border rounded-lg bg-muted/20">
                      {filtrosSecundarios.map(f => renderFiltro(f))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabela de Resultados */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Boletos Importados
              </CardTitle>
              <div className="flex items-center gap-4">
                <Badge variant="secondary">{boletosFiltrados.length} registro(s)</Badge>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-100 dark:bg-green-950/50 border border-green-300 dark:border-green-800" /> Já emitido</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-destructive/10 border border-destructive/30" /> Erro na emissão</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-primary/10 border border-primary/30" /> Selecionado</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : boletosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum boleto encontrado.</p>
                <p className="text-sm">Clique em "Sincronizar" para importar dados da API.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox checked={todosSelecionados} onCheckedChange={handleSelecionarTodos} />
                    </TableHead>
                    {colunasVisiveis.map(col => (
                      <TableHead key={col.chave} className={col.chave === 'valor' ? 'text-right' : ''}>
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boletosFiltrados.map((boleto: any) => {
                    const jaEmitido = !!boleto.cod_barras_calculado;
                    const temErro = idsComErro.has(boleto.id);
                    const rowClass = selecionados.has(boleto.id)
                      ? 'bg-primary/10'
                      : temErro
                        ? 'bg-destructive/10 dark:bg-destructive/20'
                        : jaEmitido
                          ? 'bg-green-50 dark:bg-green-950/30'
                          : '';
                    return (
                    <TableRow key={boleto.id} className={rowClass}>
                      <TableCell>
                        <Checkbox checked={selecionados.has(boleto.id)} onCheckedChange={(checked) => handleSelecionarItem(boleto.id, !!checked)} />
                      </TableCell>
                      {colunasVisiveis.map(col => (
                        <TableCell
                          key={col.chave}
                          className={
                            col.chave === 'valor' ? 'text-right font-mono' :
                            col.chave === 'numero_nota' || col.chave === 'numero_cobranca' || col.chave === 'cnpj' ? 'font-mono' :
                            col.chave === 'status' ? '' : ''
                          }
                        >
                          {col.chave === 'status' ? (
                            <Badge variant={
                              getCellValue(boleto, 'status') === 'liquidado' ? 'secondary' :
                              getCellValue(boleto, 'status') === 'vencido' ? 'destructive' : 'default'
                            }>
                              {getCellValue(boleto, col.chave)}
                            </Badge>
                          ) : (
                            getCellValue(boleto, col.chave)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerta de conflito de código de barras */}
      <AlertDialog open={showBarcodeAlert} onOpenChange={setShowBarcodeAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Código de Barras Diferente
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Os seguintes boletos já possuem código de barras salvo, mas o novo cálculo gerou um valor diferente:</p>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {barcodeConflicts.map((c, i) => (
                    <div key={i} className="border border-border rounded p-2 text-xs">
                      <p className="font-semibold">Nota: {c.nota}</p>
                      <p className="text-muted-foreground">Anterior: {c.antigo}</p>
                      <p className="text-muted-foreground">Novo: {c.novo}</p>
                    </div>
                  ))}
                </div>
                <p className="font-semibold">Deseja emitir os boletos com o novo código de barras?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowBarcodeAlert(false);
                if (pendingPrintAction) pendingPrintAction();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Emitir com novo código
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de boletos com falha na linha digitável */}
      <Dialog open={showFalhaDialog} onOpenChange={setShowFalhaDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Linha digitável não calculada
            </DialogTitle>
            <DialogDescription>
              Não foi possível calcular a linha digitável para {boletosComFalha.length} boleto(s). Verifique as configurações do banco (agência, conta, carteira).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {boletosComFalha.map((boleto: any, idx: number) => (
              <div key={boleto.id || idx} className="border border-destructive/30 rounded-lg p-4 bg-destructive/5 space-y-2 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div><span className="font-semibold text-muted-foreground">Nº Nota:</span> <span className="font-mono">{boleto.numero_nota || '-'}</span></div>
                  <div><span className="font-semibold text-muted-foreground">Nº Cobrança:</span> <span className="font-mono">{boleto.numero_cobranca || '-'}</span></div>
                  <div><span className="font-semibold text-muted-foreground">Cliente:</span> {boleto.dyn_nome_do_cliente || boleto.cliente || '-'}</div>
                  <div><span className="font-semibold text-muted-foreground">Banco:</span> {boleto.banco || '-'}</div>
                  <div><span className="font-semibold text-muted-foreground">Carteira:</span> {boleto.carteira || <span className="text-destructive font-semibold">Não definida</span>}</div>
                  <div><span className="font-semibold text-muted-foreground">Nosso Número:</span> <span className="font-mono">{boleto.nosso_numero || '-'}</span></div>
                  <div><span className="font-semibold text-muted-foreground">Valor:</span> {boleto.valor != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(boleto.valor) : '-'}</div>
                  <div><span className="font-semibold text-muted-foreground">Vencimento:</span> {boleto.data_vencimento ? format(new Date(String(boleto.data_vencimento).substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</div>
                  <div><span className="font-semibold text-muted-foreground">CNPJ:</span> <span className="font-mono">{getCnpj(boleto)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* Dialog de registros duplicados na sincronização */}
      <Dialog open={showDuplicadosDialog} onOpenChange={setShowDuplicadosDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Registros duplicados na API ({duplicadosSync.length})
            </DialogTitle>
            <DialogDescription>
              Os registros abaixo apareceram mais de uma vez na resposta da API (mesma combinação de Nota + Cobrança). Apenas a última ocorrência foi mantida.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Nota</TableHead>
                  <TableHead>Nº Cobrança</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duplicadosSync.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{d.numero_nota}</TableCell>
                    <TableCell className="font-mono text-sm">{d.numero_cobranca}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
