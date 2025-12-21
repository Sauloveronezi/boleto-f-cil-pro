import { useState } from 'react';
import { Globe, Play, RefreshCw, Clock, Check, AlertCircle, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useApiIntegracoes, useSyncApi, useSyncLogs } from '@/hooks/useApiIntegracao';
import { IntegracaoForm } from './IntegracaoForm';
import { MapeamentoCamposCard } from './MapeamentoCamposCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ApiConfigCard() {
  const { toast } = useToast();
  const { data: integracoes, isLoading, refetch } = useApiIntegracoes();
  const { data: logs } = useSyncLogs();
  const syncApi = useSyncApi();
  
  const [expandedIntegracao, setExpandedIntegracao] = useState<string | null>(null);

  const handleSyncronizar = async (integracaoId: string, modoDemo: boolean) => {
    try {
      const result = await syncApi.mutateAsync({
        integracao_id: integracaoId,
        modo_demo: modoDemo,
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
      {/* Header com botão de nova integração */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Integrações de API</h2>
          <p className="text-sm text-muted-foreground">
            Configure conexões com APIs externas para importar dados de boletos.
          </p>
        </div>
        <IntegracaoForm onSave={refetch} />
      </div>

      {/* Lista de integrações */}
      {integracoes && integracoes.length > 0 ? (
        <div className="space-y-4">
          {integracoes.map((integracao) => (
            <Collapsible
              key={integracao.id}
              open={expandedIntegracao === integracao.id}
              onOpenChange={(open) => setExpandedIntegracao(open ? integracao.id : null)}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${integracao.modo_demo ? 'bg-warning/10' : 'bg-success/10'}`}>
                        {integracao.modo_demo ? (
                          <Settings2 className="h-5 w-5 text-warning" />
                        ) : (
                          <Globe className="h-5 w-5 text-success" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {integracao.nome}
                          <Badge variant="outline">{integracao.tipo}</Badge>
                          <Badge variant={integracao.modo_demo ? 'secondary' : 'default'}>
                            {integracao.modo_demo ? 'Demo' : 'Produção'}
                          </Badge>
                          {!integracao.ativo && (
                            <Badge variant="destructive">Inativo</Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {integracao.endpoint_base || 'Endpoint não configurado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncronizar(integracao.id, integracao.modo_demo)}
                        disabled={syncApi.isPending}
                      >
                        {syncApi.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span className="ml-2">Sincronizar</span>
                      </Button>
                      <IntegracaoForm integracao={integracao as any} onSave={refetch} />
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {expandedIntegracao === integracao.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>
                
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <Separator />
                    
                    {/* Info da integração */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Campos Chave</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {integracao.campos_chave?.map((c) => (
                            <Badge key={c} variant="secondary" className="text-xs">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Última Sincronização</p>
                        <p className="font-medium">
                          {integracao.ultima_sincronizacao
                            ? format(new Date(integracao.ultima_sincronizacao), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : 'Nunca'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Caminho JSON</p>
                        <code className="text-xs bg-muted px-1 rounded">
                          {integracao.json_path || 'd.results'}
                        </code>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge variant={integracao.ativo ? 'default' : 'secondary'}>
                          {integracao.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Mapeamento de campos */}
                    <MapeamentoCamposCard
                      integracaoId={integracao.id}
                      integracaoNome={integracao.nome}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Nenhuma integração configurada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione uma integração para conectar a APIs externas.
            </p>
            <IntegracaoForm onSave={refetch} />
          </CardContent>
        </Card>
      )}

      {/* Card de Status da última sincronização */}
      {ultimoLog && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Última Sincronização Global
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
