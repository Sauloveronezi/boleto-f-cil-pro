import { useState } from 'react';
import { Globe, Play, RefreshCw, Clock, Check, AlertCircle, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApiIntegracoes, useSyncApi, useUpdateIntegracao, useSyncLogs } from '@/hooks/useApiIntegracao';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ApiConfigCard() {
  const { toast } = useToast();
  const { data: integracoes, isLoading } = useApiIntegracoes();
  const { data: logs } = useSyncLogs();
  const syncApi = useSyncApi();
  const updateIntegracao = useUpdateIntegracao();

  const integracao = integracoes?.[0]; // Pegar primeira integração
  
  const [endpoint, setEndpoint] = useState(integracao?.endpoint_base || '');
  const [apiToken, setApiToken] = useState('');
  const [modoDemo, setModoDemo] = useState(integracao?.modo_demo ?? true);
  const [camposChave, setCamposChave] = useState(
    integracao?.campos_chave?.join(', ') || 'numero_nota, cliente_id, numero_cobranca'
  );

  const handleSyncronizar = async () => {
    try {
      const result = await syncApi.mutateAsync({
        integracao_id: integracao?.id,
        modo_demo: modoDemo,
        endpoint: endpoint || undefined,
        headers_auth: apiToken ? { Authorization: `Bearer ${apiToken}` } : undefined
      });

      if (result.success) {
        toast({
          title: 'Sincronização concluída',
          description: `${result.registros_novos} novos, ${result.registros_atualizados} atualizados em ${result.duracao_ms}ms`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: 'Erro na sincronização',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSalvarConfig = async () => {
    if (!integracao) return;

    try {
      await updateIntegracao.mutateAsync({
        id: integracao.id,
        endpoint_base: endpoint,
        modo_demo: modoDemo,
        campos_chave: camposChave.split(',').map(c => c.trim())
      });

      toast({
        title: 'Configurações salvas',
        description: 'As configurações da API foram atualizadas.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const ultimoLog = logs?.[0];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card de Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" />
            Integração SAP / API
            <Badge variant={modoDemo ? 'secondary' : 'default'} className="ml-2">
              {modoDemo ? 'Modo Demo' : 'Produção'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Configure a conexão com a API SAP/ERP para importar dados de boletos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle Modo Demo */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${modoDemo ? 'bg-warning/10' : 'bg-success/10'}`}>
                {modoDemo ? (
                  <Settings2 className="h-5 w-5 text-warning" />
                ) : (
                  <Globe className="h-5 w-5 text-success" />
                )}
              </div>
              <div>
                <h3 className="font-medium">
                  {modoDemo ? 'Modo Demonstração' : 'Modo Produção'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {modoDemo
                    ? 'Usando dados fictícios para testes'
                    : 'Conectado à API real'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Demo</span>
              <Switch 
                checked={!modoDemo} 
                onCheckedChange={(checked) => setModoDemo(!checked)} 
              />
              <span className="text-sm text-muted-foreground">Produção</span>
            </div>
          </div>

          {/* Campos de Configuração */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2">
                Endpoint da API
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>URL base da API SAP/ERP que retorna os dados de boletos.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://api.sap.com/boletos"
                disabled={modoDemo}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                Token de Autenticação
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Token Bearer para autenticação na API.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="••••••••••••••••"
                disabled={modoDemo}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              Campos Chave (para evitar duplicatas)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Campos separados por vírgula que compõem a chave única.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              value={camposChave}
              onChange={(e) => setCamposChave(e.target.value)}
              placeholder="numero_nota, cliente_id, numero_cobranca"
              className="mt-1"
            />
          </div>

          <Separator />

          {/* Botões de Ação */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleSyncronizar}
              disabled={syncApi.isPending}
              className="gap-2"
            >
              {syncApi.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {modoDemo ? 'Sincronizar (Demo)' : 'Sincronizar API'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleSalvarConfig}
              disabled={updateIntegracao.isPending}
            >
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card de Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Última Sincronização
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ultimoLog ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {ultimoLog.status === 'sucesso' ? (
                  <Badge className="bg-success gap-1">
                    <Check className="h-3 w-3" />
                    Sucesso
                  </Badge>
                ) : ultimoLog.status === 'parcial' ? (
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Parcial
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Erro
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {format(new Date(ultimoLog.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Processados</p>
                  <p className="font-medium">{ultimoLog.registros_processados}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Novos</p>
                  <p className="font-medium text-success">{ultimoLog.registros_novos}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Atualizados</p>
                  <p className="font-medium">{ultimoLog.registros_atualizados}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duração</p>
                  <p className="font-medium">{ultimoLog.duracao_ms}ms</p>
                </div>
              </div>

              {ultimoLog.erros && ultimoLog.erros.length > 0 && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm font-medium text-destructive">
                    {ultimoLog.erros.length} erro(s) encontrado(s)
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma sincronização realizada ainda. Clique em "Sincronizar" para importar dados.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
