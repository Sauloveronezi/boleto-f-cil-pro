import { Link } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  Receipt, 
  Building2, 
  ArrowRight, 
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { clientesMock, notasFiscaisMock, bancosMock } from '@/data/mockData';

export default function Dashboard() {
  const notasAbertas = notasFiscaisMock.filter(n => n.status === 'aberta').length;
  const notasVencidas = notasFiscaisMock.filter(n => n.status === 'vencida').length;
  const valorTotal = notasFiscaisMock
    .filter(n => n.status === 'aberta' || n.status === 'vencida')
    .reduce((acc, n) => acc + n.valor_titulo, 0);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do sistema de gestão de boletos
            </p>
          </div>
          <Link to="/gerar-boletos">
            <Button size="lg" className="gap-2">
              <FileText className="h-5 w-5" />
              Gerar Boletos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Clientes Ativos</p>
                  <p className="text-3xl font-bold mt-2">{clientesMock.length}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-success" />
                <span>Cadastros atualizados</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notas em Aberto</p>
                  <p className="text-3xl font-bold mt-2">{notasAbertas}</p>
                </div>
                <div className="p-3 bg-info/10 rounded-xl">
                  <Receipt className="h-6 w-6 text-info" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-info" />
                <span>Aguardando geração de boleto</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notas Vencidas</p>
                  <p className="text-3xl font-bold mt-2 text-warning">{notasVencidas}</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-warning" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span>Atenção necessária</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bancos Ativos</p>
                  <p className="text-3xl font-bold mt-2">{bancosMock.filter(b => b.ativo).length}</p>
                </div>
                <div className="p-3 bg-success/10 rounded-xl">
                  <Building2 className="h-6 w-6 text-success" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Configurados e prontos</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Valor Total */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Valor Total a Receber (Notas em Aberto + Vencidas)
                </p>
                <p className="text-4xl font-bold mt-2 text-primary">
                  {formatarMoeda(valorTotal)}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Em aberto</p>
                  <p className="font-semibold text-info">{notasAbertas} nota(s)</p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Vencidas</p>
                  <p className="font-semibold text-warning">{notasVencidas} nota(s)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Atalhos Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-card-hover transition-all hover:-translate-y-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Gerar Boletos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Inicie o processo de geração de boletos selecionando banco, clientes e notas fiscais.
              </p>
              <Link to="/gerar-boletos">
                <Button variant="outline" className="w-full">
                  Iniciar <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card-hover transition-all hover:-translate-y-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Gerenciar Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Visualize e gerencie os clientes cadastrados no sistema.
              </p>
              <Link to="/clientes">
                <Button variant="outline" className="w-full">
                  Ver Clientes <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-card-hover transition-all hover:-translate-y-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Configurar Bancos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure os bancos emissores e suas respectivas taxas e instruções.
              </p>
              <Link to="/bancos">
                <Button variant="outline" className="w-full">
                  Ver Bancos <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Últimas Notas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Últimas Notas Fiscais</CardTitle>
              <Link to="/notas">
                <Button variant="ghost" size="sm">
                  Ver todas <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nota</th>
                    <th>Cliente</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {notasFiscaisMock.slice(0, 5).map((nota) => {
                    const cliente = clientesMock.find((c) => c.id === nota.codigo_cliente);
                    return (
                      <tr key={nota.id}>
                        <td className="font-medium">
                          {nota.numero_nota}-{nota.serie}
                        </td>
                        <td className="max-w-[200px] truncate">
                          {cliente?.razao_social}
                        </td>
                        <td>{new Date(nota.data_vencimento).toLocaleDateString('pt-BR')}</td>
                        <td className="font-semibold">{formatarMoeda(nota.valor_titulo)}</td>
                        <td>
                          <Badge
                            variant={
                              nota.status === 'aberta'
                                ? 'default'
                                : nota.status === 'vencida'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {nota.status === 'aberta'
                              ? 'Em aberto'
                              : nota.status === 'vencida'
                              ? 'Vencida'
                              : nota.status === 'liquidada'
                              ? 'Liquidada'
                              : 'Cancelada'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
