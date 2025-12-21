import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, ArrowRight, GripVertical, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface MapeamentoCampo {
  id: string;
  integracao_id: string;
  campo_api: string;
  campo_destino: string;
  tipo_dado: string;
  obrigatorio: boolean;
  valor_padrao: string | null;
  transformacao: string | null;
  ordem: number;
}

interface MapeamentoCamposCardProps {
  integracaoId: string;
  integracaoNome: string;
  camposApiDetectados?: string[];
  onRefreshCampos?: () => void;
}

const CAMPOS_DESTINO = [
  { value: 'numero_nota', label: 'Número da Nota', tipo_sugerido: 'string' },
  { value: 'numero_cobranca', label: 'Número Cobrança', tipo_sugerido: 'string' },
  { value: 'cliente_cnpj', label: 'CNPJ Cliente', tipo_sugerido: 'string' },
  { value: 'valor', label: 'Valor', tipo_sugerido: 'number' },
  { value: 'data_emissao', label: 'Data Emissão', tipo_sugerido: 'date' },
  { value: 'data_vencimento', label: 'Data Vencimento', tipo_sugerido: 'date' },
  { value: 'dados_extras', label: 'Dados Extras (JSON)', tipo_sugerido: 'string' },
];

const TIPOS_DADO = [
  { value: 'string', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'boolean', label: 'Booleano' },
];

