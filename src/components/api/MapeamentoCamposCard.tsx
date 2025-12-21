import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, ArrowRight, GripVertical } from 'lucide-react';
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
}

const CAMPOS_DESTINO = [
  { value: 'numero_nota', label: 'Número da Nota' },
  { value: 'numero_cobranca', label: 'Número Cobrança' },
  { value: 'cliente_cnpj', label: 'CNPJ Cliente' },
  { value: 'valor', label: 'Valor' },
  { value: 'data_emissao', label: 'Data Emissão' },
  { value: 'data_vencimento', label: 'Data Vencimento' },
  { value: 'dados_extras', label: 'Dados Extras (JSON)' },
];

const TIPOS_DADO = [
  { value: 'string', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'boolean', label: 'Booleano' },
];

export function MapeamentoCamposCard({ integracaoId, integracaoNome }: MapeamentoCamposCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  const handleAddCampo = async () => {
    if (!novoCampo.campo_api) {
      toast({
        title: 'Erro',
        description: 'Campo da API é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('vv_b_api_mapeamento_campos')
        .insert({
          integracao_id: integracaoId,
          campo_api: novoCampo.campo_api,
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
      queryClient.invalidateQueries({ queryKey: ['mapeamento-campos', integracaoId] });
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar',
        description: error.message,
        variant: 'destructive',
      });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Mapeamento de Campos - {integracaoNome}
        </CardTitle>
        <CardDescription>
          Configure o de-para entre os campos da API e a tabela de destino.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Adicionar novo campo */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <Label className="font-medium">Adicionar Novo Campo</Label>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <Label className="text-xs">Campo da API</Label>
              <Input
                value={novoCampo.campo_api}
                onChange={(e) => setNovoCampo({ ...novoCampo, campo_api: e.target.value })}
                placeholder="d.results.PaymentDocument"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Campo Destino</Label>
              <Select
                value={novoCampo.campo_destino}
                onValueChange={(v) => setNovoCampo({ ...novoCampo, campo_destino: v })}
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
            <Button onClick={handleAddCampo} className="gap-2">
              <Plus className="h-4 w-4" />
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
                  <TableCell className="font-mono text-sm">{m.campo_api}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CAMPOS_DESTINO.find(c => c.value === m.campo_destino)?.label || m.campo_destino}
                    </Badge>
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
            Nenhum campo mapeado. Adicione campos acima para configurar o de-para.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
