import { useState, useMemo } from 'react';
import { Search, Filter, X, CheckSquare, Square } from 'lucide-react';
import { Cliente, FiltroCliente } from '@/types/boleto';
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
import {
  getEstadosUnicos,
  getCidadesUnicas,
  getLzonesUnicos,
  getParceirosUnicos,
  getAgentesUnicos,
} from '@/data/mockData';

interface ClienteFilterProps {
  clientes: Cliente[];
  clientesSelecionados: string[];
  onClientesChange: (clienteIds: string[]) => void;
}

export function ClienteFilter({
  clientes,
  clientesSelecionados,
  onClientesChange,
}: ClienteFilterProps) {
  const [filtros, setFiltros] = useState<FiltroCliente>({});
  const [busca, setBusca] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);

  const estados = getEstadosUnicos();
  const cidades = getCidadesUnicas();
  const lzones = getLzonesUnicos();
  const parceiros = getParceirosUnicos();
  const agentes = getAgentesUnicos();

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((cliente) => {
      if (busca) {
        const termoBusca = busca.toLowerCase();
        if (
          !cliente.razao_social.toLowerCase().includes(termoBusca) &&
          !cliente.cnpj.includes(busca)
        ) {
          return false;
        }
      }

      if (filtros.estado?.length && !filtros.estado.includes(cliente.estado)) {
        return false;
      }

      if (filtros.cidade?.length && !filtros.cidade.includes(cliente.cidade)) {
        return false;
      }

      if (filtros.lzone?.length && !filtros.lzone.includes(cliente.lzone)) {
        return false;
      }

      if (filtros.parceiro_negocio?.length && !filtros.parceiro_negocio.includes(cliente.parceiro_negocio)) {
        return false;
      }

      if (filtros.agente_frete?.length && !filtros.agente_frete.includes(cliente.agente_frete)) {
        return false;
      }

      return true;
    });
  }, [clientes, filtros, busca]);

  const handleSelectAll = () => {
    if (clientesSelecionados.length === clientesFiltrados.length) {
      onClientesChange([]);
    } else {
      onClientesChange(clientesFiltrados.map((c) => c.id));
    }
  };

  const handleSelectCliente = (clienteId: string) => {
    if (clientesSelecionados.includes(clienteId)) {
      onClientesChange(clientesSelecionados.filter((id) => id !== clienteId));
    } else {
      onClientesChange([...clientesSelecionados, clienteId]);
    }
  };

  const limparFiltros = () => {
    setFiltros({});
    setBusca('');
  };

  const temFiltrosAtivos = busca || Object.values(filtros).some((v) => v?.length);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Seção de Filtros */}
      <div className="bg-card border border-border rounded-lg">
        <button
          className="w-full px-4 py-3 flex items-center justify-between text-left"
          onClick={() => setFiltrosAbertos(!filtrosAbertos)}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <span className="font-medium">Filtros de Cliente</span>
            {temFiltrosAtivos && (
              <Badge variant="secondary" className="ml-2">
                Filtros ativos
              </Badge>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Use os filtros para encontrar clientes específicos. Você pode
                  combinar vários filtros para refinar sua busca.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </button>

        {filtrosAbertos && (
          <div className="px-4 pb-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Busca por nome/CNPJ */}
              <div className="lg:col-span-2">
                <Label className="text-sm text-muted-foreground">Buscar por nome ou CNPJ</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite para buscar..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Zona Logística */}
              <div>
                <Label className="text-sm text-muted-foreground">Zona Logística</Label>
                <Select
                  value={filtros.lzone?.[0] || ''}
                  onValueChange={(value) =>
                    setFiltros({ ...filtros, lzone: value ? [value] : [] })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todas as zonas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as zonas</SelectItem>
                    {lzones.map((lzone) => (
                      <SelectItem key={lzone} value={lzone}>
                        {lzone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div>
                <Label className="text-sm text-muted-foreground">Estado</Label>
                <Select
                  value={filtros.estado?.[0] || ''}
                  onValueChange={(value) =>
                    setFiltros({ ...filtros, estado: value ? [value] : [] })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os estados</SelectItem>
                    {estados.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cidade */}
              <div>
                <Label className="text-sm text-muted-foreground">Cidade</Label>
                <Select
                  value={filtros.cidade?.[0] || ''}
                  onValueChange={(value) =>
                    setFiltros({ ...filtros, cidade: value ? [value] : [] })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as cidades</SelectItem>
                    {cidades.map((cidade) => (
                      <SelectItem key={cidade} value={cidade}>
                        {cidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parceiro de Negócio */}
              <div>
                <Label className="text-sm text-muted-foreground">Parceiro de Negócio</Label>
                <Select
                  value={filtros.parceiro_negocio?.[0] || ''}
                  onValueChange={(value) =>
                    setFiltros({ ...filtros, parceiro_negocio: value ? [value] : [] })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos os parceiros" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os parceiros</SelectItem>
                    {parceiros.map((parceiro) => (
                      <SelectItem key={parceiro} value={parceiro}>
                        {parceiro}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agente de Frete */}
              <div>
                <Label className="text-sm text-muted-foreground">Agente de Frete</Label>
                <Select
                  value={filtros.agente_frete?.[0] || ''}
                  onValueChange={(value) =>
                    setFiltros({ ...filtros, agente_frete: value ? [value] : [] })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos os agentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os agentes</SelectItem>
                    {agentes.map((agente) => (
                      <SelectItem key={agente} value={agente}>
                        {agente}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {temFiltrosAtivos && (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={limparFiltros}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-medium">
              {clientesFiltrados.length} cliente(s) encontrado(s)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-8"
            >
              {clientesSelecionados.length === clientesFiltrados.length ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Desmarcar todos
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-1" />
                  Selecionar todos
                </>
              )}
            </Button>
          </div>
          <Badge variant="default" className="bg-primary">
            {clientesSelecionados.length} selecionado(s)
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Parceiro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesFiltrados.map((cliente) => (
                <TableRow
                  key={cliente.id}
                  className="cursor-pointer"
                  onClick={() => handleSelectCliente(cliente.id)}
                >
                  <TableCell>
                    <Checkbox
                      checked={clientesSelecionados.includes(cliente.id)}
                      onCheckedChange={() => handleSelectCliente(cliente.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{cliente.razao_social}</TableCell>
                  <TableCell>{cliente.cnpj}</TableCell>
                  <TableCell>
                    {cliente.cidade}/{cliente.estado}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{cliente.lzone}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cliente.parceiro_negocio}
                  </TableCell>
                </TableRow>
              ))}
              {clientesFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum cliente encontrado com os filtros aplicados.
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
