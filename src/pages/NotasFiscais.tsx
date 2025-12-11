import { useState } from 'react';
import { Search, Calendar } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { notasFiscaisMock, clientesMock } from '@/data/mockData';
import { StatusNota } from '@/types/boleto';

const STATUS_LABELS: Record<StatusNota, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  aberta: { label: 'Em aberto', variant: 'default' },
  liquidada: { label: 'Liquidada', variant: 'secondary' },
  cancelada: { label: 'Cancelada', variant: 'outline' },
  vencida: { label: 'Vencida', variant: 'destructive' },
};

export default function NotasFiscais() {
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<string>('todos');

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getClienteNome = (codigoCliente: string) => {
    const cliente = clientesMock.find((c) => c.id === codigoCliente);
    return cliente?.razao_social || 'Cliente não encontrado';
  };

  const notasFiltradas = notasFiscaisMock.filter((nota) => {
    const termoBusca = busca.toLowerCase();
    const clienteNome = getClienteNome(nota.codigo_cliente).toLowerCase();
    
    const matchBusca =
      nota.numero_nota.includes(busca) ||
      clienteNome.includes(termoBusca) ||
      nota.referencia_interna.toLowerCase().includes(termoBusca);

    const matchStatus = statusFiltro === 'todos' || nota.status === statusFiltro;

    return matchBusca && matchStatus;
  });

  const valorTotal = notasFiltradas.reduce((acc, n) => acc + n.valor_titulo, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notas Fiscais</h1>
            <p className="text-muted-foreground">
              Visualize todas as notas fiscais e títulos em aberto
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total filtrado</p>
            <p className="text-xl font-bold text-primary">{formatarMoeda(valorTotal)}</p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label className="text-sm text-muted-foreground">Buscar</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número da nota, cliente ou referência..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="aberta">Em aberto</SelectItem>
                    <SelectItem value="vencida">Vencidas</SelectItem>
                    <SelectItem value="liquidada">Liquidadas</SelectItem>
                    <SelectItem value="cancelada">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nota Fiscal</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Referência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notasFiltradas.map((nota) => (
                  <TableRow key={nota.id}>
                    <TableCell className="font-medium">
                      {nota.numero_nota}-{nota.serie}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {getClienteNome(nota.codigo_cliente)}
                    </TableCell>
                    <TableCell>{formatarData(nota.data_emissao)}</TableCell>
                    <TableCell>{formatarData(nota.data_vencimento)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatarMoeda(nota.valor_titulo)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_LABELS[nota.status].variant}>
                        {STATUS_LABELS[nota.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {nota.referencia_interna}
                    </TableCell>
                  </TableRow>
                ))}
                {notasFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma nota fiscal encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Resumo */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{notasFiltradas.length} nota(s) encontrada(s)</span>
          <span>Moeda: BRL (Real Brasileiro)</span>
        </div>
      </div>
    </MainLayout>
  );
}
