import { useState, useMemo } from 'react';
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
import { Calendar, Search, Filter, Printer, FileText, RefreshCw, Layers } from 'lucide-react';
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
import { useBoletoTemplates, useBoletoTemplateFields, useSeedDefaultTemplate } from '@/hooks/useBoletoTemplates';
import { renderBoletosV2, downloadPdfV2 } from '@/lib/templateRendererV2';
import { useBoletosApiConfigColunas, useBoletosApiConfigFiltros } from '@/hooks/useBoletosApiConfig';
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
  const [bancoSelecionado, setBancoSelecionado] = useState<string>('');
  const [modeloSelecionado, setModeloSelecionado] = useState<string>('');
  const [imprimirFundo, setImprimirFundo] = useState(true);

  const { data: clientes } = useClientes();
  const { data: integracoes } = useApiIntegracoes();
  const { data: bancos } = useBancos();
  const { data: configuracoes } = useConfiguracoesBanco();
  const { hasPermission, isLoading: isLoadingPermissoes } = usePermissoes();
  const isAdmin = hasPermission('configuracoes', 'editar');
  const canPrint = hasPermission('boletos', 'criar');

  // Config dinâmica de colunas e filtros
  const { data: colunasVisiveis } = useBoletosApiConfigColunas();
  const { data: filtrosVisiveis } = useBoletosApiConfigFiltros();

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
        return boleto.data_emissao ? format(new Date(boleto.data_emissao), 'dd/MM/yyyy', { locale: ptBR }) : '-';
      case 'data_vencimento':
        return boleto.data_vencimento ? format(new Date(boleto.data_vencimento), 'dd/MM/yyyy', { locale: ptBR }) : '-';
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

  // Filtrar boletos
  const boletosFiltrados = useMemo(() => {
    return boletos?.filter((b: any) => {
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
      // Filtros dinâmicos de texto (cidade, cnpj, etc.)
      if (filtros.cidade) {
        const cidade = b.dyn_cidade || getNested(b, 'dados_extras.cidade') || '';
        if (!String(cidade).toLowerCase().includes(filtros.cidade.toLowerCase())) return false;
      }
      return true;
    }) || [];
  }, [boletos, filtros, bancoSelecionado, bancos]);

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
        toast({ title: 'Sincronização concluída', description: `${result.registros_novos} novos, ${result.registros_atualizados} atualizados` });
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

  const handleImprimirSelecionados = async () => {
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
        // Extrair agência/conta dos dados da API (BankInternalID, BankAccountLongID)
        const extras = boleto.dados_extras || {};
        const bankInternalId = boleto.BankInternalID || boleto.bankinternalid || extras?.BankInternalID || extras?.bankinternalid || '';
        const bankAccountLongId = boleto.BankAccountLongID || boleto.bankaccountlongid || extras?.BankAccountLongID || extras?.bankaccountlongid || '';
        const bankControlKey = boleto.bankcontrolkey || extras?.bankcontrolkey || '';
        
        // BankInternalID pode conter banco+agência (ex: "34171463" = banco 341 + agência 1463)
        const agenciaApi = bankInternalId ? bankInternalId.toString().replace(/\D/g, '').slice(-4) : '';
        const contaApi = bankAccountLongId ? bankAccountLongId.toString().replace(/\D/g, '') : '';
        
        // Sobrescrever config com dados da API se disponíveis
        const configOverride = configuracao ? { ...configuracao } : undefined;
        if (configOverride && agenciaApi) configOverride.agencia = agenciaApi;
        if (configOverride && contaApi) configOverride.conta = contaApi;
        if (configOverride && bankControlKey) (configOverride as any).conta_dv = bankControlKey;
        
        const dadosCodigoBarras = gerarCodigoBarras(banco, notaFiscal, configOverride);
        const dados = mapearBoletoApiParaModelo(boleto, undefined, empresa, banco, configuracao, dadosCodigoBarras);
        if (!dados.linha_digitavel) {
          boletosComFalhaLinhaDigitavel.push(boleto.numero_nota || boleto.id);
        }
        return dados;
      });
    };

    const salvarLinhaDigitavelNoBanco = async (boletosList: any[], dadosBoletos: any[]) => {
      for (let i = 0; i < boletosList.length; i++) {
        const boleto = boletosList[i];
        const dados = dadosBoletos[i];
        if (dados.linha_digitavel && dados.codigo_barras) {
          try {
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
            } as any);
          } catch (err) {
            console.warn('[BoletosApi] Erro ao salvar linha digitável:', err);
          }
        }
      }
    };

    // Tentar template V2
    const templateV2 = templatesV2?.find(t => t.id === modeloSelecionado);
    if (templateV2 && templateFieldsV2 && templateFieldsV2.length > 0) {
      try {
        toast({ title: 'Gerando boletos...', description: 'Aguarde o processamento.' });
        const dadosBoletos = mapearDadosBoletos(boletosSelecionados);
        const pdfBytes = await renderBoletosV2(templateV2, templateFieldsV2, dadosBoletos, imprimirFundo);
        const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '');
        downloadPdfV2(pdfBytes, `boletos_${banco.codigo_banco}_${dataAtual}.pdf`);
        await salvarLinhaDigitavelNoBanco(boletosSelecionados, dadosBoletos);
        toast({ title: 'PDF gerado com sucesso', description: `${selecionados.size} boleto(s) gerado(s) com "${templateV2.name}"` });
        if (boletosComFalhaLinhaDigitavel.length > 0) {
          toast({
            title: '⚠️ Linha digitável não calculada',
            description: `Não foi possível calcular para ${boletosComFalhaLinhaDigitavel.length} boleto(s). Verifique configurações do banco.`,
            variant: 'destructive',
          });
        }
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
        toast({ title: 'Gerando boletos...', description: 'Aguarde o processamento.' });
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
        const dadosBoletos = mapearDadosBoletos(boletosSelecionados);
        const pdfBytes = await gerarBoletosComModelo(modelo.pdf_storage_path, elementos, dadosBoletos, undefined, imprimirFundo);
        const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '');
        downloadPDF(pdfBytes, `boletos_${banco.codigo_banco}_${dataAtual}.pdf`);
        await salvarLinhaDigitavelNoBanco(boletosSelecionados, dadosBoletos);
        toast({ title: 'PDF gerado com sucesso', description: `${selecionados.size} boleto(s) gerado(s) com "${modelo.nome_modelo}"` });
        if (boletosComFalhaLinhaDigitavel.length > 0) {
          toast({ title: '⚠️ Linha digitável não calculada', description: `Verifique configurações do banco.`, variant: 'destructive' });
        }
      } catch (error: any) {
        console.error('[BoletosApi] Erro legado:', error);
        toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
      }
      return;
    }

    // Fallback sem modelo
    const notasParaImprimir = boletosSelecionados.map((boleto: any) => ({
      id: boleto.id, numero_nota: boleto.numero_nota,
      serie: boleto.dados_extras?.serie || '1', codigo_cliente: boleto.cliente_id || '',
      data_emissao: boleto.data_emissao || new Date().toISOString().split('T')[0],
      data_vencimento: boleto.data_vencimento || new Date().toISOString().split('T')[0],
      valor_titulo: boleto.valor || 0, moeda: 'BRL', status: 'aberta' as const,
      referencia_interna: boleto.numero_cobranca || ''
    }));

    const clientesParaImprimir = boletosSelecionados
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
      gerarPDFBoletos(notasParaImprimir, clientesParaImprimir, banco, configuracao, 'API_CDS', 'arquivo_unico');
      toast({ title: 'PDF gerado com sucesso', description: `${selecionados.size} boleto(s) gerado(s)` });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  // Renderizar um filtro dinâmico
  const renderFiltro = (filtroConfig: { chave: string; label: string; campo_boleto: string | null }) => {
    const { chave, label } = filtroConfig;

    // Filtros especiais com Select
    if (chave === 'clienteId') {
      return (
        <div key={chave}>
          <Label>{label}</Label>
          <Select value={filtros[chave] || ''} onValueChange={(v) => setFiltros(f => ({ ...f, [chave]: v === 'all' ? '' : v }))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clientes?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (chave === 'estado') {
      return (
        <div key={chave}>
          <Label>{label}</Label>
          <Select value={filtros[chave] || ''} onValueChange={(v) => setFiltros(f => ({ ...f, [chave]: v === 'all' ? '' : v }))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {ESTADOS_BRASIL.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    // Filtros de data
    if (chave.toLowerCase().includes('data')) {
      return (
        <div key={chave}>
          <Label>{label}</Label>
          <Input type="date" value={filtros[chave] || ''} onChange={(e) => setFiltros(f => ({ ...f, [chave]: e.target.value }))} className="mt-1" />
        </div>
      );
    }
    // Filtro de texto padrão
    return (
      <div key={chave}>
        <Label>{label}</Label>
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

            <Button className="gap-2" onClick={handleImprimirSelecionados}
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
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filtrosVisiveis.map(f => renderFiltro(f))}
                <div className="flex items-end">
                  <Button variant="ghost" onClick={handleLimparFiltros} className="w-full">Limpar Filtros</Button>
                </div>
              </div>
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
              <Badge variant="secondary">{boletosFiltrados.length} registro(s)</Badge>
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
                  {boletosFiltrados.map((boleto: any) => (
                    <TableRow key={boleto.id}>
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
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
