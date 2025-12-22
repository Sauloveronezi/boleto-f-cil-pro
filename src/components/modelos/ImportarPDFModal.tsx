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
import { TemplatePDF } from '@/types/boleto';
import { TemplateBoletoCompleto, CampoTemplateBoleto } from '@/types/templateBoleto';
import { salvarTemplate } from '@/lib/pdfTemplateGenerator';

interface ImportarPDFModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportar: (template: TemplatePDF, bancosCompativeis: string[], nomeModelo: string) => void;
}

export function ImportarPDFModal({ open, onOpenChange, onImportar }: ImportarPDFModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [nomeModelo, setNomeModelo] = useState('');
  const [bancosCompativeis, setBancosCompativeis] = useState<string[]>([]);
  const [processando, setProcessando] = useState(false);
  const [templateProcessado, setTemplateProcessado] = useState<TemplateBoletoCompleto | null>(null);
  const [templatePDF, setTemplatePDF] = useState<TemplatePDF | null>(null);
  const [camposDetectados, setCamposDetectados] = useState<CampoTemplateBoleto[]>([]);

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

    // reset do estado anterior para evitar "travamento" do botão
    setTemplateProcessado(null);
    setTemplatePDF(null);
    setCamposDetectados([]);
    setBancosCompativeis([]);

    setArquivo(file);
    setNomeModelo(file.name.replace('.pdf', ''));

    // Permite selecionar o mesmo arquivo novamente (re-dispara o onChange)
    event.target.value = '';

    // Criar preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Processar o PDF
    setProcessando(true);

    // Converter para base64
    const reader = new FileReader();

    reader.onerror = () => {
      console.error('Erro ao ler PDF (FileReader.onerror)', reader.error);
      setProcessando(false);
      toast({
        title: 'Falha ao ler o PDF',
        description: 'Não foi possível ler o arquivo. Tente novamente.',
        variant: 'destructive',
      });
    };

    reader.onabort = () => {
      console.warn('Leitura do PDF abortada (FileReader.onabort)');
      setProcessando(false);
      toast({
        title: 'Leitura cancelada',
        description: 'A leitura do arquivo foi cancelada. Tente novamente.',
        variant: 'destructive',
      });
    };

    reader.onload = async () => {
      try {
        const base64 = reader.result as string;

        // Simular tempo de processamento rápido (sem criar template FEBRABAN)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Criar template vazio - usuário irá editar manualmente
        const novoTemplate: TemplateBoletoCompleto = {
          id: `template_${Date.now()}`,
          nome: file.name.replace('.pdf', ''),
          largura_pagina: 210,
          altura_pagina: 140,
          margem_superior: 10,
          margem_inferior: 10,
          margem_esquerda: 10,
          margem_direita: 10,
          orientacao: 'portrait',
          campos: [], // Sem campos pré-definidos - usuário adiciona manualmente
          pdf_original_base64: base64,
          bancos_compativeis: [],
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        };

        // Criar TemplatePDF para compatibilidade
        const pdfTemplate: TemplatePDF = {
          id: novoTemplate.id,
          nome: novoTemplate.nome,
          arquivo_base64: base64,
          preview_url: url,
          layout_detectado: {
            largura_pagina: novoTemplate.largura_pagina,
            altura_pagina: novoTemplate.altura_pagina,
            areas_texto: [], // Vazio - edição manual
          },
          criado_em: novoTemplate.criado_em,
        };

        setTemplateProcessado(novoTemplate);
        setTemplatePDF(pdfTemplate);
        setCamposDetectados([]);

        toast({
          title: 'PDF carregado',
          description: 'O PDF foi carregado. Clique em "Importar Modelo" para abrir o editor de layout.',
        });
      } catch (err) {
        console.error('Erro ao processar PDF', err);
        toast({
          title: 'Erro ao processar o PDF',
          description: 'Ocorreu um erro ao carregar o arquivo. Tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setProcessando(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleBancoToggle = (bancoId: string) => {
    setBancosCompativeis(prev => 
      prev.includes(bancoId) 
        ? prev.filter(id => id !== bancoId)
        : [...prev, bancoId]
    );
  };

  const handleImportar = () => {
    if (!templateProcessado || !templatePDF) {
      toast({
        title: 'Erro',
        description: 'Nenhum template processado.',
        variant: 'destructive',
      });
      return;
    }

    // Atualiza bancos compatíveis no template
    const templateFinal: TemplateBoletoCompleto = {
      ...templateProcessado,
      nome: nomeModelo,
      bancos_compativeis: bancosCompativeis,
      atualizado_em: new Date().toISOString(),
    };

    // Salva o template completo no localStorage
    salvarTemplate(templateFinal);

    // Chama callback com TemplatePDF para compatibilidade
    onImportar(templatePDF, bancosCompativeis, nomeModelo);
    
    toast({
      title: 'Template importado',
      description: `O modelo "${nomeModelo}" foi salvo e será usado para gerar boletos idênticos ao PDF importado.`,
    });
    
    handleClose();
  };

  const handleClose = () => {
    setArquivo(null);
    setPreviewUrl(null);
    setNomeModelo('');
    setBancosCompativeis([]);
    setTemplateProcessado(null);
    setTemplatePDF(null);
    setCamposDetectados([]);
    setProcessando(false);
    onOpenChange(false);
  };

  // Não é mais necessário agrupar campos por categoria já que usamos edição manual

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
                {templateProcessado && (
                  <div>
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Bancos Compatíveis
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      O mesmo layout visual será usado para todos os bancos selecionados. 
                      Apenas os dados específicos mudam (agência, conta, código).
                    </p>
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

                {/* Info sobre edição manual */}
                {templateProcessado && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium">Edição Manual</p>
                      <p className="text-xs mt-1">
                        Clique em "Importar Modelo" para abrir o editor visual. 
                        Você poderá adicionar campos, textos e linhas manualmente para replicar o layout do PDF.
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
            disabled={!templateProcessado || !nomeModelo}
          >
            <Check className="h-4 w-4 mr-2" />
            Importar Modelo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
