import { useState, useRef, useEffect } from 'react';
import { Building2, Settings, Percent, Calendar, FileText, Loader2, HelpCircle, Upload, ImageIcon } from 'lucide-react';
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

function BancoLogoImg({ logoPath, alt, className }: { logoPath?: string | null; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!logoPath) { setSrc(null); return; }
    if (logoPath.startsWith('http') || logoPath.startsWith('/')) { setSrc(logoPath); return; }
    supabase.storage.from('boleto_templates').createSignedUrl(logoPath, 3600).then(({ data }) => {
      if (data?.signedUrl) setSrc(data.signedUrl);
    });
  }, [logoPath]);
  if (!src) return null;
  return <img src={src} alt={alt} className={className} onError={(e) => { e.currentTarget.style.display = 'none'; }} />;
}

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
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Logo is already saved during upload (as storage path)
      // Only update if user manually typed a URL
      // (logoUrl at this point is a signed/preview URL, not what we store)

      const dadosSalvar = {
        ...formData,
        banco_id: bancoEditando.id,
        taxa_juros_mensal: Number(formData.taxa_juros_mensal),
        multa_percentual: Number(formData.multa_percentual),
        dias_carencia: Number(formData.dias_carencia),
      };

      if (configEditando?.id) {
        const { error } = await supabase
          .from('vv_b_configuracoes_banco')
          .update(dadosSalvar)
          .eq('id', configEditando.id);
        if (error) throw error;
      } else {
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
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
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

  const resolveLogoPreview = async (path: string): Promise<string> => {
    if (!path) return '';
    // If it's already a full URL (http/https or /), use as-is
    if (path.startsWith('http') || path.startsWith('/')) return path;
    // It's a storage path — generate signed URL
    const { data, error } = await supabase.storage
      .from('boleto_templates')
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return '';
    return data.signedUrl;
  };

  const handleEditar = async (banco: Banco) => {
    if (!canEdit) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para editar bancos.',
        variant: 'destructive',
      });
      return;
    }
    setBancoEditando(banco);
    // Resolve logo for preview
    const previewUrl = await resolveLogoPreview(banco.logo_url || '');
    setLogoUrl(previewUrl);
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

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bancoEditando) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `banco_${bancoEditando.codigo_banco}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('boleto_templates')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the storage path in DB (not public URL)
      const { error: dbError } = await supabase
        .from('vv_b_bancos')
        .update({ logo_url: filePath })
        .eq('id', bancoEditando.id);
      if (dbError) console.warn('Erro ao salvar path no banco:', dbError);

      // Generate signed URL for preview only
      const previewUrl = await resolveLogoPreview(filePath);
      setLogoUrl(previewUrl);
      toast({ title: 'Logo enviada', description: 'A logo foi carregada com sucesso.' });
    } catch (error) {
      console.error('Erro upload logo:', error);
      toast({ title: 'Erro no upload', description: 'Não foi possível enviar a logo.', variant: 'destructive' });
    }
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
                      <BancoLogoImg logoPath={banco.logo_url} alt={banco.nome_banco} className="h-10 w-10 object-contain rounded-lg border border-border p-0.5" />
                      {!banco.logo_url && (
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                      )}
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar {bancoEditando?.nome_banco}
              </DialogTitle>
            </DialogHeader>

            {bancoEditando && (
              <div className="space-y-6">
                {/* Logo do Banco */}
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Logo do Banco
                  </h3>
                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Logo" 
                        className="h-16 w-24 object-contain border border-border rounded-lg p-1"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="h-16 w-24 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex flex-col gap-2 flex-1">
                      <Input
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="URL da logo ou faça upload"
                        className="text-sm"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoFileChange}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                    </div>
                  </div>
                </div>

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
                        <TooltipContent className="max-w-sm text-left" side="right">
                          <p className="font-semibold mb-1">Variáveis disponíveis:</p>
                          <ul className="text-xs space-y-0.5 list-disc pl-3">
                            <li><code>{'{VALOR_MULTA}'}</code> — Multa em R$ (% × valor)</li>
                            <li><code>{'{VALOR_JUROS_DIARIO}'}</code> — Juros diário em R$</li>
                            <li><code>{'{PERCENTUAL_MULTA}'}</code> — Multa em %</li>
                            <li><code>{'{PERCENTUAL_JUROS}'}</code> — Juros mensal em %</li>
                            <li><code>{'{VALOR_DESCONTO}'}</code> — Desconto em R$</li>
                            <li><code>{'{DATAVENCIMENTODESCONTO}'}</code> — Data limite desconto</li>
                            <li><code>{'{VALOR_DOCUMENTO}'}</code> — Valor do título</li>
                          </ul>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Exemplo: APÓS O VENCIMENTO COBRAR MULTA DE {'{VALOR_MULTA}'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Textarea
                    value={formData.texto_instrucao_padrao || ''}
                    onChange={(e) => updateField('texto_instrucao_padrao', e.target.value)}
                    placeholder={"APÓS O VENCIMENTO COBRAR MULTA DE {VALOR_MULTA}\nCobrar juros de {VALOR_JUROS_DIARIO} de mora diária\nAté {DATAVENCIMENTODESCONTO} desconto de {VALOR_DESCONTO}"}
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
