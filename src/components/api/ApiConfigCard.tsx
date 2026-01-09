import { useState } from 'react';
import { RefreshCw, Globe, Clock, ChevronDown, ChevronUp, Play, Settings2, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IntegracaoForm } from './IntegracaoForm';
import { MapeamentoCamposCard } from './MapeamentoCamposCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePermissoes } from '@/hooks/usePermissoes';

interface ApiIntegracao {
  id: string;
  nome: string;
  tipo: string;
  endpoint_base: string | null;
  modo_demo: boolean;
  campos_chave: string[];
  headers_autenticacao: Record<string, string>;
  ativo: boolean;
  ultima_sincronizacao: string | null;
  json_path: string | null;
  modelo_boleto_id: string | null;
  campos_api_detectados?: string[];
}

interface SyncLog {
  id: string;
  integracao_id: string;
  status: string;
  registros_processados: number;
  registros_novos: number;
  registros_atualizados: number;
  erros: any[];
  duracao_ms: number;
  created_at: string;
}

export function ApiConfigCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissoes();
  const [expandedIntegracao, setExpandedIntegracao] = useState<string | null>(null);
  const [syncingIntegracaoId, setSyncingIntegracaoId] = useState<string | null>(null);

  const canCreate = hasPermission('integracoes', 'criar');
  const canEdit = hasPermission('integracoes', 'editar');

  const handleAtualizarCampos = async (integracaoId: string) => {
    if (!canEdit) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para editar integrações.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('test-api-connection', {
        body: { integracao_id: integracaoId, limit: 1 }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao testar API');

      toast({
        title: 'Campos atualizados',
        description: `${data.campos_detectados?.length || 0} campos detectados.`
      });

      queryClient.invalidateQueries({ queryKey: ['api-integracoes'] });
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar campos', description: err.message, variant: 'destructive' });
    }
  };

  const { data: integracoes, isLoading, refetch } = useQuery({
    queryKey: ['api-integracoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_api_integracoes')
        .select('*')
        .is('deleted', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ApiIntegracao[];
    },
  });

  const { data: logs } = useQuery({
    queryKey: ['api-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_api_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as SyncLog[];
    },
  });

  const syncApi = useMutation({
    mutationFn: async ({ integracao_id, modo_demo }: { integracao_id: string; modo_demo: boolean }) => {
      const { data, error } = await supabase.functions.invoke('sync-api-boletos', {
        body: { integracao_id, modo_demo }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['api-integracoes'] });
    }
  });

  const handleSyncronizar = async (integracaoId: string, modoDemo: boolean) => {
    if (!canEdit) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para sincronizar integrações.',
        variant: 'destructive',
      });
      return;
    }
    if (syncApi.isPending) return;

    try {
      // Validar mapeamentos obrigatórios antes de sincronizar
      const { data: mapeamentos, error: mapError } = await supabase
        .from('vv_b_api_mapeamento_campos')
        .select('campo_destino')
        .eq('integracao_id', integracaoId)
        .or('deleted.is.null,deleted.eq.""');

      if (mapError) throw mapError;

      const destinos = new Set((mapeamentos || []).map((m: any) => m.campo_destino));
      // Somente numero_nota e numero_cobranca são obrigatórios - cliente NÃO é obrigatório
      const obrigatorios = [
        { key: 'numero_nota', label: 'Número da Nota' },
        { key: 'numero_cobranca', label: 'Número Cobrança' },
      ];

      const faltando = obrigatorios.filter((c) => !destinos.has(c.key));
      if (faltando.length > 0) {
        toast({
          title: 'Mapeamento incompleto',
          description: `Faltando mapear: ${faltando.map((c) => c.label).join(', ')}`,
          variant: 'destructive',
        });
        return;
      }

      setSyncingIntegracaoId(integracaoId);
      const result = await syncApi.mutateAsync({ integracao_id: integracaoId, modo_demo: modoDemo });

      if (result?.success && (result.status === 'sucesso' || result.status === 'parcial')) {
        const total = (result.registros_novos || 0) + (result.registros_atualizados || 0);
        toast({
          title: result.status === 'parcial' ? 'Sincronização concluída (parcial)' : 'Sincronização concluída',
          description: total > 0 
            ? `${result.registros_atualizados || 0} registros processados`
            : 'Nenhum registro novo ou atualizado',
        });
      } else {
        const primeiroErro = Array.isArray(result?.erros) ? result.erros[0] : null;
        const motivo = primeiroErro?.erro 
          ? primeiroErro.erro
          : (result?.error || 'Verifique o preview (Testar API) e os mapeamentos de campos.');

        toast({
          title: 'Erro na sincronização',
          description: motivo,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({ title: 'Erro na sincronização', description: error.message, variant: 'destructive' });
    } finally {
      setSyncingIntegracaoId(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Integrações de API</h2>
          <p className="text-sm text-muted-foreground">Configure conexões com APIs externas.</p>
        </div>
        <IntegracaoForm onSave={refetch} />
      </div>

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
                      <div className={`p-2 rounded-lg ${integracao.modo_demo ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>
                        {integracao.modo_demo ? <Settings2 className="h-5 w-5 text-yellow-600" /> : <Globe className="h-5 w-5 text-green-600" />}
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {integracao.nome}
                          <Badge variant="outline">{integracao.tipo}</Badge>
                          <Badge variant={integracao.modo_demo ? 'secondary' : 'default'}>{integracao.modo_demo ? 'Demo' : 'Produção'}</Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{integracao.endpoint_base || 'Endpoint não configurado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncronizar(integracao.id, integracao.modo_demo)}
                        disabled={syncApi.isPending}
                      >
                        {syncApi.isPending && syncingIntegracaoId === integracao.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span className="ml-2">Sincronizar</span>
                      </Button>
                      <IntegracaoForm integracao={integracao as any} onSave={refetch} />
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {expandedIntegracao === integracao.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <Separator />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Última Sincronização</p>
                        <p className="font-medium">{integracao.ultima_sincronizacao ? format(new Date(integracao.ultima_sincronizacao), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'Nunca'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Caminho JSON</p>
                        <code className="text-xs bg-muted px-1 rounded">{integracao.json_path || 'd.results'}</code>
                      </div>
                    </div>
                    <Separator />
                    <MapeamentoCamposCard
                      integracaoId={integracao.id}
                      integracaoNome={integracao.nome}
                      camposApiDetectados={integracao.campos_api_detectados || []}
                      onRefreshCampos={() => handleAtualizarCampos(integracao.id)}
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
            <p className="text-sm text-muted-foreground mb-4">Adicione uma integração para conectar a APIs externas.</p>
            {canCreate && <IntegracaoForm onSave={refetch} />}
          </CardContent>
        </Card>
      )}

      {ultimoLog && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Última Sincronização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge className={ultimoLog.status === 'sucesso' ? 'bg-green-600' : ultimoLog.status === 'parcial' ? 'bg-yellow-600' : 'bg-red-600'}>
                {ultimoLog.status === 'sucesso' ? <Check className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                {ultimoLog.status}
              </Badge>
              <span className="text-sm text-muted-foreground">{format(new Date(ultimoLog.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              <span className="text-sm">Novos: {ultimoLog.registros_novos} | Atualizados: {ultimoLog.registros_atualizados}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
