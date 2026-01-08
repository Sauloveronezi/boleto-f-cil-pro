import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function BoletosApi() {
  const { toast } = useToast();
  const [filtros, setFiltros] = useState({
    dataEmissaoInicio: '',
    dataEmissaoFim: '',
    clienteId: '',
    cnpj: '',
    estado: '',
    cidade: '',
    transportadora: ''
  });
  const [integracaoSelecionada, setIntegracaoSelecionada] = useState<string>('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [bancoSelecionado, setBancoSelecionado] = useState<string>('');
  const [modeloSelecionado, setModeloSelecionado] = useState<string>('');

  const { data: clientes } = useClientes();
  const { data: integracoes } = useApiIntegracoes();
  const { data: bancos } = useBancos();
  const { data: configuracoes } = useConfiguracoesBanco();
  const { hasPermission } = usePermissoes();
  const canPrint = hasPermission('boletos', 'criar');

  const { data: boletos, isLoading, refetch } = useBoletosApi({
    dataEmissaoInicio: filtros.dataEmissaoInicio || undefined,
    dataEmissaoFim: filtros.dataEmissaoFim || undefined,
    clienteId: filtros.clienteId || undefined,
    cnpj: filtros.cnpj || undefined,
    estado: filtros.estado || undefined,
    cidade: filtros.cidade || undefined
  });

  // Buscar modelos de layout disponíveis
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

  const syncApi = useSyncApi();

  // Filtrar por transportadora do cliente (campo agente_frete)
  const boletosFiltrados = useMemo(() => {
    return boletos?.filter((b: any) => {
      if (filtros.transportadora) {
        return b.cliente?.agente_frete?.toLowerCase().includes(filtros.transportadora.toLowerCase());
      }
      return true;
    }) || [];
  }, [boletos, filtros.transportadora]);

  // Controle de seleção
  const todosIds = useMemo(() => boletosFiltrados.map((b: any) => b.id), [boletosFiltrados]);
  const todosSelecionados = todosIds.length > 0 && todosIds.every((id: string) => selecionados.has(id));

  const handleSelecionarTodos = (checked: boolean) => {
    if (checked) {
      setSelecionados(new Set(todosIds));
    } else {
      setSelecionados(new Set());
    }
  };

  const handleSelecionarItem = (id: string, checked: boolean) => {
    const novoSet = new Set(selecionados);
    if (checked) {
      novoSet.add(id);
    } else {
      novoSet.delete(id);
    }
    setSelecionados(novoSet);
  };

  const handleSincronizar = async () => {
    if (!integracaoSelecionada) {
      toast({
        title: 'Selecione uma integração',
        description: 'Escolha a integração que deseja sincronizar',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const result = await syncApi.mutateAsync({ integracao_id: integracaoSelecionada });
      if (result.success) {
        toast({
          title: 'Sincronização concluída',
          description: `${result.registros_novos} novos, ${result.registros_atualizados} atualizados`,
        });
        refetch();
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleLimparFiltros = () => {
    setFiltros({
      dataEmissaoInicio: '',
      dataEmissaoFim: '',
      clienteId: '',
      cnpj: '',
      estado: '',
      cidade: '',
      transportadora: ''
    });
    setSelecionados(new Set());
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleImprimirSelecionados = async () => {
    if (selecionados.size === 0) {
      toast({
        title: 'Nenhum boleto selecionado',
        description: 'Selecione ao menos um boleto para imprimir',
        variant: 'destructive'
      });
      return;
    }

    if (!bancoSelecionado) {
      toast({
        title: 'Selecione um banco',
        description: 'Escolha o banco emissor para gerar os boletos',
        variant: 'destructive'
      });
      return;
    }

    const banco = bancos?.find(b => b.id === bancoSelecionado);
    if (!banco) {
      toast({
        title: 'Banco não encontrado',
        description: 'Selecione um banco válido',
        variant: 'destructive'
      });
      return;
    }

    const configuracao = configuracoes?.find(c => c.banco_id === bancoSelecionado);
    const boletosSelecionados = boletosFiltrados.filter((b: any) => selecionados.has(b.id));

    // Se tiver modelo selecionado, usar o renderizador com modelo
    if (modeloSelecionado) {
      const modelo = modelos?.find(m => m.id === modeloSelecionado);
      
      if (!modelo) {
        toast({
          title: 'Modelo não encontrado',
          description: 'Selecione um modelo válido',
          variant: 'destructive'
        });
        return;
      }

      if (!modelo.pdf_storage_path) {
        toast({
          title: 'Modelo sem PDF',
          description: 'Este modelo não possui PDF base. Selecione outro modelo ou reanexe o PDF.',
          variant: 'destructive'
        });
        return;
      }

      try {
        toast({
          title: 'Gerando boletos...',
          description: 'Aguarde enquanto os boletos são processados.',
        });

        // Buscar campos mapeados do modelo
        const { data: modeloCompleto, error: modeloError } = await supabase
          .from('vv_b_modelos_boleto')
          .select('campos_mapeados')
          .eq('id', modeloSelecionado)
          .single();

        if (modeloError) throw new Error('Erro ao carregar modelo');

        const elementos: ElementoParaRender[] = (modeloCompleto?.campos_mapeados as any[])?.map((c: any) => ({
          id: c.id || `field_${Date.now()}`,
          tipo: c.tipo || 'campo',
          nome: c.nome || '',
          x: c.posicao_x ?? c.x ?? 0,
          y: c.posicao_y ?? c.y ?? 0,
          largura: c.largura || 100,
          altura: c.altura || 20,
          variavel: c.variavel || '',
          textoFixo: c.textoFixo,
          fonte: c.fonte,
          tamanhoFonte: c.tamanhoFonte,
          negrito: c.negrito,
          italico: c.italico,
          alinhamento: c.alinhamento,
          corTexto: c.corTexto,
          corFundo: c.corFundo,
          bordaSuperior: c.bordaSuperior,
          bordaInferior: c.bordaInferior,
          bordaEsquerda: c.bordaEsquerda,
          bordaDireita: c.bordaDireita,
          espessuraBorda: c.espessuraBorda,
          corBorda: c.corBorda,
          visivel: c.visivel ?? true,
        })) || [];

        // Mapear dados dos boletos para o formato do renderizador
        const dadosBoletos: DadosBoletoModelo[] = boletosSelecionados.map((boleto: any) => {
          const cliente = boleto.cliente;
          const nota = {
            id: boleto.id,
            numero_nota: boleto.numero_nota,
            cliente_id: boleto.cliente_id || '',
            data_emissao: boleto.data_emissao || new Date().toISOString().split('T')[0],
            data_vencimento: boleto.data_vencimento || new Date().toISOString().split('T')[0],
            valor_titulo: boleto.valor || 0,
            moeda: 'BRL',
          };

          // Calcular código de barras
          const dadosCodigoBarras = gerarCodigoBarras(banco as any, nota as any, configuracao as any);

          return {
            banco_nome: banco.nome_banco,
            banco_codigo: banco.codigo_banco,
            agencia: configuracao?.agencia || '',
            conta: configuracao?.conta || '',
            beneficiario_nome: '', // Pode ser preenchido com dados da empresa
            beneficiario_cnpj: '',
            pagador_nome: cliente?.razao_social || boleto.dyn_nome_do_cliente || '',
            pagador_cnpj: cliente?.cnpj || '',
            pagador_endereco: cliente?.endereco || '',
            pagador_cidade_uf: cliente ? `${cliente.cidade || ''} - ${cliente.estado || ''}` : boleto.dyn_cidade || '',
            pagador_cep: cliente?.cep || '',
            cliente_razao_social: cliente?.razao_social || boleto.dyn_nome_do_cliente || '',
            cliente_cnpj: cliente?.cnpj || '',
            cliente_endereco: cliente?.endereco || '',
            nosso_numero: dadosCodigoBarras.nossoNumero,
            numero_documento: boleto.numero_cobranca || boleto.numero_nota,
            numero_nota: boleto.numero_nota,
            data_documento: boleto.data_emissao ? new Date(boleto.data_emissao).toLocaleDateString('pt-BR') : '',
            data_vencimento: boleto.data_vencimento ? new Date(boleto.data_vencimento).toLocaleDateString('pt-BR') : '',
            data_emissao: boleto.data_emissao ? new Date(boleto.data_emissao).toLocaleDateString('pt-BR') : '',
            data_processamento: new Date().toLocaleDateString('pt-BR'),
            valor_documento: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(boleto.valor || 0),
            valor_titulo: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(boleto.valor || 0),
            carteira: configuracao?.carteira || '',
            linha_digitavel: dadosCodigoBarras.linhaDigitavel,
            codigo_barras: dadosCodigoBarras.codigoBarras,
            local_pagamento: 'PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO',
            instrucoes: configuracao?.texto_instrucao_padrao || '',
            // Campos dinâmicos da API
            dyn_cidade: boleto.dyn_cidade || boleto.dados_extras?.dyn_cidade || '',
            dyn_conta: boleto.dyn_conta?.toString() || boleto.dados_extras?.dyn_conta?.toString() || '',
            dyn_desconto_data: boleto.dyn_desconto_data || boleto.dados_extras?.dyn_desconto_data || '',
            dyn_desconto1: boleto.dyn_desconto1 || boleto.dados_extras?.dyn_desconto1 || '',
            dyn_nome_do_cliente: boleto.dyn_nome_do_cliente || boleto.dados_extras?.dyn_nome_do_cliente || '',
            dyn_zonatransporte: boleto.dyn_zonatransporte || boleto.dados_extras?.dyn_zonatransporte || '',
          };
        });

        const pdfBytes = await gerarBoletosComModelo(
          modelo.pdf_storage_path,
          elementos,
          dadosBoletos
        );

        const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '');
        downloadPDF(pdfBytes, `boletos_${banco.codigo_banco}_${dataAtual}.pdf`);

        toast({
          title: 'PDF gerado com sucesso',
          description: `${selecionados.size} boleto(s) gerado(s) com o modelo "${modelo.nome_modelo}"`,
        });
      } catch (error: any) {
        console.error('[BoletosApi] Erro ao gerar boletos com modelo:', error);
        toast({
          title: 'Erro ao gerar PDF',
          description: error.message,
          variant: 'destructive'
        });
      }
      return;
    }

    // Fallback: usar gerador padrão sem modelo
    const notasParaImprimir = boletosSelecionados.map((boleto: any) => ({
      id: boleto.id,
      numero_nota: boleto.numero_nota,
      serie: boleto.dados_extras?.serie || '1',
      codigo_cliente: boleto.cliente_id || '',
      data_emissao: boleto.data_emissao || new Date().toISOString().split('T')[0],
      data_vencimento: boleto.data_vencimento || new Date().toISOString().split('T')[0],
      valor_titulo: boleto.valor || 0,
      moeda: 'BRL',
      status: 'aberta' as const,
      referencia_interna: boleto.numero_cobranca || ''
    }));

    const clientesParaImprimir = boletosSelecionados
      .filter((b: any) => b.cliente)
      .map((b: any) => b.cliente)
      .filter((cliente: any, index: number, self: any[]) => 
        index === self.findIndex((c) => c.id === cliente.id)
      );

    try {
      gerarPDFBoletos(
        notasParaImprimir,
        clientesParaImprimir,
        banco,
        configuracao,
        'API_CDS',
        'arquivo_unico'
      );

      toast({
        title: 'PDF gerado com sucesso',
        description: `${selecionados.size} boleto(s) gerado(s)`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar PDF',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Boletos via API</h1>
            <p className="text-muted-foreground">
              Dados importados da API SAP/ERP para impressão de boletos
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Select 
              value={integracaoSelecionada} 
              onValueChange={setIntegracaoSelecionada}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione integração" />
              </SelectTrigger>
              <SelectContent>
                {integracoes?.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={handleSincronizar}
              disabled={syncApi.isPending || !integracaoSelecionada}
              className="gap-2"
            >
              {syncApi.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sincronizar
            </Button>
            <Select 
              value={bancoSelecionado} 
              onValueChange={setBancoSelecionado}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Banco emissor" />
              </SelectTrigger>
              <SelectContent>
                {bancos?.filter(b => b.ativo).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.codigo_banco} - {b.nome_banco}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={modeloSelecionado} 
              onValueChange={setModeloSelecionado}
            >
              <SelectTrigger className="w-[200px]">
                <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Modelo de layout" />
              </SelectTrigger>
              <SelectContent>
                {modelos?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome_modelo}
                    {m.pdf_storage_path && ' (PDF)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              className="gap-2"
              onClick={handleImprimirSelecionados}
              disabled={selecionados.size === 0 || !canPrint}
              title={!canPrint ? "Sem permissão para gerar boletos" : "Imprimir boletos selecionados"}
            >
              <Printer className="h-4 w-4" />
              Imprimir ({selecionados.size})</Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Data Emissão */}
              <div>
                <Label>Data Emissão (De)</Label>
                <Input
                  type="date"
                  value={filtros.dataEmissaoInicio}
                  onChange={(e) => setFiltros(f => ({ ...f, dataEmissaoInicio: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Data Emissão (Até)</Label>
                <Input
                  type="date"
                  value={filtros.dataEmissaoFim}
                  onChange={(e) => setFiltros(f => ({ ...f, dataEmissaoFim: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Cliente */}
              <div>
                <Label>Cliente</Label>
                <Select 
                  value={filtros.clienteId} 
                  onValueChange={(v) => setFiltros(f => ({ ...f, clienteId: v === 'all' ? '' : v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clientes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* CNPJ */}
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={filtros.cnpj}
                  onChange={(e) => setFiltros(f => ({ ...f, cnpj: e.target.value }))}
                  placeholder="00.000.000/0001-00"
                  className="mt-1"
                />
              </div>

              {/* Estado */}
              <div>
                <Label>Estado</Label>
                <Select 
                  value={filtros.estado} 
                  onValueChange={(v) => setFiltros(f => ({ ...f, estado: v === 'all' ? '' : v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os estados</SelectItem>
                    {ESTADOS_BRASIL.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cidade */}
              <div>
                <Label>Cidade</Label>
                <Input
                  value={filtros.cidade}
                  onChange={(e) => setFiltros(f => ({ ...f, cidade: e.target.value }))}
                  placeholder="Nome da cidade"
                  className="mt-1"
                />
              </div>

              {/* Transportadora */}
              <div>
                <Label>Transportadora (Agente Frete)</Label>
                <Input
                  value={filtros.transportadora}
                  onChange={(e) => setFiltros(f => ({ ...f, transportadora: e.target.value }))}
                  placeholder="Nome do agente"
                  className="mt-1"
                />
              </div>

              {/* Botão Limpar */}
              <div className="flex items-end">
                <Button variant="ghost" onClick={handleLimparFiltros} className="w-full">
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Resultados */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Boletos Importados
              </CardTitle>
              <Badge variant="secondary">
                {boletosFiltrados.length} registro(s)
              </Badge>
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
                      <Checkbox
                        checked={todosSelecionados}
                        onCheckedChange={handleSelecionarTodos}
                      />
                    </TableHead>
                    <TableHead>Nº Nota</TableHead>
                    <TableHead>Nº Cobrança</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Transportadora</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boletosFiltrados.map((boleto: any) => (
                    <TableRow key={boleto.id}>
                      <TableCell>
                        <Checkbox
                          checked={selecionados.has(boleto.id)}
                          onCheckedChange={(checked) => handleSelecionarItem(boleto.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{boleto.numero_nota}</TableCell>
                      <TableCell className="font-mono">{boleto.numero_cobranca}</TableCell>
                      <TableCell>{boleto.cliente?.razao_social || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{boleto.cliente?.cnpj || '-'}</TableCell>
                      <TableCell>{boleto.cliente?.agente_frete || '-'}</TableCell>
                      <TableCell>
                        {boleto.data_emissao 
                          ? format(new Date(boleto.data_emissao), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {boleto.data_vencimento 
                          ? format(new Date(boleto.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(boleto.valor)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          boleto.dados_extras?.status_sap === 'liquidado' ? 'secondary' :
                          boleto.dados_extras?.status_sap === 'vencido' ? 'destructive' :
                          'default'
                        }>
                          {boleto.dados_extras?.status_sap || 'ativo'}
                        </Badge>
                      </TableCell>
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
