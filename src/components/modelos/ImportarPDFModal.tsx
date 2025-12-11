import { useState, useRef } from 'react';
import { Upload, FileText, Eye, Check, Building2, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { bancosMock } from '@/data/mockData';
import { TemplatePDF } from '@/types/boleto';

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
  const [templateProcessado, setTemplateProcessado] = useState<TemplatePDF | null>(null);

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

    setArquivo(file);
    setNomeModelo(file.name.replace('.pdf', ''));
    
    // Criar preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Simular processamento do PDF
    setProcessando(true);
    
    // Converter para base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      
      // Simular análise do layout (em produção, usaria IA para detectar campos)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const template: TemplatePDF = {
        id: `template_${Date.now()}`,
        nome: file.name.replace('.pdf', ''),
        arquivo_base64: base64,
        preview_url: url,
        layout_detectado: {
          largura_pagina: 210, // A4 mm
          altura_pagina: 297,
          areas_texto: [
            { id: '1', x: 10, y: 10, largura: 80, altura: 10, texto_original: 'Cedente', campo_mapeado: '{{empresa_razao_social}}' },
            { id: '2', x: 10, y: 25, largura: 60, altura: 8, texto_original: 'Sacado', campo_mapeado: '{{cliente_razao_social}}' },
            { id: '3', x: 10, y: 35, largura: 40, altura: 8, texto_original: 'CNPJ', campo_mapeado: '{{cliente_cnpj}}' },
            { id: '4', x: 150, y: 25, largura: 40, altura: 8, texto_original: 'Valor', campo_mapeado: '{{valor_titulo}}' },
            { id: '5', x: 150, y: 35, largura: 40, altura: 8, texto_original: 'Vencimento', campo_mapeado: '{{data_vencimento}}' },
          ],
        },
        criado_em: new Date().toISOString(),
      };
      
      setTemplateProcessado(template);
      setProcessando(false);
      
      toast({
        title: 'PDF analisado',
        description: `${template.layout_detectado.areas_texto.length} áreas de texto detectadas.`,
      });
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
    if (!templateProcessado) {
      toast({
        title: 'Erro',
        description: 'Nenhum template processado.',
        variant: 'destructive',
      });
      return;
    }

    if (bancosCompativeis.length === 0) {
      toast({
        title: 'Selecione ao menos um banco',
        description: 'O modelo precisa estar associado a pelo menos um banco.',
        variant: 'destructive',
      });
      return;
    }

    onImportar(templateProcessado, bancosCompativeis, nomeModelo);
    handleClose();
  };

  const handleClose = () => {
    setArquivo(null);
    setPreviewUrl(null);
    setNomeModelo('');
    setBancosCompativeis([]);
    setTemplateProcessado(null);
    setProcessando(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Modelo de PDF
          </DialogTitle>
          <DialogDescription>
            Faça upload de um boleto PDF existente para usar como modelo. 
            O sistema irá copiar o layout exato e você poderá usar para vários bancos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Coluna Esquerda - Upload e Configuração */}
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
                      Use um boleto existente como modelo de layout
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
                  Selecione os bancos que podem usar este modelo. 
                  Os dados específicos de cada banco serão preenchidos automaticamente.
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {bancosMock.filter(b => b.ativo).map((banco) => (
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
                      const banco = bancosMock.find(b => b.id === id);
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

            {/* Campos Detectados */}
            {templateProcessado && (
              <div>
                <Label>Campos Detectados no Layout</Label>
                <div className="mt-2 space-y-1 text-sm">
                  {templateProcessado.layout_detectado.areas_texto.map(area => (
                    <div key={area.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">{area.texto_original}</span>
                      <Badge variant="outline">{area.campo_mapeado}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita - Preview */}
          <div>
            <Label className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Pré-visualização do PDF
            </Label>
            <div className="mt-2 border rounded-lg bg-muted/30 min-h-[400px] flex items-center justify-center">
              {processando ? (
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">Analisando layout do PDF...</p>
                </div>
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[500px] rounded"
                  title="Preview do PDF"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Faça upload de um PDF para ver a prévia</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImportar}
            disabled={!templateProcessado || bancosCompativeis.length === 0 || !nomeModelo}
          >
            <Check className="h-4 w-4 mr-2" />
            Importar Modelo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
