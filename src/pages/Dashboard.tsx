import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  Receipt, 
  Building2, 
  ArrowRight, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Printer,
  Truck,
  Loader2
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissoes } from '@/hooks/usePermissoes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function Dashboard() {
  const navigate = useNavigate();
  const { canAccess } = usePermissoes();

  // Carregar boletos reais da API
  const { data: boletos, isLoading } = useQuery({
    queryKey: ['dashboard-boletos-api'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_boletos_api')
        .select('id, numero_nota, numero_cobranca, valor, data_vencimento, cod_barras_calculado, dyn_zonatransporte, dyn_nome_do_cliente, banco, erro_emissao')
        .is('deleted', null);
      if (error) throw error;
      return data || [];
    }
  });

  const boletosParaEmitir = boletos?.filter(b => !b.cod_barras_calculado) || [];
  const boletosJaEmitidos = boletos?.filter(b => !!b.cod_barras_calculado) || [];
  const valorTotal = boletos?.reduce((acc, b) => acc + (b.valor || 0), 0) || 0;
  const boletosComErro = boletos?.filter(b => !!b.erro_emissao) || [];

  // Agrupar por transportadora
  const porTransportadora = (boletos || []).reduce<Record<string, { total: number; valor: number; emitidos: number; pendentes: number }>>((acc, b) => {
    const zona = b.dyn_zonatransporte || 'Sem Transportadora';
    if (!acc[zona]) acc[zona] = { total: 0, valor: 0, emitidos: 0, pendentes: 0 };
    acc[zona].total++;
    acc[zona].valor += b.valor || 0;
    if (b.cod_barras_calculado) acc[zona].emitidos++;
    else acc[zona].pendentes++;
    return acc;
  }, {});

  const transportadorasOrdenadas = Object.entries(porTransportadora)
    .sort((a, b) => b[1].total - a[1].total);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const navegarBoletos = (filtro?: string) => {
    if (filtro) {
      navigate(`/boletos-api?filtro=${filtro}`);
    } else {
      navigate('/boletos-api');
    }
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
          {canAccess('boletos_api') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="lg" className="gap-2" onClick={() => navegarBoletos('pendentes')}>
                    <Printer className="h-5 w-5" />
                    Emitir Boletos
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ir para Boletos via API com filtro de pendentes</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card 
                className="hover:shadow-card-hover transition-shadow cursor-pointer"
                onClick={() => canAccess('boletos_api') && navegarBoletos('pendentes')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Boletos p/ Emitir</p>
                      <p className="text-3xl font-bold mt-2">{boletosParaEmitir.length}</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <span>Pendentes de emissão</span>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-card-hover transition-shadow cursor-pointer"
                onClick={() => canAccess('boletos_api') && navegarBoletos('emitidos')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Boletos Emitidos</p>
                      <p className="text-3xl font-bold mt-2 text-success">{boletosJaEmitidos.length}</p>
                    </div>
                    <div className="p-3 bg-success/10 rounded-xl">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>Já processados</span>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-card-hover transition-shadow cursor-pointer"
                onClick={() => canAccess('boletos_api') && navegarBoletos('erros')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Com Erros</p>
                      <p className="text-3xl font-bold mt-2 text-destructive">{boletosComErro.length}</p>
                    </div>
                    <div className="p-3 bg-destructive/10 rounded-xl">
                      <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span>Atenção necessária</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-card-hover transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total de Boletos</p>
                      <p className="text-3xl font-bold mt-2">{boletos?.length || 0}</p>
                    </div>
                    <div className="p-3 bg-info/10 rounded-xl">
                      <Receipt className="h-6 w-6 text-info" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-info" />
                    <span>Importados da API</span>
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
                      Valor Total dos Boletos
                    </p>
                    <p className="text-4xl font-bold mt-2 text-primary">
                      {formatarMoeda(valorTotal)}
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                      <p className="font-semibold text-warning">{boletosParaEmitir.length} boleto(s)</p>
                      <p className="text-xs text-muted-foreground">{formatarMoeda(boletosParaEmitir.reduce((s, b) => s + (b.valor || 0), 0))}</p>
                    </div>
                    <div className="w-px h-12 bg-border" />
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Emitidos</p>
                      <p className="font-semibold text-success">{boletosJaEmitidos.length} boleto(s)</p>
                      <p className="text-xs text-muted-foreground">{formatarMoeda(boletosJaEmitidos.reduce((s, b) => s + (b.valor || 0), 0))}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Boletos por Transportadora */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Boletos por Transportadora
                  </CardTitle>
                  <Badge variant="secondary">{transportadorasOrdenadas.length} transportadora(s)</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {transportadorasOrdenadas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum boleto encontrado.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {transportadorasOrdenadas.map(([zona, dados]) => (
                      <Card 
                        key={zona} 
                        className="hover:shadow-card-hover transition-all hover:-translate-y-1 cursor-pointer border-border"
                        onClick={() => {
                          if (canAccess('boletos_api')) {
                            navigate(`/boletos-api?zona=${encodeURIComponent(zona)}`);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-sm truncate flex-1" title={zona}>{zona}</h3>
                            <Badge variant="outline" className="ml-2">{dados.total}</Badge>
                          </div>
                          <p className="text-lg font-bold text-primary">{formatarMoeda(dados.valor)}</p>
                          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-warning" />
                              {dados.pendentes} pendente(s)
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-success" />
                              {dados.emitidos} emitido(s)
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Atalhos Rápidos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {canAccess('boletos_api') && (
                <Card className="hover:shadow-card-hover transition-all hover:-translate-y-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Printer className="h-5 w-5 text-primary" />
                      Emitir Boletos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Acesse os boletos importados da API para seleção e emissão.
                    </p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" className="w-full" onClick={() => navegarBoletos('pendentes')}>
                            Ir para Boletos <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Abre Boletos via API filtrado por pendentes</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardContent>
                </Card>
              )}

              {canAccess('clientes') && (
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" className="w-full" onClick={() => navigate('/clientes')}>
                            Ver Clientes <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Abre a tela de gestão de clientes</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardContent>
                </Card>
              )}

              {canAccess('bancos') && (
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" className="w-full" onClick={() => navigate('/bancos')}>
                            Ver Bancos <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Abre a tela de configuração de bancos</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
