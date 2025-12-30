import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ArrowRight, GripVertical, RefreshCw, Loader2, AlertTriangle, Play, X, Pencil, Check } from 'lucide-react';
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

// Campos padrão que existem na tabela vv_b_boletos_api
const CAMPOS_DESTINO_PADRAO = [
  { value: 'numero_nota', label: 'Número da Nota', tipo_sugerido: 'string', obrigatorio: true },
  { value: 'numero_cobranca', label: 'Número Cobrança', tipo_sugerido: 'string', obrigatorio: true },
  { value: 'cliente_cnpj', label: 'CNPJ Cliente', tipo_sugerido: 'string', obrigatorio: true },
  { value: 'valor', label: 'Valor', tipo_sugerido: 'number', obrigatorio: false },
  { value: 'data_emissao', label: 'Data Emissão', tipo_sugerido: 'date', obrigatorio: false },
  { value: 'data_vencimento', label: 'Data Vencimento', tipo_sugerido: 'date', obrigatorio: false },
  { value: 'data_desconto', label: 'Data Desconto', tipo_sugerido: 'date', obrigatorio: false },
  { value: 'valor_desconto', label: 'Valor Desconto', tipo_sugerido: 'number', obrigatorio: false },
  { value: 'banco', label: 'Banco', tipo_sugerido: 'string', obrigatorio: false },
  { value: 'empresa', label: 'Empresa (Código)', tipo_sugerido: 'number', obrigatorio: false },
  { value: 'cliente', label: 'Nome Cliente', tipo_sugerido: 'string', obrigatorio: false },
];

// Prefixo para campos dinâmicos que serão criados como colunas reais
const CAMPO_DINAMICO_PREFIX = 'dyn_';

const TIPOS_DADO = [
  { value: 'string', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'boolean', label: 'Booleano' },
];

// Tipo de coluna para a função RPC
const TIPO_COLUNA_MAP: Record<string, string> = {
  'string': 'TEXT',
  'number': 'NUMERIC',
  'date': 'DATE',
  'boolean': 'BOOLEAN',
};

