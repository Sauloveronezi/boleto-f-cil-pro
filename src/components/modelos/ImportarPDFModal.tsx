import { useState, useRef } from 'react';
import { Upload, FileText, Eye, Building2, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { BANCOS_SUPORTADOS } from '@/data/bancos';
import { useAuth } from '@/hooks/useAuth';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useNavigate } from 'react-router-dom';
import { analisarPDF, PDFDimensions } from '@/lib/pdfAnalyzer';

export interface ImportarPDFResult {
  file: File;
  previewUrl: string;
  nomeModelo: string;
  bancosCompativeis: string[];
  dimensoes?: PDFDimensions;
  /** Se true, tenta copiar os campos_mapeados do modelo padrão do banco selecionado */
  copiarCamposPadrao?: boolean;
}

interface ImportarPDFModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportar: (result: ImportarPDFResult) => void;
}

export function ImportarPDFModal({ open, onOpenChange, onImportar }: ImportarPDFModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission, isLoading: isLoadingPermissoes } = usePermissoes();
  const canEdit = hasPermission('modelos', 'criar');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [nomeModelo, setNomeModelo] = useState('');
  const [bancosCompativeis, setBancosCompativeis] = useState<string[]>([]);
  const [processando, setProcessando] = useState(false);
  const [dimensoes, setDimensoes] = useState<PDFDimensions | null>(null);
  const [copiarCamposPadrao, setCopiarCamposPadrao] = useState(true);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo PDF.',
        variant: 'destructive',
      });
      return;
    }

    // Reset estado anterior
    setBancosCompativeis([]);
    setDimensoes(null);
    event.target.value = '';

    setArquivo(file);
    setNomeModelo(file.name.replace('.pdf', ''));

    // Criar preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    setProcessando(true);
    
    try {
      // Analisar dimensões do PDF
      const dims = await analisarPDF(file);
      setDimensoes(dims);
      
      toast({
        title: 'PDF analisado',
        description: `Dimensões: ${dims.larguraMm} × ${dims.alturaMm} mm`,
      });
    } catch (err) {
      console.error('[ImportarPDF] Erro ao analisar PDF:', err);
      toast({
        title: 'PDF carregado',
        description: 'O PDF foi carregado, mas não foi possível detectar as dimensões automaticamente.',
      });
    }
    
    setProcessando(false);
  };

  const handleBancoToggle = (bancoId: string) => {
    setBancosCompativeis(prev => 
      prev.includes(bancoId) 
        ? prev.filter(id => id !== bancoId)
        : [...prev, bancoId]
    );
  };

  const handleImportar = () => {
    if (!arquivo || !previewUrl) {
      toast({
        title: 'Erro',
        description: 'Nenhum arquivo selecionado.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Autenticação necessária',
        description: 'Faça login para importar modelos.',
        variant: 'destructive',
      });
      return;
    }

    if (!canEdit) {
      toast({
        title: 'Sem permissão',
        description: 'Você precisa de permissão de admin ou operador para importar modelos.',
        variant: 'destructive',
      });
      return;
    }

    // Passa o arquivo e dados para o componente pai
    onImportar({
      file: arquivo,
      previewUrl,
      nomeModelo,
      bancosCompativeis,
      dimensoes: dimensoes || undefined,
      copiarCamposPadrao,
    });
    
    handleClose();
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setArquivo(null);
    setPreviewUrl(null);
    setNomeModelo('');
    setBancosCompativeis([]);
    setDimensoes(null);
    setProcessando(false);
    onOpenChange(false);
  };

  // Permitir importar sem banco selecionado - o modelo pode ser usado para qualquer banco
  // Permite importar durante carregamento de permissões se usuário logado
  const canImport = !!arquivo && !!nomeModelo && !!user && (isLoadingPermissoes || canEdit);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Modelo de PDF para Impressão de Boletos
          </DialogTitle>
          <DialogDescription>
            Faça upload de um boleto PDF existente. Após o upload, você poderá editar manualmente o layout no editor visual.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Coluna Esquerda - Upload e Configuração */}
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Aviso de login */}
                {!user && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-700 dark:text-amber-300 flex-1">
                      <p className="font-medium">Login necessário</p>
                      <p className="text-xs mt-1">
                        Faça login para poder importar e salvar modelos.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleClose();
                        navigate('/auth');
                      }}
                    >
                      Fazer login
                    </Button>
                  </div>
                )}

                {/* Upload */}
                <div>
                  <Label>Arquivo PDF do Boleto Modelo</Label>
                  <div 
                    className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {arquivo ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{arquivo.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(arquivo.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          Clique ou arraste um arquivo PDF
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          O layout será copiado exatamente para impressão
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nome do Modelo */}
                {arquivo && (
                  <div>
                    <Label>Nome do Modelo</Label>
                    <Input
                      value={nomeModelo}
                      onChange={(e) => setNomeModelo(e.target.value)}
                      placeholder="Ex: Modelo Boleto Padrão"
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Seleção de Bancos */}
                {arquivo && (
                  <div>
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Bancos Compatíveis
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      O mesmo layout visual será usado para todos os bancos selecionados.
                      Apenas os dados específicos mudam (agência, conta, código).
                    </p>

                    <div className="flex items-start gap-3 p-3 bg-muted/30 border rounded-lg mb-3">
                      <Checkbox
                        checked={copiarCamposPadrao}
                        onCheckedChange={(v) => setCopiarCamposPadrao(!!v)}
                        className="mt-0.5"
                      />
                      <div className="text-sm">
                        <p className="font-medium">Copiar campos do modelo padrão</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Pré-carrega os campos (posições) do modelo padrão do banco selecionado.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {BANCOS_SUPORTADOS.filter(b => b.ativo).map((banco) => (
                        <div 
                          key={banco.id} 
                          className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                          onClick={() => handleBancoToggle(banco.id)}
                        >
                          <Checkbox 
                            checked={bancosCompativeis.includes(banco.id)}
                            onCheckedChange={() => handleBancoToggle(banco.id)}
                          />
                          <span className="text-sm">{banco.codigo_banco} - {banco.nome_banco}</span>
                        </div>
                      ))}
                    </div>

                    {copiarCamposPadrao && bancosCompativeis.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Opcional: selecione bancos para copiar campos de um modelo padrão existente.
                      </p>
                    )}

                    {bancosCompativeis.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {bancosCompativeis.map(id => {
                          const banco = BANCOS_SUPORTADOS.find(b => b.id === id);
                          return banco ? (
                            <Badge key={id} variant="secondary" className="text-xs">
                              {banco.codigo_banco}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Info */}
                {arquivo && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium">Editor Visual</p>
                      <p className="text-xs mt-1">
                        Após importar, o editor abrirá com o PDF como fundo. Se você ativar “Copiar campos do modelo padrão”, os campos já serão pré-carregados.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Coluna Direita - Preview */}
            <div className="flex flex-col h-[60vh]">
              <Label className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4" />
                Pré-visualização do PDF Modelo
              </Label>
              <div className="flex-1 border rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden">
                {processando ? (
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Carregando PDF...</p>
                  </div>
                ) : previewUrl ? (
                  <object
                    data={previewUrl}
                    type="application/pdf"
                    className="w-full h-full rounded"
                    title="Preview do PDF"
                  >
                    <div className="text-center p-4">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-primary" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Visualização bloqueada pelo navegador
                      </p>
                      <a 
                        href={previewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary underline text-sm"
                      >
                        Clique aqui para abrir em nova aba
                      </a>
                    </div>
                  </object>
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Faça upload de um PDF de boleto</p>
                    <p className="text-xs mt-1">
                      Você poderá editar o layout manualmente no editor visual
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImportar}
            disabled={!canImport}
          >
            <Check className="h-4 w-4 mr-2" />
            Importar Modelo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
