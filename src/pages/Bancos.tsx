import { useState } from 'react';
import { Building2, Settings, Percent, Calendar, FileText, Loader2, HelpCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Banco, ConfiguracaoBanco, TIPOS_IMPRESSAO } from '@/types/boleto';
import { useToast } from '@/hooks/use-toast';
import { useBancos } from '@/hooks/useBancos';
import { useConfiguracoesBanco } from '@/hooks/useConfiguracoesBanco';
import { usePermissoes } from '@/hooks/usePermissoes';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export default function Bancos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: bancos = [], isLoading: bancosLoading } = useBancos();
  const { data: configuracoes = [] } = useConfiguracoesBanco();
  const { hasPermission, isLoading: isLoadingPermissoes } = usePermissoes();
  
  const canEdit = hasPermission('bancos', 'editar');
  const canView = hasPermission('bancos', 'visualizar');
  
  const [bancoEditando, setBancoEditando] = useState<Banco | null>(null);
  const [configEditando, setConfigEditando] = useState<ConfiguracaoBanco | null>(null);
  const [formData, setFormData] = useState<Partial<ConfiguracaoBanco>>({});
  const [isSaving, setIsSaving] = useState(false);

  if (isLoadingPermissoes) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!canView) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
          <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para visualizar bancos.
          </p>
        </div>
      </MainLayout>
    );
  }

  const getConfiguracao = (bancoId: string) => {
    return configuracoes.find(c => c.banco_id === bancoId);
  };

  const handleSalvar = async () => {
    if (!canEdit || !bancoEditando) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para editar bancos.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const dadosSalvar = {
        ...formData,
        banco_id: bancoEditando.id,
        // Ensure numbers are numbers
        taxa_juros_mensal: Number(formData.taxa_juros_mensal),
        multa_percentual: Number(formData.multa_percentual),
        dias_carencia: Number(formData.dias_carencia),
      };

      if (configEditando?.id) {
        // Update
        const { error } = await supabase
          .from('vv_b_configuracoes_banco')
          .update(dadosSalvar)
          .eq('id', configEditando.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('vv_b_configuracoes_banco')
          .insert(dadosSalvar);
        if (error) throw error;
      }

      toast({
        title: 'Configurações salvas',
        description: 'As configurações do banco foram atualizadas com sucesso.',
      });
      
      queryClient.invalidateQueries({ queryKey: ['configuracoes_banco'] });
      setBancoEditando(null);
      setConfigEditando(null);
      setFormData({});
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditar = (banco: Banco) => {
    if (!canEdit) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para editar bancos.',
        variant: 'destructive',
      });
      return;
    }
    setBancoEditando(banco);
    const config = getConfiguracao(banco.id);
    setConfigEditando(config || null);
    setFormData(config || {
      banco_id: banco.id,
      taxa_juros_mensal: 1,
      multa_percentual: 2,
      dias_carencia: 0,
      carteira: '',
      agencia: '',
      conta: '',
      codigo_cedente: '',
      convenio: '',
      texto_instrucao_padrao: ''
    });
  };

  const updateField = (field: keyof ConfiguracaoBanco, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (bancosLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bancos</h1>
          <p className="text-muted-foreground">
            Configure os bancos emissores e suas respectivas taxas e instruções
          </p>
        </div>

        {/* Grid de Bancos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bancos.map((banco) => {
            const config = getConfiguracao(banco.id);
            return (
              <Card key={banco.id} className="hover:shadow-card-hover transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{banco.nome_banco}</CardTitle>
                        <p className="text-sm text-muted-foreground">Código: {banco.codigo_banco}</p>
                      </div>
                    </div>
                    <Badge variant={banco.ativo ? 'default' : 'secondary'}>
                      {banco.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Layout: {banco.tipo_layout_padrao ? TIPOS_IMPRESSAO[banco.tipo_layout_padrao]?.label || banco.tipo_layout_padrao : '-'}
                    </span>
                  </div>

                  {config && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Juros ao mês
                        </span>
                        <span className="font-medium">{config.taxa_juros_mensal}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Multa
                        </span>
                        <span className="font-medium">{config.multa_percentual}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Carência
                        </span>
                        <span className="font-medium">{config.dias_carencia} dia(s)</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleEditar(banco)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {bancos.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum banco cadastrado.
            </div>
          )}
        </div>

        {/* Modal de Edição */}
        <Dialog open={!!bancoEditando} onOpenChange={() => setBancoEditando(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar {bancoEditando?.nome_banco}
              </DialogTitle>
            </DialogHeader>

            {bancoEditando && (
              <div className="space-y-6">
                {/* Taxas */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    Taxas e Multas
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Configure as taxas de juros e multa que serão aplicadas aos
                            boletos vencidos deste banco.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Juros ao mês (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.taxa_juros_mensal || 0}
                        onChange={(e) => updateField('taxa_juros_mensal', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Multa (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.multa_percentual || 0}
                        onChange={(e) => updateField('multa_percentual', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Dias de carência</Label>
                      <Input
                        type="number"
                        value={formData.dias_carencia || 0}
                        onChange={(e) => updateField('dias_carencia', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Dados bancários */}
                <div className="space-y-4">
                  <h3 className="font-medium">Dados Bancários</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Carteira</Label>
                      <Input
                        value={formData.carteira || ''}
                        onChange={(e) => updateField('carteira', e.target.value)}
                        className="mt-1"
                        placeholder="Ex: 17"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Agência</Label>
                      <Input
                        value={formData.agencia || ''}
                        onChange={(e) => updateField('agencia', e.target.value)}
                        className="mt-1"
                        placeholder="Ex: 1234"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Conta</Label>
                      <Input
                        value={formData.conta || ''}
                        onChange={(e) => updateField('conta', e.target.value)}
                        className="mt-1"
                        placeholder="Ex: 56789-0"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Código do Cedente</Label>
                      <Input
                        value={formData.codigo_cedente || ''}
                        onChange={(e) => updateField('codigo_cedente', e.target.value)}
                        className="mt-1"
                        placeholder="Ex: 123456"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Convênio</Label>
                      <Input
                        value={formData.convenio || ''}
                        onChange={(e) => updateField('convenio', e.target.value)}
                        className="mt-1"
                        placeholder="Ex: 1234567"
                      />
                    </div>
                  </div>
                </div>

                {/* Instruções */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    Texto de Instrução Padrão
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Este texto aparecerá nas instruções do boleto. Você pode usar
                            variáveis como {'{{taxa_juros}}'} e {'{{multa}}'}.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Textarea
                    value={formData.texto_instrucao_padrao || ''}
                    onChange={(e) => updateField('texto_instrucao_padrao', e.target.value)}
                    placeholder="Ex: Não receber após 30 dias do vencimento. Cobrar juros de {{taxa_juros}}% ao mês..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setBancoEditando(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvar} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Configurações'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