export function MapeamentoCamposCard({ 
  integracaoId, 
  integracaoNome, 
  camposApiDetectados = [],
  onRefreshCampos
}: MapeamentoCamposCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [testando, setTestando] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [novoCampoApi, setNovoCampoApi] = useState('');

  const previewColumns = useMemo(() => {
    if (!previewData?.length) return [] as string[];
    const set = new Set<string>();
    for (const row of previewData) {
      Object.keys(row ?? {}).forEach((k) => set.add(k));
    }
    return Array.from(set);
  }, [previewData]);
  
  const [novoCampo, setNovoCampo] = useState({
    campo_api: '',
    campo_destino: 'numero_nota',
    tipo_dado: 'string',
    obrigatorio: false,
  });

  const [novoCampoDinamico, setNovoCampoDinamico] = useState('');
  const [modoCampoDinamico, setModoCampoDinamico] = useState(false);
  
  // Estado para edição inline de mapeamentos existentes
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoCampo, setEditandoCampo] = useState<Partial<MapeamentoCampo>>({});

  // Função para rodar teste e mostrar preview
  const handleTestarMapeamento = async () => {
    setTestando(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-api-connection', {
        body: {
          integracao_id: integracaoId,
          limit: 5 // Trazer 5 registros de amostra
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setPreviewData(data.samples || []);
      setShowPreview(true);
      
      toast({
        title: 'Teste executado',
        description: `${data.samples?.length || 0} registros retornados da API.`
      });
    } catch (error: any) {
      toast({
        title: 'Erro no teste',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTestando(false);
    }
  };

  const { data: mapeamentos, isLoading } = useQuery({
    queryKey: ['mapeamento-campos', integracaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_api_mapeamento_campos')
        .select('*')
        .eq('integracao_id', integracaoId)
        .or('deleted.is.null,deleted.eq.""')
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as MapeamentoCampo[];
    },
    enabled: !!integracaoId,
  });

  // Campos já mapeados (para marcar como usados, mas não remover)
  const camposMapeados = new Set(mapeamentos?.map(m => m.campo_api) || []);
  const camposDestinoMapeados = new Set(mapeamentos?.map(m => m.campo_destino) || []);
  
  // TODOS os campos da API devem aparecer, marcando os já usados
  const camposDisponiveis = camposApiDetectados.map(campo => ({
    campo,
    jaMapeado: camposMapeados.has(campo)
  }));

  // Verificar quais campos obrigatórios ainda faltam mapear
  const camposObrigatoriosFaltando = CAMPOS_DESTINO_PADRAO
    .filter(c => c.obrigatorio && !camposDestinoMapeados.has(c.value));

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

    if (!novoCampo.campo_destino) {
      toast({
        title: 'Erro',
        description: 'Selecione ou crie um campo de destino.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Se é um campo dinâmico (prefixo dyn_), criar a coluna real na tabela
      if (novoCampo.campo_destino.startsWith(CAMPO_DINAMICO_PREFIX)) {
        const tipoColuna = TIPO_COLUNA_MAP[novoCampo.tipo_dado] || 'TEXT';
        
        const { data: resultadoColuna, error: erroColuna } = await supabase.rpc(
          'vv_b_add_dynamic_column',
          { 
            p_column_name: novoCampo.campo_destino, 
            p_column_type: tipoColuna 
          }
        );

        if (erroColuna) {
          console.error('Erro ao criar coluna:', erroColuna);
          throw new Error(`Erro ao criar coluna na tabela: ${erroColuna.message}`);
        }

        if (!resultadoColuna) {
          throw new Error('Não foi possível criar a coluna na tabela.');
        }

        toast({ 
          title: 'Coluna criada', 
          description: `A coluna "${novoCampo.campo_destino}" foi criada na tabela.` 
        });
      }

      // Inserir o mapeamento
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

      toast({ title: 'Mapeamento adicionado' });
      setNovoCampo({
        campo_api: '',
        campo_destino: 'numero_nota',
        tipo_dado: 'string',
        obrigatorio: false,
      });
      setNovoCampoApi('');
      setModoCampoDinamico(false);
      setNovoCampoDinamico('');
      queryClient.invalidateQueries({ queryKey: ['mapeamento-campos', integracaoId] });
      queryClient.invalidateQueries({ queryKey: ['colunas-dinamicas'] });
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
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast({
          title: 'Erro de autenticação',
          description: 'Você precisa estar logado para excluir mapeamentos.',
          variant: 'destructive',
        });
        return;
      }
      
      const usuarioId = userData.user.id;

      const { error } = await supabase
        .from('vv_b_api_mapeamento_campos')
        .update({ deleted: '*', data_delete: new Date().toISOString(), usuario_delete_id: usuarioId })
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
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast({
          title: 'Erro de autenticação',
          description: 'Você precisa estar logado para atualizar mapeamentos.',
          variant: 'destructive',
        });
        return;
      }

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

  // Iniciar edição de um mapeamento
  const handleStartEdit = (mapeamento: MapeamentoCampo) => {
    setEditandoId(mapeamento.id);
    setEditandoCampo({
      campo_api: mapeamento.campo_api,
      campo_destino: mapeamento.campo_destino,
      tipo_dado: mapeamento.tipo_dado,
      obrigatorio: mapeamento.obrigatorio,
    });
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditandoId(null);
    setEditandoCampo({});
  };

  // Salvar edição
  const handleSaveEdit = async () => {
    if (!editandoId) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast({
          title: 'Erro de autenticação',
          description: 'Você precisa estar logado para editar mapeamentos.',
          variant: 'destructive',
        });
        return;
      }

      // Se mudou para um novo campo dyn_*, criar a coluna
      const campoDestinoNovo = editandoCampo.campo_destino || '';
      const mapeamentoOriginal = mapeamentos?.find(m => m.id === editandoId);
      
      if (campoDestinoNovo.startsWith(CAMPO_DINAMICO_PREFIX) && 
          campoDestinoNovo !== mapeamentoOriginal?.campo_destino) {
        const tipoColuna = TIPO_COLUNA_MAP[editandoCampo.tipo_dado || 'string'] || 'TEXT';
        
        const { data: resultadoColuna, error: erroColuna } = await supabase.rpc(
          'vv_b_add_dynamic_column',
          { 
            p_column_name: campoDestinoNovo, 
            p_column_type: tipoColuna 
          }
        );

        if (erroColuna) {
          throw new Error(`Erro ao criar coluna na tabela: ${erroColuna.message}`);
        }
      }

      const { error } = await supabase
        .from('vv_b_api_mapeamento_campos')
        .update({
          campo_api: editandoCampo.campo_api,
          campo_destino: editandoCampo.campo_destino,
          tipo_dado: editandoCampo.tipo_dado,
          obrigatorio: editandoCampo.obrigatorio,
        })
        .eq('id', editandoId);

      if (error) throw error;

      toast({ title: 'Mapeamento atualizado' });
      setEditandoId(null);
      setEditandoCampo({});
      queryClient.invalidateQueries({ queryKey: ['mapeamento-campos', integracaoId] });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSelectCampoDestino = (campoDestino: string) => {
    if (campoDestino === '__novo_campo__') {
      setModoCampoDinamico(true);
      setNovoCampoDinamico('');
      setNovoCampo({
        ...novoCampo,
        campo_destino: '',
        tipo_dado: 'string'
      });
      return;
    }
    setModoCampoDinamico(false);
    const destino = CAMPOS_DESTINO_PADRAO.find(c => c.value === campoDestino);
    setNovoCampo({
      ...novoCampo,
      campo_destino: campoDestino,
      tipo_dado: destino?.tipo_sugerido || 'string'
    });
  };

  const handleConfirmarCampoDinamico = () => {
    if (!novoCampoDinamico.trim()) return;
    // Sanitizar: apenas letras, números e underscore
    const nomeCampo = novoCampoDinamico.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setNovoCampo({
      ...novoCampo,
      campo_destino: `${CAMPO_DINAMICO_PREFIX}${nomeCampo}`,
    });
    setModoCampoDinamico(false);
  };

  // Query para buscar colunas dinâmicas já criadas na tabela
  const { data: colunasDinamicas } = useQuery({
    queryKey: ['colunas-dinamicas'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('vv_b_list_dynamic_columns');
      if (error) throw error;
      return (data || []) as { column_name: string; data_type: string }[];
    },
  });

  // Campos dinâmicos já mapeados ou existentes na tabela
  const camposDinamicosMapeados = useMemo(() => {
    const doColunas = (colunasDinamicas || []).map(c => ({
      value: c.column_name,
      label: c.column_name.replace(/^dyn_/, '').replace(/_/g, ' '),
      tipo: c.data_type,
    }));
    
    // Adicionar também os mapeados que talvez ainda não apareçam na lista de colunas
    const dosMapeamentos = (mapeamentos || [])
      .filter(m => m.campo_destino.startsWith(CAMPO_DINAMICO_PREFIX))
      .filter(m => !doColunas.some(c => c.value === m.campo_destino))
      .map(m => ({
        value: m.campo_destino,
        label: m.campo_destino.replace(CAMPO_DINAMICO_PREFIX, '').replace(/_/g, ' '),
        tipo: 'text',
      }));
    
    return [...doColunas, ...dosMapeamentos];
  }, [mapeamentos, colunasDinamicas]);

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
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleTestarMapeamento} 
              disabled={testando}
              className="gap-2"
            >
              {testando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Testar API
            </Button>

            {onRefreshCampos && (
              <Button variant="outline" size="sm" onClick={onRefreshCampos} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Atualizar Campos
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview dos dados da API */}
        {showPreview && previewData && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-green-50 dark:bg-green-950 px-4 py-2 flex items-center justify-between border-b border-green-200 dark:border-green-800">
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Preview: {previewData.length} registros retornados da API (dados brutos)
              </span>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-64 overflow-auto">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {previewColumns.map((key) => (
                      <TableHead key={key} className="font-mono text-xs min-w-[160px]">
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                      {previewColumns.map((key) => {
                        const value = (row as any)?.[key];
                        const text = value === null || value === undefined ? '' : String(value);

                        return (
                          <TableCell
                            key={key}
                            className="font-mono text-xs max-w-[240px] truncate"
                            title={text}
                          >
                            {value === null ? (
                              <span className="text-muted-foreground">null</span>
                            ) : value === undefined ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              text.substring(0, 80)
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Alerta de campos obrigatórios faltando */}
        {camposObrigatoriosFaltando.length > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-300 dark:border-amber-700 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Campos obrigatórios faltando
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Configure os mapeamentos para: {camposObrigatoriosFaltando.map(c => c.label).join(', ')}
              </p>
            </div>
          </div>
        )}

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
            <div className="md:col-span-1">
              <Label className="text-xs">Campo Destino</Label>
              {modoCampoDinamico ? (
                <div className="flex gap-1 mt-1">
                  <Input
                    value={novoCampoDinamico}
                    onChange={(e) => setNovoCampoDinamico(e.target.value)}
                    placeholder="nome_do_campo"
                    className="font-mono text-xs"
                    onBlur={handleConfirmarCampoDinamico}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmarCampoDinamico()}
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setModoCampoDinamico(false);
                      setNovoCampo({ ...novoCampo, campo_destino: 'numero_nota' });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Select
                  value={novoCampo.campo_destino}
                  onValueChange={handleSelectCampoDestino}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={novoCampo.campo_destino.startsWith(CAMPO_DINAMICO_PREFIX) 
                      ? novoCampo.campo_destino.replace(CAMPO_DINAMICO_PREFIX, '📦 ')
                      : undefined
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__novo_campo__">
                      <span className="text-primary font-medium">+ Criar nova coluna (dados_extras)</span>
                    </SelectItem>
                    {camposDinamicosMapeados.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="font-mono text-xs">📦 {c.label}</span>
                      </SelectItem>
                    ))}
                    {CAMPOS_DESTINO_PADRAO.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label} {c.obrigatorio && <span className="text-destructive">*</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {novoCampo.campo_destino.startsWith(CAMPO_DINAMICO_PREFIX) && !modoCampoDinamico && (
                <p className="text-xs text-muted-foreground mt-1">
                  → dados_extras.{novoCampo.campo_destino.replace(CAMPO_DINAMICO_PREFIX, '')}
                </p>
              )}
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
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mapeamentos.map((m) => {
                const isEditing = editandoId === m.id;
                
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    
                    {/* Campo API */}
                    <TableCell className="font-mono text-sm max-w-[200px]">
                      {isEditing ? (
                        <Input
                          value={editandoCampo.campo_api || ''}
                          onChange={(e) => setEditandoCampo({ ...editandoCampo, campo_api: e.target.value })}
                          className="h-8 font-mono text-xs"
                        />
                      ) : (
                        <span className="truncate" title={m.campo_api}>{m.campo_api}</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    
                    {/* Campo Destino */}
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editandoCampo.campo_destino || ''}
                          onValueChange={(v) => setEditandoCampo({ ...editandoCampo, campo_destino: v })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {camposDinamicosMapeados.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                <span className="font-mono text-xs">📦 {c.label}</span>
                              </SelectItem>
                            ))}
                            {CAMPOS_DESTINO_PADRAO.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : m.campo_destino.startsWith(CAMPO_DINAMICO_PREFIX) ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          📦 {m.campo_destino.replace(CAMPO_DINAMICO_PREFIX, '')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {CAMPOS_DESTINO_PADRAO.find(c => c.value === m.campo_destino)?.label || m.campo_destino}
                        </Badge>
                      )}
                    </TableCell>
                    
                    {/* Tipo */}
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editandoCampo.tipo_dado || 'string'}
                          onValueChange={(v) => setEditandoCampo({ ...editandoCampo, tipo_dado: v })}
                        >
                          <SelectTrigger className="h-8">
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
                      ) : (
                        <Badge variant="secondary">
                          {TIPOS_DADO.find(t => t.value === m.tipo_dado)?.label || m.tipo_dado}
                        </Badge>
                      )}
                    </TableCell>
                    
                    {/* Obrigatório */}
                    <TableCell className="text-center">
                      <Switch
                        checked={isEditing ? editandoCampo.obrigatorio : m.obrigatorio}
                        onCheckedChange={(v) => {
                          if (isEditing) {
                            setEditandoCampo({ ...editandoCampo, obrigatorio: v });
                          } else {
                            handleUpdateCampo(m.id, 'obrigatorio', v);
                          }
                        }}
                      />
                    </TableCell>
                    
                    {/* Ações */}
                    <TableCell>
                      <div className="flex gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSaveEdit}
                              title="Salvar"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              title="Cancelar"
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(m)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCampo(m.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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
