import { useState, useEffect } from 'react';
import { Palette, Plus, Copy, Edit, Trash2, FileText, Building2, Upload, Share2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { DEFAULT_MODELOS } from '@/data/templates';
import { ModeloBoleto, TIPOS_IMPRESSAO, TipoImpressao, TemplatePDF } from '@/types/boleto';
import { useToast } from '@/hooks/use-toast';
import { ImportarPDFModal } from '@/components/modelos/ImportarPDFModal';
import { listarTemplates } from '@/lib/pdfTemplateGenerator';

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
  const [modelos, setModelos] = useState<ModeloBoleto[]>([]);

  // Carregar modelos do localStorage na inicialização
  useEffect(() => {
    const templatesImportados = listarTemplates();
    
    // Converter templates para ModeloBoleto
    const modelosImportados: ModeloBoleto[] = templatesImportados.map((template) => ({
      id: template.id,
      nome_modelo: template.nome,
      banco_id: template.bancos_compativeis[0] || '',
      bancos_compativeis: template.bancos_compativeis,
      tipo_layout: 'CNAB_400' as TipoImpressao,
      padrao: false,
      campos_mapeados: template.campos.map((campo) => ({
        id: campo.tipo,
        nome: campo.label,
        variavel: `{{${campo.tipo}}}`,
        posicao_x: campo.x,
        posicao_y: campo.y,
        largura: campo.largura,
        altura: campo.altura,
      })),
      texto_instrucoes: '',
      criado_em: template.criado_em,
      atualizado_em: template.atualizado_em,
      template_pdf_id: template.id,
    }));

    // Combinar com modelos padrão (substituindo mock)
    setModelos([...DEFAULT_MODELOS, ...modelosImportados]);
  }, []);
  const [modeloEditando, setModeloEditando] = useState<ModeloBoleto | null>(null);
  const [modeloDeletando, setModeloDeletando] = useState<ModeloBoleto | null>(null);
  const [criarNovo, setCriarNovo] = useState(false);
  const [importarPDFOpen, setImportarPDFOpen] = useState(false);

  const getBancoNome = (bancoId: string) => {
    const banco = BANCOS_SUPORTADOS.find((b) => b.id === bancoId);
    return banco?.nome_banco || 'Banco não encontrado';
  };

  const handleSalvar = () => {
    toast({
      title: modeloEditando ? 'Modelo atualizado' : 'Modelo criado',
      description: 'O modelo de layout foi salvo com sucesso.',
    });
    setModeloEditando(null);
    setCriarNovo(false);
  };

  const handleDuplicar = (modelo: ModeloBoleto) => {
    const novoModelo: ModeloBoleto = {
      ...modelo,
      id: `modelo_${Date.now()}`,
      nome_modelo: `${modelo.nome_modelo} (Cópia)`,
      padrao: false,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };
    setModelos(prev => [...prev, novoModelo]);
    toast({
      title: 'Modelo duplicado',
      description: `Uma cópia de "${modelo.nome_modelo}" foi criada.`,
    });
  };

  const handleDeletar = () => {
    if (modeloDeletando) {
      setModelos(prev => prev.filter(m => m.id !== modeloDeletando.id));
      toast({
        title: 'Modelo excluído',
        description: 'O modelo de layout foi excluído com sucesso.',
      });
    }
    setModeloDeletando(null);
  };

  const handleImportarPDF = (template: TemplatePDF, bancosCompativeis: string[], nomeModelo: string) => {
    // Criar um novo modelo baseado no template PDF importado
    const novoModelo: ModeloBoleto = {
      id: `modelo_${Date.now()}`,
      nome_modelo: nomeModelo,
      banco_id: bancosCompativeis[0], // Banco principal
      bancos_compativeis: bancosCompativeis,
      tipo_layout: 'CNAB_400', // Padrão
      padrao: false,
      campos_mapeados: template.layout_detectado.areas_texto.map(area => ({
        id: area.id,
        nome: area.texto_original || '',
        variavel: area.campo_mapeado || '',
        posicao_x: area.x,
        posicao_y: area.y,
        largura: area.largura,
        altura: area.altura,
      })),
      texto_instrucoes: '',
      template_pdf_id: template.id,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };

    setModelos(prev => [...prev, novoModelo]);
    
    // Salvar template no localStorage
    const templates = JSON.parse(localStorage.getItem('templates_pdf') || '[]');
    templates.push(template);
    localStorage.setItem('templates_pdf', JSON.stringify(templates));

    toast({
      title: 'Modelo importado com sucesso',
      description: `O modelo "${nomeModelo}" foi criado a partir do PDF e está disponível para ${bancosCompativeis.length} banco(s).`,
    });
  };

  return (
    <MainLayout>
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
            <Button variant="outline" onClick={() => setImportarPDFOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar PDF Modelo
            </Button>
            <Button onClick={() => setCriarNovo(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Modelo
            </Button>
          </div>
        </div>

        {/* Dica sobre importação de PDF */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Upload className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Importe um PDF de boleto existente</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Faça upload de um boleto PDF para copiar o layout exato. 
                  O mesmo modelo pode ser compartilhado entre vários bancos - apenas os dados impressos mudam.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dica sobre variáveis */}
        <Card className="bg-muted/30 border-muted">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Dica: Use variáveis nos textos</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Você pode usar variáveis como <code className="bg-muted px-1 rounded">{'{{cliente_razao_social}}'}</code> 
                  {' '}ou <code className="bg-muted px-1 rounded">{'{{valor_titulo}}'}</code> nos textos de instrução. 
                  Elas serão substituídas automaticamente pelos dados reais do cliente e do boleto.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid de Modelos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modelos.map((modelo) => (
            <Card key={modelo.id} className="hover:shadow-card-hover transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {modelo.template_pdf_id ? (
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
                        {modelo.template_pdf_id && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
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
                            const banco = BANCOS_SUPORTADOS.find(b => b.id === bancoId);
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
                    <span>{TIPOS_IMPRESSAO[modelo.tipo_layout].label}</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {modelo.campos_mapeados.length} campo(s) mapeado(s)
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setModeloEditando(modelo)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicar(modelo)}
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal de Edição/Criação */}
        <Dialog
          open={!!modeloEditando || criarNovo}
          onOpenChange={() => {
            setModeloEditando(null);
            setCriarNovo(false);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {modeloEditando ? 'Editar Modelo' : 'Novo Modelo de Layout'}
              </DialogTitle>
              <DialogDescription>
                Configure o modelo de layout para impressão de boletos. Use variáveis
                nos textos para inserir dados dinâmicos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Informações básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome do Modelo</Label>
                  <Input
                    defaultValue={modeloEditando?.nome_modelo || ''}
                    placeholder="Ex: Modelo Padrão BB"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Banco</Label>
                  <Select defaultValue={modeloEditando?.banco_id || ''}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANCOS_SUPORTADOS.map((banco) => (
                        <SelectItem key={banco.id} value={banco.id}>
                          {banco.nome_banco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Layout</Label>
                  <Select defaultValue={modeloEditando?.tipo_layout || ''}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPOS_IMPRESSAO).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Texto de instruções */}
              <div>
                <Label className="flex items-center gap-2">
                  Texto de Instruções do Boleto
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Este texto aparecerá nas instruções do boleto. Use as variáveis
                          abaixo para inserir dados dinâmicos.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Textarea
                  defaultValue={modeloEditando?.texto_instrucoes || ''}
                  placeholder="Ex: Não receber após 30 dias do vencimento. Cobrar juros de {{taxa_juros}}% ao mês..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Variáveis disponíveis */}
              <div>
                <Label className="text-sm text-muted-foreground">Variáveis Disponíveis</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {VARIAVEIS_DISPONIVEIS.map((v) => (
                    <TooltipProvider key={v.variavel}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => {
                              navigator.clipboard.writeText(v.variavel);
                              toast({
                                title: 'Copiado!',
                                description: `${v.variavel} copiado para a área de transferência.`,
                              });
                            }}
                          >
                            {v.variavel}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{v.descricao}</p>
                          <p className="text-xs text-muted-foreground">Clique para copiar</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>

              {/* Campos mapeados (simplificado) */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  O editor visual de campos estará disponível em breve.
                  Por enquanto, os campos padrão serão utilizados automaticamente.
                </p>
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
              <Button onClick={handleSalvar}>
                {modeloEditando ? 'Salvar Alterações' : 'Criar Modelo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={!!modeloDeletando} onOpenChange={() => setModeloDeletando(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o modelo "{modeloDeletando?.nome_modelo}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletar} className="bg-destructive text-destructive-foreground">
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
      </div>
    </MainLayout>
  );
}
