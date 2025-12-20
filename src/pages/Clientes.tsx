import { useState } from 'react';
import { Search, Filter, MapPin, Phone, Mail, Building } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Cliente } from '@/types/boleto';

export default function Clientes() {
  const [busca, setBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  // Sem mocks - lista vazia por enquanto
  const clientes: Cliente[] = [];

  const clientesFiltrados = clientes.filter((cliente) => {
    const termoBusca = busca.toLowerCase();
    return (
      cliente.razao_social.toLowerCase().includes(termoBusca) ||
      cliente.cnpj.includes(busca) ||
      cliente.cidade.toLowerCase().includes(termoBusca) ||
      cliente.estado.toLowerCase().includes(termoBusca)
    );
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Análise de Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie os clientes cadastrados no sistema
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {clientes.length} cliente(s) cadastrado(s)
          </Badge>
        </div>

        {/* Busca */}
        <Card>
          <CardContent className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ, cidade ou estado..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Clientes */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
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
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setClienteSelecionado(cliente)}
                  >
                    <TableCell className="font-mono text-sm">
                      {cliente.business_partner}
                    </TableCell>
                    <TableCell className="font-medium">
                      {cliente.razao_social}
                    </TableCell>
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
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal de Detalhes do Cliente */}
        <Dialog open={!!clienteSelecionado} onOpenChange={() => setClienteSelecionado(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes do Cliente</DialogTitle>
            </DialogHeader>
            {clienteSelecionado && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg">{clienteSelecionado.razao_social}</h3>
                  <p className="text-muted-foreground text-sm">{clienteSelecionado.cnpj}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Código do Parceiro</p>
                    <p className="font-mono">{clienteSelecionado.business_partner}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Zona Logística</p>
                    <Badge variant="outline">{clienteSelecionado.lzone}</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm">{clienteSelecionado.endereco}</p>
                      <p className="text-sm text-muted-foreground">
                        {clienteSelecionado.cidade}/{clienteSelecionado.estado} - CEP {clienteSelecionado.cep}
                      </p>
                    </div>
                  </div>

                  {clienteSelecionado.telefone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{clienteSelecionado.telefone}</p>
                    </div>
                  )}

                  {clienteSelecionado.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{clienteSelecionado.email}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{clienteSelecionado.parceiro_negocio}</p>
                      <p className="text-xs text-muted-foreground">Parceiro de Negócio</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Agente de Frete: {clienteSelecionado.agente_frete}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
