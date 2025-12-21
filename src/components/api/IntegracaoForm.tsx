import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Edit2, Globe, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface Integracao {
  id: string;
  nome: string;
  tipo: string;
  endpoint_base: string | null;
  modo_demo: boolean;
  campos_chave: string[];
  headers_autenticacao: Record<string, string>;
  ativo: boolean;
  json_path: string | null;
  modelo_boleto_id: string | null;
}

interface IntegracaoFormProps {
  integracao?: Integracao | null;
  onSave: () => void;
}

const TIPOS_API = [
  { value: 'SAP', label: 'SAP' },
  { value: 'ERP', label: 'ERP Genérico' },
  { value: 'REST', label: 'API REST' },
  { value: 'SOAP', label: 'API SOAP' },
  { value: 'CUSTOM', label: 'Personalizado' },
];

export function IntegracaoForm({ integracao, onSave }: IntegracaoFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'SAP',
    endpoint_base: '',
    json_path: 'd.results',
    campos_chave: 'numero_nota, cliente_id, numero_cobranca',
    modo_demo: true,
    ativo: true,
  });

  useEffect(() => {
    if (integracao) {
      setFormData({
        nome: integracao.nome,
        tipo: integracao.tipo,
        endpoint_base: integracao.endpoint_base || '',
        json_path: integracao.json_path || 'd.results',
        campos_chave: integracao.campos_chave?.join(', ') || '',
        modo_demo: integracao.modo_demo,
        ativo: integracao.ativo,
      });
    }
  }, [integracao]);

  const handleSubmit = async () => {
    if (!formData.nome) {
      toast({
        title: 'Erro',
        description: 'Nome da integração é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nome: formData.nome,
        tipo: formData.tipo,
        endpoint_base: formData.endpoint_base || null,
        json_path: formData.json_path,
        campos_chave: formData.campos_chave.split(',').map(c => c.trim()).filter(Boolean),
        modo_demo: formData.modo_demo,
        ativo: formData.ativo,
      };

      if (integracao) {
        const { error } = await supabase
          .from('vv_b_api_integracoes')
          .update(payload)
          .eq('id', integracao.id);

        if (error) throw error;
        toast({ title: 'Integração atualizada com sucesso' });
      } else {
        const { error } = await supabase
          .from('vv_b_api_integracoes')
          .insert(payload);

        if (error) throw error;
        toast({ title: 'Integração criada com sucesso' });
      }

      queryClient.invalidateQueries({ queryKey: ['api-integracoes'] });
      setIsOpen(false);
      onSave();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!integracao) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('vv_b_api_integracoes')
        .update({ deleted: 'S', data_delete: new Date().toISOString() })
        .eq('id', integracao.id);

      if (error) throw error;

      toast({ title: 'Integração removida' });
      queryClient.invalidateQueries({ queryKey: ['api-integracoes'] });
      setIsOpen(false);
      onSave();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {integracao ? (
          <Button variant="ghost" size="sm">
            <Edit2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Integração
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {integracao ? 'Editar Integração' : 'Nova Integração'}
          </DialogTitle>
          <DialogDescription>
            Configure a conexão com a API externa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome da Integração *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: SAP Produção"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipo de API</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData({ ...formData, tipo: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_API.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Endpoint Base</Label>
            <Input
              value={formData.endpoint_base}
              onChange={(e) => setFormData({ ...formData, endpoint_base: e.target.value })}
              placeholder="https://api.exemplo.com/boletos"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Caminho JSON da Resposta</Label>
            <Input
              value={formData.json_path}
              onChange={(e) => setFormData({ ...formData, json_path: e.target.value })}
              placeholder="d.results"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Caminho para o array de dados na resposta (ex: d.results, data.items, results)
            </p>
          </div>

          <div>
            <Label>Campos Chave (para duplicatas)</Label>
            <Input
              value={formData.campos_chave}
              onChange={(e) => setFormData({ ...formData, campos_chave: e.target.value })}
              placeholder="numero_nota, cliente_id, numero_cobranca"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Campos separados por vírgula que compõem a chave única
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Modo Demonstração</Label>
              <p className="text-xs text-muted-foreground">
                Usar dados fictícios para testes
              </p>
            </div>
            <Switch
              checked={formData.modo_demo}
              onCheckedChange={(v) => setFormData({ ...formData, modo_demo: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Integração Ativa</Label>
              <p className="text-xs text-muted-foreground">
                Habilitar esta integração
              </p>
            </div>
            <Switch
              checked={formData.ativo}
              onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {integracao && (
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