export function MapeamentoCamposCard({ 
  integracaoId, 
  integracaoNome, 
  camposApiDetectados = [],
  onRefreshCampos
}: MapeamentoCamposCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [novoCampoApi, setNovoCampoApi] = useState('');
  
  const [novoCampo, setNovoCampo] = useState({
    campo_api: '',
    campo_destino: 'dados_extras',
    tipo_dado: 'string',
    obrigatorio: false,
  });

  const { data: mapeamentos, isLoading } = useQuery({
    queryKey: ['mapeamento-campos', integracaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_api_mapeamento_campos')
        .select('*')
        .eq('integracao_id', integracaoId)
        .is('deleted', null)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as MapeamentoCampo[];
    },
    enabled: !!integracaoId,
  });

  // Campos já mapeados (para marcar como usados, mas não remover)
  const camposMapeados = new Set(mapeamentos?.map(m => m.campo_api) || []);
  
  // TODOS os campos da API devem aparecer, marcando os já usados
  const camposDisponiveis = camposApiDetectados.map(campo => ({
    campo,
    jaMapeado: camposMapeados.has(campo)
  }));

  // Atualizar seleção do campo quando mudar
  useEffect(() => {
    if (novoCampo.campo_api && novoCampo.campo_api !== novoCampoApi) {
      setNovoCampoApi(novoCampo.campo_api);
    }
  }, [novoCampo.campo_api]);

  const handleAddCampo = async () => {
    const campoApi = novoCampo.campo_api || novoCampoApi;
    
    if (!campoApi) {
      toast({
        title: 'Erro',
        description: 'Selecione ou digite um campo da API.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('vv_b_api_mapeamento_campos')
        .insert({
          integracao_id: integracaoId,
          campo_api: campoApi,
          campo_destino: novoCampo.campo_destino,
          tipo_dado: novoCampo.tipo_dado,
          obrigatorio: novoCampo.obrigatorio,
          ordem: (mapeamentos?.length || 0) + 1,
        });

      if (error) throw error;

      toast({ title: 'Campo adicionado' });
      setNovoCampo({
        campo_api: '',
        campo_destino: 'dados_extras',
        tipo_dado: 'string',
        obrigatorio: false,
      });
      setNovoCampoApi('');
      queryClient.invalidateQueries({ queryKey: ['mapeamento-campos', integracaoId] });
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCampo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vv_b_api_mapeamento_campos')
        .update({ deleted: 'S', data_delete: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Campo removido' });
      queryClient.invalidateQueries({ queryKey: ['mapeamento-campos', integracaoId] });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCampo = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('vv_b_api_mapeamento_campos')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['mapeamento-campos', integracaoId] });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSelectCampoDestino = (campoDestino: string) => {
    const destino = CAMPOS_DESTINO.find(c => c.value === campoDestino);
    setNovoCampo({
      ...novoCampo,
      campo_destino: campoDestino,
      tipo_dado: destino?.tipo_sugerido || 'string'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Mapeamento de Campos - {integracaoNome}
            </CardTitle>
            <CardDescription>
              Configure o de-para entre os campos da API e a tabela de destino.
            </CardDescription>
          </div>
          {onRefreshCampos && (
            <Button variant="outline" size="sm" onClick={onRefreshCampos} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar Campos
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campos detectados da API - mostra todos, marca os já mapeados */}
        {camposApiDetectados.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Campos Disponíveis da API ({camposApiDetectados.length} campos, {camposDisponiveis.filter(c => c.jaMapeado).length} já mapeados)
            </Label>
            <div className="flex flex-wrap gap-1 mt-2 max-h-32 overflow-y-auto">
              {camposDisponiveis.map(({ campo, jaMapeado }) => (
                <Badge 
                  key={campo} 
                  variant={jaMapeado ? "secondary" : "outline"}
                  className={`text-xs font-mono cursor-pointer ${
                    jaMapeado 
                      ? 'opacity-60 line-through' 
                      : 'hover:bg-blue-100 dark:hover:bg-blue-900'
                  }`}
                  onClick={() => !jaMapeado && setNovoCampo({ ...novoCampo, campo_api: campo })}
                  title={jaMapeado ? 'Campo já mapeado' : 'Clique para selecionar'}
                >
                  {jaMapeado && '✓ '}{campo}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Adicionar novo campo */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <Label className="font-medium">Adicionar Novo Mapeamento</Label>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs">Campo da API</Label>
              {camposApiDetectados.length > 0 ? (
                <Select
                  value={novoCampo.campo_api}
                  onValueChange={(v) => setNovoCampo({ ...novoCampo, campo_api: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {camposDisponiveis
                      .filter(c => !c.jaMapeado)
                      .map(({ campo }) => (
                        <SelectItem key={campo} value={campo}>
                          <span className="font-mono text-xs">{campo}</span>
                        </SelectItem>
                      ))}
                    <SelectItem value="__custom__">
                      <span className="text-muted-foreground">+ Campo personalizado</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={novoCampoApi}
                  onChange={(e) => {
                    setNovoCampoApi(e.target.value);
                    setNovoCampo({ ...novoCampo, campo_api: e.target.value });
                  }}
                  placeholder="d.results.PaymentDocument"
                  className="mt-1 font-mono text-xs"
                />
              )}
              {novoCampo.campo_api === '__custom__' && (
                <Input
                  value={novoCampoApi}
                  onChange={(e) => setNovoCampoApi(e.target.value)}
                  placeholder="Digite o caminho do campo"
                  className="mt-2 font-mono text-xs"
                />
              )}
            </div>
            <div>
              <Label className="text-xs">Campo Destino</Label>
              <Select
                value={novoCampo.campo_destino}
                onValueChange={handleSelectCampoDestino}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPOS_DESTINO.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select
                value={novoCampo.tipo_dado}
                onValueChange={(v) => setNovoCampo({ ...novoCampo, tipo_dado: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DADO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={novoCampo.obrigatorio}
                onCheckedChange={(v) => setNovoCampo({ ...novoCampo, obrigatorio: v })}
              />
              <Label className="text-xs">Obrigatório</Label>
            </div>
            <Button onClick={handleAddCampo} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </div>
        </div>

        {/* Lista de campos mapeados */}
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        ) : mapeamentos && mapeamentos.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Campo API</TableHead>
                <TableHead>→</TableHead>
                <TableHead>Campo Destino</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Obrigatório</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mapeamentos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-mono text-sm max-w-[200px] truncate" title={m.campo_api}>
                    {m.campo_api}
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={m.campo_destino}
                      onValueChange={(v) => handleUpdateCampo(m.id, 'campo_destino', v)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPOS_DESTINO.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {TIPOS_DADO.find(t => t.value === m.tipo_dado)?.label || m.tipo_dado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={m.obrigatorio}
                      onCheckedChange={(v) => handleUpdateCampo(m.id, 'obrigatorio', v)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCampo(m.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum campo mapeado. {camposApiDetectados.length > 0 ? 'Clique nos campos acima para mapeá-los.' : 'Adicione campos acima para configurar o de-para.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
