import { useState, useCallback } from 'react';
import { Upload, FileImage, Sparkles, CheckCircle2, Loader2, ArrowRight, Eye, Save } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { bancosMock } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

interface CampoDetectado {
  id: string;
  nome: string;
  variavel: string;
  confianca: number;
}

export default function ImportarLayout() {
  const { toast } = useToast();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [camposDetectados, setCamposDetectados] = useState<CampoDetectado[]>([]);
  const [bancoSelecionado, setBancoSelecionado] = useState<string>('');
  const [nomeModelo, setNomeModelo] = useState('');
  const [etapa, setEtapa] = useState<'upload' | 'processando' | 'resultado'>('upload');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const tiposPermitidos = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!tiposPermitidos.includes(file.type)) {
        toast({
          title: 'Tipo de arquivo inválido',
          description: 'Por favor, envie um arquivo PDF ou imagem (PNG, JPG).',
          variant: 'destructive',
        });
        return;
      }
      setArquivo(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const tiposPermitidos = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!tiposPermitidos.includes(file.type)) {
        toast({
          title: 'Tipo de arquivo inválido',
          description: 'Por favor, envie um arquivo PDF ou imagem (PNG, JPG).',
          variant: 'destructive',
        });
        return;
      }
      setArquivo(file);
    }
  }, [toast]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleProcessar = async () => {
    if (!arquivo || !bancoSelecionado) {
      toast({
        title: 'Dados incompletos',
        description: 'Por favor, selecione um arquivo e um banco.',
        variant: 'destructive',
      });
      return;
    }

    setEtapa('processando');
    setProcessando(true);
    setProgresso(0);

    // Simular processamento com IA
    const intervalId = setInterval(() => {
      setProgresso((prev) => {
        if (prev >= 100) {
          clearInterval(intervalId);
          return 100;
        }
        return prev + 10;
      });
    }, 300);

    // Simular resultado após processamento
    setTimeout(() => {
      clearInterval(intervalId);
      setProgresso(100);
      setProcessando(false);
      
      // Campos simulados detectados pela IA
      setCamposDetectados([
        { id: '1', nome: 'Razão Social', variavel: '{{cliente_razao_social}}', confianca: 95 },
        { id: '2', nome: 'CNPJ', variavel: '{{cliente_cnpj}}', confianca: 98 },
        { id: '3', nome: 'Endereço', variavel: '{{cliente_endereco}}', confianca: 87 },
        { id: '4', nome: 'Valor do Título', variavel: '{{valor_titulo}}', confianca: 99 },
        { id: '5', nome: 'Data de Vencimento', variavel: '{{data_vencimento}}', confianca: 96 },
        { id: '6', nome: 'Nosso Número', variavel: '{{nosso_numero}}', confianca: 92 },
        { id: '7', nome: 'Código de Barras', variavel: '{{codigo_barras}}', confianca: 100 },
        { id: '8', nome: 'Linha Digitável', variavel: '{{linha_digitavel}}', confianca: 100 },
      ]);

      setEtapa('resultado');
      
      toast({
        title: 'Análise concluída!',
        description: 'A IA identificou 8 campos no boleto enviado.',
      });
    }, 3500);
  };

  const handleSalvar = () => {
    if (!nomeModelo) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe um nome para o modelo.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Modelo criado com sucesso!',
      description: `O modelo "${nomeModelo}" foi salvo e está pronto para uso.`,
    });

    // Resetar
    setArquivo(null);
    setCamposDetectados([]);
    setBancoSelecionado('');
    setNomeModelo('');
    setEtapa('upload');
  };

  const handleNovoBoleto = () => {
    setArquivo(null);
    setCamposDetectados([]);
    setNomeModelo('');
    setEtapa('upload');
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Importar Layout com IA
          </h1>
          <p className="text-muted-foreground">
            Faça upload de um boleto exemplo e a IA irá analisar e mapear os campos automaticamente
          </p>
        </div>

        {/* Instruções */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Como funciona?</p>
                <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                  <li>Faça upload de um boleto exemplo (PDF ou imagem)</li>
                  <li>A IA analisa o layout e identifica as áreas de texto</li>
                  <li>Os campos são mapeados automaticamente para variáveis do sistema</li>
                  <li>Revise o mapeamento e salve como um novo modelo</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Etapa: Upload */}
        {etapa === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Upload do Boleto</CardTitle>
                <CardDescription>
                  Envie um boleto em PDF ou imagem para análise
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center transition-colors
                    ${arquivo ? 'border-success bg-success/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                  `}
                >
                  {arquivo ? (
                    <div className="space-y-3">
                      <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <p className="font-medium">{arquivo.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setArquivo(null)}>
                        Alterar arquivo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Arraste um arquivo ou clique para selecionar</p>
                        <p className="text-sm text-muted-foreground">
                          Formatos aceitos: PDF, PNG, JPG (máx. 10MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button variant="outline" asChild>
                          <span>Selecionar arquivo</span>
                        </Button>
                      </label>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Banco do boleto</Label>
                  <Select value={bancoSelecionado} onValueChange={setBancoSelecionado}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {bancosMock.map((banco) => (
                        <SelectItem key={banco.id} value={banco.id}>
                          {banco.nome_banco} ({banco.codigo_banco})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleProcessar}
                disabled={!arquivo || !bancoSelecionado}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Analisar com IA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Etapa: Processando */}
        {etapa === 'processando' && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Analisando boleto...</h3>
                  <p className="text-muted-foreground mt-1">
                    A IA está identificando e mapeando os campos do boleto
                  </p>
                </div>
                <div className="max-w-md mx-auto">
                  <Progress value={progresso} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">{progresso}% concluído</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Etapa: Resultado */}
        {etapa === 'resultado' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Campos Detectados
                </CardTitle>
                <CardDescription>
                  Revise os campos identificados pela IA e faça ajustes se necessário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {camposDetectados.map((campo) => (
                    <div
                      key={campo.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-xs font-mono">
                          {campo.id}
                        </div>
                        <div>
                          <p className="font-medium">{campo.nome}</p>
                          <code className="text-xs text-muted-foreground">{campo.variavel}</code>
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant={campo.confianca >= 90 ? 'default' : 'secondary'}
                              className={campo.confianca >= 90 ? 'bg-success' : ''}
                            >
                              {campo.confianca}%
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Confiança da detecção
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Salvar Modelo</CardTitle>
                <CardDescription>
                  Dê um nome ao modelo e salve para usar na geração de boletos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome do Modelo</Label>
                  <Input
                    value={nomeModelo}
                    onChange={(e) => setNomeModelo(e.target.value)}
                    placeholder="Ex: Modelo Importado BB"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileImage className="h-4 w-4" />
                  <span>Arquivo: {arquivo?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>{camposDetectados.length} campos mapeados</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleNovoBoleto}>
                Analisar outro boleto
              </Button>
              <Button onClick={handleSalvar} className="gap-2">
                <Save className="h-4 w-4" />
                Salvar Modelo
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
