import { useState, useEffect, useRef } from 'react';
import { Palette, Plus, Copy, Edit, Trash2, FileText, Building2, Upload, Share2, Eye, Save, Loader2, Layers, RefreshCw, FileCheck, AlertCircle, LogIn } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { BANCOS_SUPORTADOS } from '@/data/bancos';
import { TIPOS_IMPRESSAO, TipoImpressao } from '@/types/boleto';
import { useToast } from '@/hooks/use-toast';
import { ImportarPDFModal, ImportarPDFResult } from '@/components/modelos/ImportarPDFModal';
import { EditorLayoutBoleto, ElementoLayout } from '@/components/modelos/EditorLayoutBoleto';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBancos } from '@/hooks/useBancos';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { uploadPdfToStorage, getPdfUrl } from '@/lib/pdfStorage';
import { useNavigate } from 'react-router-dom';

interface CampoMapeado {
  id: string | number;
  nome: string;
  variavel: string;
  posicao_x: number;
  posicao_y: number;
  largura: number;
  altura: number;
}

interface ModeloBoleto {
  id: string;
  nome_modelo: string;
  banco_id: string | null;
  bancos_compativeis: string[];
  tipo_layout: TipoImpressao;
  padrao: boolean;
  campos_mapeados: CampoMapeado[];
  texto_instrucoes: string;
  template_pdf_id: string | null;
  pdf_storage_path: string | null;
  pdf_storage_bucket: string | null;
  created_at: string;
  updated_at: string;
}

const VARIAVEIS_DISPONIVEIS = [
  { variavel: '{{cliente_razao_social}}', descricao: 'Razão social do cliente' },
  { variavel: '{{cliente_cnpj}}', descricao: 'CNPJ do cliente' },
  { variavel: '{{cliente_endereco}}', descricao: 'Endereço do cliente' },
  { variavel: '{{valor_titulo}}', descricao: 'Valor do título' },
  { variavel: '{{data_vencimento}}', descricao: 'Data de vencimento' },
  { variavel: '{{nosso_numero}}', descricao: 'Nosso número' },
  { variavel: '{{numero_documento}}', descricao: 'Número do documento' },
  { variavel: '{{taxa_juros}}', descricao: 'Taxa de juros configurada' },
  { variavel: '{{multa}}', descricao: 'Percentual de multa' },
];

