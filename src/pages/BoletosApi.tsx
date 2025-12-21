import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Calendar, Search, Filter, Printer, FileText, RefreshCw } from 'lucide-react';
import { useBoletosApi, useSyncApi } from '@/hooks/useApiIntegracao';
import { useClientes } from '@/hooks/useClientes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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

  const { data: clientes } = useClientes();
  const { data: boletos, isLoading, refetch } = useBoletosApi({
    dataEmissaoInicio: filtros.dataEmissaoInicio || undefined,
    dataEmissaoFim: filtros.dataEmissaoFim || undefined,
    clienteId: filtros.clienteId || undefined,
    cnpj: filtros.cnpj || undefined,
    estado: filtros.estado || undefined,
    cidade: filtros.cidade || undefined
  });

  const syncApi = useSyncApi();

  // Filtrar por transportadora do cliente (campo agente_frete)
  const boletosFiltrados = boletos?.filter((b: any) => {
    if (filtros.transportadora) {
      return b.cliente?.agente_frete?.toLowerCase().includes(filtros.transportadora.toLowerCase());
    }
    return true;
  }) || [];

  const handleSincronizar = async () => {
    try {
      const result = await syncApi.mutateAsync({ modo_demo: true });
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
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSincronizar}
              disabled={syncApi.isPending}
              className="gap-2"
            >
              {syncApi.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sincronizar
            </Button>
            <Button className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir Selecionados
            </Button>
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
                      <input type="checkbox" className="rounded" />
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
                        <input type="checkbox" className="rounded" />
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
