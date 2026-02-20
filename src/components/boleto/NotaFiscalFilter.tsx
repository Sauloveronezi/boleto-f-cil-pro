import { useState, useMemo } from 'react';
import { Calendar, Filter, X, CheckSquare, Square } from 'lucide-react';
import { NotaFiscal, Cliente, FiltroNotaFiscal, StatusNota } from '@/types/boleto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface NotaFiscalFilterProps {
  notas: NotaFiscal[];
  clientes: Cliente[];
  clientesSelecionados: string[];
  notasSelecionadas: string[];
  onNotasChange: (notaIds: string[]) => void;
}

const STATUS_LABELS: Record<StatusNota, { label: string; className: string }> = {
  aberta: { label: 'Em aberto', className: 'badge-info' },
  liquidada: { label: 'Liquidada', className: 'badge-success' },
  cancelada: { label: 'Cancelada', className: 'badge-muted' },
  vencida: { label: 'Vencida', className: 'badge-warning' },
};

export function NotaFiscalFilter({
  notas,
  clientes,
  clientesSelecionados,
  notasSelecionadas,
  onNotasChange,
}: NotaFiscalFilterProps) {
  const [filtros, setFiltros] = useState<FiltroNotaFiscal>({
    status: ['aberta', 'vencida'],
  });
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);

  const notasFiltradas = useMemo(() => {
    return notas.filter((nota) => {
      // Filtrar por clientes selecionados
      if (clientesSelecionados.length > 0 && !clientesSelecionados.includes(nota.codigo_cliente)) {
        return false;
      }

      // Filtrar por status
      if (filtros.status?.length && !filtros.status.includes(nota.status)) {
        return false;
      }

      // Filtrar por data de emissão
      if (filtros.data_emissao_inicio && nota.data_emissao < filtros.data_emissao_inicio) {
        return false;
      }
      if (filtros.data_emissao_fim && nota.data_emissao > filtros.data_emissao_fim) {
        return false;
      }

      // Filtrar por data de vencimento
      if (filtros.data_vencimento_inicio && nota.data_vencimento < filtros.data_vencimento_inicio) {
        return false;
      }
      if (filtros.data_vencimento_fim && nota.data_vencimento > filtros.data_vencimento_fim) {
        return false;
      }

      return true;
    });
  }, [notas, filtros, clientesSelecionados]);

  const getClienteNome = (codigoCliente: string) => {
    const cliente = clientes.find((c) => c.id === codigoCliente);
    return cliente?.razao_social || 'Cliente não encontrado';
  };

  const getClienteCnpj = (codigoCliente: string) => {
    const cliente = clientes.find((c) => c.id === codigoCliente);
    return cliente?.cnpj || '-';
  };

  const handleSelectAll = () => {
    if (notasSelecionadas.length === notasFiltradas.length) {
      onNotasChange([]);
    } else {
      onNotasChange(notasFiltradas.map((n) => n.id));
    }
  };

  const handleSelectNota = (notaId: string) => {
    if (notasSelecionadas.includes(notaId)) {
      onNotasChange(notasSelecionadas.filter((id) => id !== notaId));
    } else {
      onNotasChange([...notasSelecionadas, notaId]);
    }
  };

  const limparFiltros = () => {
    setFiltros({ status: ['aberta', 'vencida'] });
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const valorTotal = useMemo(() => {
    return notasFiltradas
      .filter((n) => notasSelecionadas.includes(n.id))
      .reduce((acc, n) => acc + n.valor_titulo, 0);
  }, [notasFiltradas, notasSelecionadas]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Resumo dos clientes selecionados */}
      {clientesSelecionados.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Exibindo notas fiscais de{' '}
            <span className="font-semibold text-foreground">
              {clientesSelecionados.length} cliente(s) selecionado(s)
            </span>
          </p>
        </div>
      )}

      {/* Seção de Filtros */}
      <div className="bg-card border border-border rounded-lg">
        <button
          className="w-full px-4 py-3 flex items-center justify-between text-left"
          onClick={() => setFiltrosAbertos(!filtrosAbertos)}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <span className="font-medium">Filtros de Notas Fiscais</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Filtre as notas fiscais por período de emissão, vencimento ou status.
                  Por padrão, apenas notas em aberto e vencidas são exibidas.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </button>

        {filtrosAbertos && (
          <div className="px-4 pb-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Status */}
              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <Select
                  value={filtros.status?.[0] || 'aberta'}
                  onValueChange={(value) =>
                    setFiltros({ ...filtros, status: value ? [value as StatusNota] : [] })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberta">Em aberto</SelectItem>
                    <SelectItem value="vencida">Vencidas</SelectItem>
                    <SelectItem value="liquidada">Liquidadas</SelectItem>
                    <SelectItem value="cancelada">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Emissão Início */}
              <div>
                <Label className="text-sm text-muted-foreground">Emissão de</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filtros.data_emissao_inicio || ''}
                    onChange={(e) =>
                      setFiltros({ ...filtros, data_emissao_inicio: e.target.value })
                    }
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Data Emissão Fim */}
              <div>
                <Label className="text-sm text-muted-foreground">Emissão até</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filtros.data_emissao_fim || ''}
                    onChange={(e) =>
                      setFiltros({ ...filtros, data_emissao_fim: e.target.value })
                    }
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Data Vencimento Início */}
              <div>
                <Label className="text-sm text-muted-foreground">Vencimento de</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filtros.data_vencimento_inicio || ''}
                    onChange={(e) =>
                      setFiltros({ ...filtros, data_vencimento_inicio: e.target.value })
                    }
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Data Vencimento Fim */}
              <div>
                <Label className="text-sm text-muted-foreground">Vencimento até</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filtros.data_vencimento_fim || ''}
                    onChange={(e) =>
                      setFiltros({ ...filtros, data_vencimento_fim: e.target.value })
                    }
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={limparFiltros}>
                <X className="h-4 w-4 mr-1" />
                Restaurar padrão
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Notas Fiscais */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="font-medium">
              {notasFiltradas.length} nota(s) encontrada(s)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-8"
            >
              {notasSelecionadas.length === notasFiltradas.length ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Desmarcar todas
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-1" />
                  Selecionar todas
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="default" className="bg-primary">
              {notasSelecionadas.length} selecionada(s)
            </Badge>
            {notasSelecionadas.length > 0 && (
              <span className="text-sm font-semibold text-success">
                Total: {formatarMoeda(valorTotal)}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nota Fiscal</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Moeda</TableHead>
                <TableHead>Nº Cobrança</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notasFiltradas.map((nota) => (
                <TableRow
                  key={nota.id}
                  className="cursor-pointer"
                  onClick={() => handleSelectNota(nota.id)}
                >
                  <TableCell>
                    <Checkbox
                      checked={notasSelecionadas.includes(nota.id)}
                      onCheckedChange={() => handleSelectNota(nota.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {nota.numero_nota}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{nota.serie}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {getClienteNome(nota.codigo_cliente)}
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {getClienteCnpj(nota.codigo_cliente)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatarData(nota.data_emissao)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatarData(nota.data_vencimento)}</TableCell>
                  <TableCell className="font-semibold text-right whitespace-nowrap">
                    {formatarMoeda(nota.valor_titulo)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{nota.moeda || 'BRL'}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {nota.referencia_interna || '-'}
                  </TableCell>
                  <TableCell>
                    <span className={`badge-status ${STATUS_LABELS[nota.status].className}`}>
                      {STATUS_LABELS[nota.status].label}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {notasFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    Nenhuma nota fiscal encontrada com os filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