export default function Modelos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: bancos } = useBancos();
  const { user } = useAuth();
  const { canEdit, isLoading: isLoadingRole, canBootstrapAdmin, bootstrapAdmin } = useUserRole();

  // Estado do formulário
  const [modeloEditando, setModeloEditando] = useState<ModeloBoleto | null>(null);
  const [modeloDeletando, setModeloDeletando] = useState<ModeloBoleto | null>(null);
  const [modeloVisualizando, setModeloVisualizando] = useState<ModeloBoleto | null>(null);
  const [criarNovo, setCriarNovo] = useState(false);
  const [importarPDFOpen, setImportarPDFOpen] = useState(false);
  const [editorLayoutOpen, setEditorLayoutOpen] = useState(false);
  const [modeloParaEditor, setModeloParaEditor] = useState<ModeloBoleto | null>(null);
  const [pdfUrlParaEditor, setPdfUrlParaEditor] = useState<string | null>(null);
  const [iniciarEditorVazio, setIniciarEditorVazio] = useState(false);
  const [modeloParaReanexar, setModeloParaReanexar] = useState<ModeloBoleto | null>(null);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const reanexarInputRef = useRef<HTMLInputElement>(null);

  // Form state para edição/criação
  const [formNome, setFormNome] = useState('');
  const [formBancoId, setFormBancoId] = useState<string>('');
  const [formTipoLayout, setFormTipoLayout] = useState<string>('CNAB_400');
  const [formTextoInstrucoes, setFormTextoInstrucoes] = useState('');

  // Carregar modelos do banco de dados
  const { data: modelos, isLoading } = useQuery({
    queryKey: ['modelos-boleto'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vv_b_modelos_boleto')
        .select('*')
        .is('deleted', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((m: any) => ({
        id: m.id,
        nome_modelo: m.nome_modelo,
        banco_id: m.banco_id,
        bancos_compativeis: m.bancos_compativeis || [],
        tipo_layout: m.tipo_layout as TipoImpressao,
        padrao: m.padrao || false,
        campos_mapeados: (m.campos_mapeados || []) as CampoMapeado[],
        texto_instrucoes: m.texto_instrucoes || '',
        template_pdf_id: m.template_pdf_id,
        pdf_storage_path: m.pdf_storage_path || null,
        pdf_storage_bucket: m.pdf_storage_bucket || null,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })) as ModeloBoleto[];
    }
  });

  // Mutation para criar modelo
  const createModelo = useMutation({
    mutationFn: async (modelo: Partial<ModeloBoleto> & { pdfFile?: File }) => {
      const modeloId = crypto.randomUUID();
      let pdfPath: string | null = null;

      // Upload do PDF para Storage se existir
      if (modelo.pdfFile) {
        console.log('[Modelos] Uploading PDF to storage...', { fileSize: modelo.pdfFile.size });
        const uploadResult = await uploadPdfToStorage(modelo.pdfFile, modeloId);
        if (!uploadResult.success) {
          throw new Error(`Erro ao fazer upload do PDF: ${uploadResult.error}`);
        }
        pdfPath = uploadResult.path!;
        console.log('[Modelos] PDF uploaded successfully:', pdfPath);
      }

      const payload = {
        id: modeloId,
        nome_modelo: modelo.nome_modelo!,
        banco_id: modelo.banco_id || null,
        bancos_compativeis: modelo.bancos_compativeis || [],
        tipo_layout: modelo.tipo_layout || 'CNAB_400',
        texto_instrucoes: modelo.texto_instrucoes || '',
        campos_mapeados: JSON.parse(JSON.stringify(modelo.campos_mapeados || [])),
        template_pdf_id: modelo.template_pdf_id ?? null,
        pdf_storage_path: pdfPath,
        pdf_storage_bucket: pdfPath ? 'boleto_templates' : null,
        padrao: false,
      };
      
      const { data, error } = await supabase
        .from('vv_b_modelos_boleto')
        .insert(payload)
        .select()
        .single();
      
      if (error) {
        console.error('[Modelos] Create error:', error);
        throw new Error(`Erro ao salvar modelo: ${error.message}`);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-boleto'] });
      toast({ title: 'Modelo criado', description: 'O modelo foi salvo com sucesso.' });
      setCriarNovo(false);
      resetForm();
      setPendingPdfFile(null);
    },
    onError: (error: any) => {
      console.error('[Modelos] Create mutation error:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });

  // Mutation para atualizar modelo
  const updateModelo = useMutation({
    mutationFn: async ({ id, pdfFile, ...modelo }: { id: string; pdfFile?: File } & Partial<ModeloBoleto>) => {
      const payload: Record<string, any> = {};
      let pdfPath: string | null = null;

      // Upload do novo PDF se existir
      if (pdfFile) {
        console.log('[Modelos] Uploading new PDF to storage...', { fileSize: pdfFile.size, modeloId: id });
        const uploadResult = await uploadPdfToStorage(pdfFile, id);
        if (!uploadResult.success) {
          throw new Error(`Erro ao fazer upload do PDF: ${uploadResult.error}`);
        }
        pdfPath = uploadResult.path!;
        payload.pdf_storage_path = pdfPath;
        payload.pdf_storage_bucket = 'boleto_templates';
        console.log('[Modelos] New PDF uploaded successfully:', pdfPath);
      }

      if (modelo.nome_modelo !== undefined) payload.nome_modelo = modelo.nome_modelo;
      if (modelo.banco_id !== undefined) payload.banco_id = modelo.banco_id || null;
      if (modelo.bancos_compativeis !== undefined) payload.bancos_compativeis = modelo.bancos_compativeis || [];
      if (modelo.tipo_layout !== undefined) payload.tipo_layout = modelo.tipo_layout;
      if (modelo.texto_instrucoes !== undefined) payload.texto_instrucoes = modelo.texto_instrucoes;
      if (modelo.campos_mapeados !== undefined) {
        payload.campos_mapeados = JSON.parse(JSON.stringify(modelo.campos_mapeados || []));
      }
      if (modelo.template_pdf_id !== undefined) payload.template_pdf_id = modelo.template_pdf_id;
      
      const { data, error } = await supabase
        .from('vv_b_modelos_boleto')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('[Modelos] Update error:', error);
        throw new Error(`Erro ao atualizar modelo: ${error.message}`);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-boleto'] });
      toast({ title: 'Modelo atualizado', description: 'As alterações foram salvas.' });
      setModeloEditando(null);
      resetForm();
    },
    onError: (error: any) => {
      console.error('[Modelos] Update mutation error:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });

  // Mutation para deletar modelo
  const deleteModelo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vv_b_modelos_boleto')
        .update({ 
          deleted: 'S', 
          data_delete: new Date().toISOString(),
          usuario_delete_id: user?.id 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-boleto'] });
      toast({ title: 'Modelo excluído' });
      setModeloDeletando(null);
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });

  // Reset form
  const resetForm = () => {
    setFormNome('');
    setFormBancoId('');
    setFormTipoLayout('CNAB_400');
    setFormTextoInstrucoes('');
  };

  // Ao abrir edição, preencher form
  useEffect(() => {
    if (modeloEditando) {
      setFormNome(modeloEditando.nome_modelo);
      setFormBancoId(modeloEditando.banco_id || '');
      setFormTipoLayout(modeloEditando.tipo_layout);
      setFormTextoInstrucoes(modeloEditando.texto_instrucoes);
    }
  }, [modeloEditando]);

  // Ao abrir criar novo, resetar
  useEffect(() => {
    if (criarNovo) {
      resetForm();
    }
  }, [criarNovo]);

  const getBancoNome = (bancoId: string | null) => {
    if (!bancoId) return 'Banco não selecionado';
    const banco = bancos?.find((b) => b.id === bancoId) || BANCOS_SUPORTADOS.find((b) => b.id === bancoId);
    return banco?.nome_banco || 'Banco não encontrado';
  };

  const handleSalvar = () => {
    if (!formNome.trim()) {
      toast({ title: 'Erro', description: 'Nome do modelo é obrigatório', variant: 'destructive' });
      return;
    }

    if (!canEdit) {
      toast({ title: 'Sem permissão', description: 'Você precisa de permissão de admin ou operador para salvar modelos.', variant: 'destructive' });
      return;
    }

    const payload = {
      nome_modelo: formNome,
      banco_id: formBancoId || null,
      bancos_compativeis: formBancoId ? [formBancoId] : [],
      tipo_layout: formTipoLayout as TipoImpressao,
      texto_instrucoes: formTextoInstrucoes,
      campos_mapeados: modeloEditando?.campos_mapeados || [],
    };

    if (modeloEditando) {
      updateModelo.mutate({ id: modeloEditando.id, ...payload });
    } else {
      createModelo.mutate(payload);
    }
  };

  const handleDuplicar = async (modelo: ModeloBoleto) => {
    if (!canEdit) {
      toast({ title: 'Sem permissão', description: 'Você precisa de permissão de admin ou operador.', variant: 'destructive' });
      return;
    }
    await createModelo.mutateAsync({
      ...modelo,
      nome_modelo: `${modelo.nome_modelo} (Cópia)`,
      padrao: false,
    });
  };

  const handleDeletar = () => {
    if (!canEdit) {
      toast({ title: 'Sem permissão', description: 'Você precisa de permissão de admin ou operador.', variant: 'destructive' });
      return;
    }
    if (modeloDeletando) {
      deleteModelo.mutate(modeloDeletando.id);
    }
  };

  // Função para reanexar PDF a um modelo existente
  const handleReanexarPDF = (modelo: ModeloBoleto) => {
    if (!canEdit) {
      toast({ title: 'Sem permissão', description: 'Você precisa de permissão de admin ou operador.', variant: 'destructive' });
      return;
    }
    setModeloParaReanexar(modelo);
    setTimeout(() => {
      reanexarInputRef.current?.click();
    }, 100);
  };

  const handleReanexarFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !modeloParaReanexar) {
      setModeloParaReanexar(null);
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo PDF.',
        variant: 'destructive',
      });
      setModeloParaReanexar(null);
      event.target.value = '';
      return;
    }

    // Atualizar o modelo existente com o novo PDF via Storage
    updateModelo.mutate({
      id: modeloParaReanexar.id,
      pdfFile: file,
    }, {
      onSuccess: () => {
        toast({
          title: 'PDF reanexado',
          description: `O PDF foi vinculado ao modelo "${modeloParaReanexar.nome_modelo}".`,
        });
      },
      onError: (error) => {
        toast({
          title: 'Erro',
          description: error.message || 'Não foi possível reanexar o PDF.',
          variant: 'destructive',
        });
      },
      onSettled: () => {
        setModeloParaReanexar(null);
      },
    });

    event.target.value = '';
  };

  const handleImportarPDF = async (result: ImportarPDFResult) => {
    // Guarda o arquivo para upload quando salvar
    setPendingPdfFile(result.file);
    
    // Cria modelo temporário e abre o editor de layout
    const novoModelo: ModeloBoleto = {
      id: `temp_${Date.now()}`,
      nome_modelo: result.nomeModelo,
      banco_id: result.bancosCompativeis[0] || null,
      bancos_compativeis: result.bancosCompativeis,
      tipo_layout: 'CNAB_400',
      texto_instrucoes: '',
      padrao: false,
      campos_mapeados: [],
      template_pdf_id: null,
      pdf_storage_path: null,
      pdf_storage_bucket: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setPdfUrlParaEditor(result.previewUrl);
    setIniciarEditorVazio(true);
    setModeloParaEditor(novoModelo);
    setEditorLayoutOpen(true);
  };

  const handleAbrirEditor = async (modelo: ModeloBoleto) => {
    setModeloParaEditor(modelo);
    setIniciarEditorVazio(false);
    setPendingPdfFile(null);
    
    // Carregar URL do PDF do Storage
    if (modelo.pdf_storage_path) {
      console.log('[Modelos] Loading PDF from storage:', modelo.pdf_storage_path);
      const url = await getPdfUrl(modelo.pdf_storage_path);
      setPdfUrlParaEditor(url);
    } else {
      setPdfUrlParaEditor(null);
    }
    
    setEditorLayoutOpen(true);
  };

  const handleSalvarLayout = (elementos: ElementoLayout[]) => {
    if (!modeloParaEditor) return;

    if (!canEdit) {
      toast({ title: 'Sem permissão', description: 'Você precisa de permissão de admin ou operador.', variant: 'destructive' });
      return;
    }

    const camposMapeados = elementos.map((el) => ({
      id: el.id,
      nome: el.nome,
      variavel: el.variavel || '',
      posicao_x: el.x,
      posicao_y: el.y,
      largura: el.largura,
      altura: el.altura,
    }));

    // Se é um modelo novo (temp_), cria
    if (modeloParaEditor.id.startsWith('temp_')) {
      createModelo.mutate({
        nome_modelo: modeloParaEditor.nome_modelo,
        banco_id: modeloParaEditor.banco_id,
        bancos_compativeis: modeloParaEditor.bancos_compativeis,
        tipo_layout: modeloParaEditor.tipo_layout,
        texto_instrucoes: modeloParaEditor.texto_instrucoes,
        campos_mapeados: camposMapeados,
        template_pdf_id: modeloParaEditor.template_pdf_id,
        pdfFile: pendingPdfFile || undefined,
      });
    } else {
      // Atualiza modelo existente
      updateModelo.mutate({
        id: modeloParaEditor.id,
        campos_mapeados: camposMapeados,
      });
    }
    
    setEditorLayoutOpen(false);
    setModeloParaEditor(null);
    setPdfUrlParaEditor(null);
    setPendingPdfFile(null);
  };

  const isFormDialogOpen = !!modeloEditando || criarNovo;
  const isSaving = createModelo.isPending || updateModelo.isPending;

  // Mostrar aviso para primeiro admin
  const showBootstrapAdmin = canBootstrapAdmin && user;

  return (
    <MainLayout>
      {/* Input invisível para reanexar PDF */}
      <input
        ref={reanexarInputRef}
        type="file"
        accept=".pdf"
        onChange={handleReanexarFileSelect}
        className="hidden"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Modelos de Layout</h1>
            <p className="text-muted-foreground">
              Configure os modelos de layout para impressão de boletos
            </p>
          </div>
          <div className="flex gap-2">
            {!user ? (
              <Button onClick={() => navigate('/auth')}>
                <LogIn className="h-4 w-4 mr-2" />
                Fazer Login
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setImportarPDFOpen(true)}
                  disabled={!canEdit}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar PDF Modelo
                </Button>
                <Button 
                  onClick={() => setCriarNovo(true)}
                  disabled={!canEdit}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Modelo
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Aviso de bootstrap admin */}
        {showBootstrapAdmin && (
          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm text-amber-800 dark:text-amber-200">
                    Você é o primeiro usuário do sistema
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Clique no botão abaixo para se tornar administrador e poder criar/editar modelos.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => bootstrapAdmin.mutate()}
                    disabled={bootstrapAdmin.isPending}
                  >
                    {bootstrapAdmin.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Tornar-me Administrador
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aviso para usuário sem permissão */}
        {user && !canEdit && !isLoadingRole && !canBootstrapAdmin && (
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-blue-800 dark:text-blue-200">Modo Visualização</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Você pode visualizar os modelos, mas precisa de permissão de admin ou operador para criar/editar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dica sobre importação de PDF */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Upload className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Importe um PDF de boleto existente</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Faça upload de um boleto PDF para copiar o layout exato. 
                  O mesmo modelo pode ser compartilhado entre vários bancos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid de Modelos */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modelos?.map((modelo) => (
              <Card key={modelo.id} className="hover:shadow-card-hover transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {modelo.pdf_storage_path ? (
                          <FileCheck className="h-5 w-5 text-primary" />
                        ) : modelo.template_pdf_id ? (
                          <FileText className="h-5 w-5 text-primary" />
                        ) : (
                          <Palette className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{modelo.nome_modelo}</CardTitle>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {modelo.padrao && (
                            <Badge variant="secondary">Padrão</Badge>
                          )}
                          {modelo.pdf_storage_path && (
                            <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                              <FileCheck className="h-3 w-3 mr-1" />
                              PDF
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    {modelo.bancos_compativeis && modelo.bancos_compativeis.length > 1 ? (
                      <div className="flex items-start gap-2">
                        <Share2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-muted-foreground">Compartilhado:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {modelo.bancos_compativeis.map(bancoId => {
                              const banco = bancos?.find(b => b.id === bancoId) || BANCOS_SUPORTADOS.find(b => b.id === bancoId);
                              return banco ? (
                                <Badge key={bancoId} variant="outline" className="text-xs">
                                  {banco.codigo_banco}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{getBancoNome(modelo.banco_id)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{TIPOS_IMPRESSAO[modelo.tipo_layout]?.label || modelo.tipo_layout}</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {modelo.campos_mapeados?.length || 0} campo(s) mapeado(s)
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setModeloVisualizando(modelo)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAbrirEditor(modelo)}
                    >
                      <Layers className="h-4 w-4 mr-1" />
                      Layout
                    </Button>
                    {canEdit && (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReanexarPDF(modelo)}
                                disabled={updateModelo.isPending && modeloParaReanexar?.id === modelo.id}
                              >
                                {updateModelo.isPending && modeloParaReanexar?.id === modelo.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reanexar PDF ao modelo</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDuplicar(modelo)}
                                disabled={createModelo.isPending}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicar modelo</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setModeloDeletando(modelo)}
                                disabled={modelo.padrao}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {modelo.padrao ? 'Modelo padrão não pode ser excluído' : 'Excluir modelo'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!modelos || modelos.length === 0) && (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum modelo cadastrado.</p>
                  {canEdit && (
                    <Button className="mt-4" onClick={() => setCriarNovo(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Modelo
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Modal de Edição/Criação */}
        <Dialog
          open={isFormDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setModeloEditando(null);
              setCriarNovo(false);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {modeloEditando ? 'Editar Modelo' : 'Novo Modelo de Layout'}
              </DialogTitle>
              <DialogDescription>
                Configure o modelo de layout para impressão de boletos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Informações básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome do Modelo *</Label>
                  <Input
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Modelo Padrão BB"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Banco</Label>
                  <Select value={formBancoId} onValueChange={setFormBancoId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {(bancos || BANCOS_SUPORTADOS).map((banco) => (
                        <SelectItem key={banco.id} value={banco.id}>
                          {banco.nome_banco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Layout</Label>
                  <Select value={formTipoLayout} onValueChange={setFormTipoLayout}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPOS_IMPRESSAO).map(([key, tipo]) => (
                        <SelectItem key={key} value={key}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Instruções */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label>Texto de Instruções</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>Use variáveis para inserir dados dinâmicos:</p>
                        <ul className="mt-1 space-y-1">
                          {VARIAVEIS_DISPONIVEIS.slice(0, 5).map(v => (
                            <li key={v.variavel} className="text-xs">
                              <code>{v.variavel}</code> - {v.descricao}
                            </li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  value={formTextoInstrucoes}
                  onChange={(e) => setFormTextoInstrucoes(e.target.value)}
                  placeholder="Ex: Não receber após o vencimento. Juros de {{taxa_juros}}% ao mês."
                  className="mt-1 min-h-[100px]"
                />
              </div>

              {/* Dica sobre editor visual */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Layers className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium">Edição Visual de Layout</p>
                  <p className="text-xs mt-1">
                    Após salvar o modelo básico, clique em "Layout" no card do modelo para abrir o editor visual 
                    onde você pode posicionar campos arrastando e soltando.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => { 
                  setModeloEditando(null); 
                  setCriarNovo(false); 
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSalvar} disabled={isSaving || !canEdit}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={!!modeloDeletando} onOpenChange={() => setModeloDeletando(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o modelo "{modeloDeletando?.nome_modelo}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeletar}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Importar PDF */}
        <ImportarPDFModal
          open={importarPDFOpen}
          onOpenChange={setImportarPDFOpen}
          onImportar={handleImportarPDF}
        />

        {/* Editor de Layout Visual */}
        <EditorLayoutBoleto
          key={modeloParaEditor?.id || 'new'}
          open={editorLayoutOpen}
          onOpenChange={(open) => {
            setEditorLayoutOpen(open);
            if (!open) {
              setPdfUrlParaEditor(null);
              setIniciarEditorVazio(false);
              setPendingPdfFile(null);
            }
          }}
          elementos={modeloParaEditor?.campos_mapeados?.map(c => ({
            id: String(c.id),
            tipo: 'campo' as const,
            nome: c.nome,
            variavel: c.variavel,
            x: c.posicao_x,
            y: c.posicao_y,
            largura: c.largura,
            altura: c.altura,
            visivel: true,
          })) || []}
          onSave={handleSalvarLayout}
          nomeModelo={modeloParaEditor?.nome_modelo || 'Novo Modelo'}
          pdfBase64={pdfUrlParaEditor || undefined}
          iniciarVazio={iniciarEditorVazio}
        />

        {/* Modal de Visualização do Modelo */}
        <Dialog open={!!modeloVisualizando} onOpenChange={() => setModeloVisualizando(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Visualização: {modeloVisualizando?.nome_modelo}
              </DialogTitle>
              <DialogDescription>
                Preview do layout do modelo de boleto
              </DialogDescription>
            </DialogHeader>

            {modeloVisualizando && (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-6 p-4">
                  {/* Informações do modelo */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Tipo de Layout</Label>
                      <p className="font-medium">{TIPOS_IMPRESSAO[modeloVisualizando.tipo_layout]?.label || modeloVisualizando.tipo_layout}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Banco</Label>
                      <p className="font-medium">{getBancoNome(modeloVisualizando.banco_id)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Total de Campos</Label>
                      <p className="font-medium">{modeloVisualizando.campos_mapeados?.length || 0} campos</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">PDF Anexado</Label>
                      <p className="font-medium flex items-center gap-1">
                        {modeloVisualizando.pdf_storage_path ? (
                          <>
                            <FileCheck className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">Sim</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Não</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Preview visual do layout */}
                  <div className="border rounded-lg p-4 bg-white dark:bg-zinc-900 min-h-[400px] relative">
                    <div className="text-center text-sm text-muted-foreground mb-4">
                      Layout do Boleto (representação simplificada)
                    </div>
                    
                    <div className="space-y-2 font-mono text-xs">
                      <div className="border-b-2 border-black dark:border-white pb-2 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-8 bg-muted flex items-center justify-center text-[10px]">LOGO</div>
                          <div>
                            <div className="font-bold">{'{{banco_nome}}'}</div>
                            <div>{'{{banco_codigo}}'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">{'{{linha_digitavel}}'}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2 border-b">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Local de Pagamento</Label>
                          <div>{'{{local_pagamento}}'}</div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Vencimento</Label>
                          <div>{'{{data_vencimento}}'}</div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Agência/Código</Label>
                          <div>{'{{agencia_codigo}}'}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 py-2 border-b">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Beneficiário</Label>
                          <div>{'{{beneficiario_nome}}'}</div>
                          <div>{'{{beneficiario_cnpj}}'}</div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Nosso Número</Label>
                          <div>{'{{nosso_numero}}'}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2 border-b">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Nº Documento</Label>
                          <div>{'{{numero_documento}}'}</div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Valor Documento</Label>
                          <div>{'{{valor_documento}}'}</div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Valor Cobrado</Label>
                          <div>{'{{valor_cobrado}}'}</div>
                        </div>
                      </div>

                      <div className="py-2 border-b">
                        <Label className="text-[10px] text-muted-foreground">Pagador</Label>
                        <div>{'{{pagador_nome}}'}</div>
                        <div>{'{{pagador_endereco}}'}</div>
                        <div>{'{{pagador_cnpj}}'}</div>
                      </div>

                      <div className="py-4 flex justify-center">
                        <div className="h-12 w-full max-w-[400px] bg-black dark:bg-white flex items-center justify-center">
                          <span className="text-white dark:text-black text-[10px]">CÓDIGO DE BARRAS</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lista de campos mapeados */}
                  {modeloVisualizando.campos_mapeados && modeloVisualizando.campos_mapeados.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Campos Mapeados</Label>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {modeloVisualizando.campos_mapeados.map((campo, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {campo.nome || campo.variavel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Instruções */}
                  {modeloVisualizando.texto_instrucoes && (
                    <div>
                      <Label className="text-sm font-medium">Texto de Instruções</Label>
                      <div className="mt-1 p-3 bg-muted rounded text-sm">
                        {modeloVisualizando.texto_instrucoes}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setModeloVisualizando(null)}>
                Fechar
              </Button>
              {canEdit && (
                <Button onClick={() => {
                  setModeloVisualizando(null);
                  setModeloEditando(modeloVisualizando);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Modelo
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
