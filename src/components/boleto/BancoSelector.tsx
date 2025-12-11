import { useState, useCallback, useEffect } from 'react';
import { Building2, Check, Upload, FileText, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Banco, TipoOrigem, TIPOS_ORIGEM, ConfiguracaoCNAB } from '@/types/boleto';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

// Chave para armazenar padrões CNAB no localStorage
const CNAB_PATTERNS_STORAGE_KEY = 'cnab-patterns';

// Função para carregar padrões do localStorage
const carregarPadroesLocalStorage = (): ConfiguracaoCNAB[] => {
  try {
    const stored = localStorage.getItem(CNAB_PATTERNS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Erro ao carregar padrões CNAB:', error);
  }
  return [];
};

// Dados mock de configurações CNAB (usados como fallback)
const configuracoesCNABMock: ConfiguracaoCNAB[] = [
  {
    id: '1',
    banco_id: '2',
    tipo_cnab: 'CNAB_400',
    nome: 'Bradesco Padrão 400',
    descricao: 'Layout padrão do Bradesco para CNAB 400',
    campos: [
      { id: '1', nome: 'CNPJ Sacado', campo_destino: 'cnpj', posicao_inicio: 4, posicao_fim: 17, tipo_registro: '1', formato: 'texto' },
      { id: '2', nome: 'Razão Social', campo_destino: 'razao_social', posicao_inicio: 235, posicao_fim: 274, tipo_registro: '1', formato: 'texto' },
      { id: '3', nome: 'Valor', campo_destino: 'valor', posicao_inicio: 127, posicao_fim: 139, tipo_registro: '1', formato: 'valor_centavos' },
      { id: '4', nome: 'Vencimento', campo_destino: 'vencimento', posicao_inicio: 121, posicao_fim: 126, tipo_registro: '1', formato: 'data_ddmmaa' },
      { id: '5', nome: 'Nosso Número', campo_destino: 'nosso_numero', posicao_inicio: 63, posicao_fim: 73, tipo_registro: '1', formato: 'texto' },
    ],
    criado_em: '2024-01-15',
    atualizado_em: '2024-12-10'
  },
  {
    id: '2',
    banco_id: '1',
    tipo_cnab: 'CNAB_240',
    nome: 'Banco do Brasil 240',
    descricao: 'Layout padrão do BB para CNAB 240',
    campos: [
      { id: '1', nome: 'CNPJ Sacado', campo_destino: 'cnpj', posicao_inicio: 19, posicao_fim: 32, tipo_registro: 'P', formato: 'texto' },
      { id: '2', nome: 'Valor', campo_destino: 'valor', posicao_inicio: 78, posicao_fim: 92, tipo_registro: 'P', formato: 'valor_centavos' },
      { id: '3', nome: 'Vencimento', campo_destino: 'vencimento', posicao_inicio: 78, posicao_fim: 85, tipo_registro: 'P', formato: 'data_ddmmaaaa' },
      { id: '4', nome: 'Nosso Número', campo_destino: 'nosso_numero', posicao_inicio: 38, posicao_fim: 57, tipo_registro: 'P', formato: 'texto' },
    ],
    criado_em: '2024-01-20',
    atualizado_em: '2024-12-10'
  }
];

interface BancoSelectorProps {
  bancos: Banco[];
  bancoSelecionado: string | null;
  tipoImpressao: TipoOrigem | null;
  arquivoCNAB: File | null;
  padraoCNAB: ConfiguracaoCNAB | null;
  onBancoChange: (bancoId: string) => void;
  onTipoImpressaoChange: (tipo: TipoOrigem) => void;
  onArquivoChange: (arquivo: File | null) => void;
  onPadraoCNABChange: (padrao: ConfiguracaoCNAB | null) => void;
}

export function BancoSelector({
  bancos,
  bancoSelecionado,
  tipoImpressao,
  arquivoCNAB,
  padraoCNAB,
  onBancoChange,
  onTipoImpressaoChange,
  onArquivoChange,
  onPadraoCNABChange,
}: BancoSelectorProps) {
  const isCNAB = tipoImpressao === 'CNAB_240' || tipoImpressao === 'CNAB_400';

  // Carregar padrões CNAB do localStorage
  const [padroesSalvos, setPadroesSalvos] = useState<ConfiguracaoCNAB[]>([]);
  
  useEffect(() => {
    const padroesLocalStorage = carregarPadroesLocalStorage();
    // Combinar padrões do localStorage com os mock (localStorage tem prioridade)
    const todosPadroes = [...padroesLocalStorage, ...configuracoesCNABMock];
    // Remover duplicados por ID
    const padroesUnicos = todosPadroes.filter((p, i, arr) => 
      arr.findIndex(x => x.id === p.id) === i
    );
    setPadroesSalvos(padroesUnicos);
  }, []);

  // Filtrar padrões disponíveis para o banco e tipo selecionados
  const padroesDisponiveis = padroesSalvos.filter(
    p => p.banco_id === bancoSelecionado && p.tipo_cnab === tipoImpressao
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onArquivoChange(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      onArquivoChange(file);
    }
  }, [onArquivoChange]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleBancoChange = (bancoId: string) => {
    onBancoChange(bancoId);
    // Limpar padrão ao trocar banco
    onPadraoCNABChange(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Tipo de Origem */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">Tipo de Origem dos Dados</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Escolha o formato de leitura dos dados. CNAB 240 e 400 leem arquivos de remessa bancária.
                  API/CDS integra diretamente com sistemas ERP (SAP, etc.).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <RadioGroup
          value={tipoImpressao || ''}
          onValueChange={(value) => {
            onTipoImpressaoChange(value as TipoOrigem);
            // Limpar arquivo ao trocar tipo
            if (value !== 'CNAB_240' && value !== 'CNAB_400') {
              onArquivoChange(null);
            }
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {Object.entries(TIPOS_ORIGEM).map(([key, value]) => (
            <Card
              key={key}
              className={cn(
                'cursor-pointer transition-all hover:shadow-card-hover',
                tipoImpressao === key
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-muted-foreground/30'
              )}
              onClick={() => {
                onTipoImpressaoChange(key as TipoOrigem);
                if (key !== 'CNAB_240' && key !== 'CNAB_400') {
                  onArquivoChange(null);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value={key} id={key} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={key} className="font-medium cursor-pointer">
                      {value.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {value.descricao}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
      </div>

      {/* Upload de arquivo CNAB */}
      {isCNAB && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">
              Arquivo de Remessa {tipoImpressao === 'CNAB_240' ? 'CNAB 240' : 'CNAB 400'}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Faça upload do arquivo de remessa no padrão {tipoImpressao === 'CNAB_240' ? 'CNAB 240' : 'CNAB 400'}.
                    O sistema irá extrair os dados dos títulos para geração dos boletos.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
              arquivoCNAB
                ? 'border-success bg-success/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            {arquivoCNAB ? (
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="font-medium">{arquivoCNAB.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(arquivoCNAB.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onArquivoChange(null)}>
                  Alterar arquivo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Arraste o arquivo ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground">
                    Arquivo de remessa {tipoImpressao === 'CNAB_240' ? 'CNAB 240' : 'CNAB 400'} (.txt, .rem, .ret)
                  </p>
                </div>
                <input
                  type="file"
                  accept=".txt,.rem,.ret,.cnab"
                  onChange={handleFileChange}
                  className="hidden"
                  id="cnab-upload"
                />
                <label htmlFor="cnab-upload">
                  <Button variant="outline" asChild>
                    <span>Selecionar arquivo</span>
                  </Button>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seleção de Banco */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">Banco Emissor</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Selecione o banco que irá emitir os boletos. O modelo de layout do banco será usado para gerar os PDFs.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {bancos.filter(b => b.ativo).map((banco) => (
            <Card
              key={banco.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-card-hover relative',
                bancoSelecionado === banco.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-muted-foreground/30'
              )}
              onClick={() => handleBancoChange(banco.id)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                {bancoSelecionado === banco.id && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  </div>
                )}
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-3">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-sm">{banco.nome_banco}</p>
                <p className="text-xs text-muted-foreground">{banco.codigo_banco}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Seleção de Padrão CNAB */}
      {isCNAB && bancoSelecionado && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">Padrão CNAB do Banco</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Selecione o padrão de leitura do arquivo CNAB configurado para este banco.
                    Configure novos padrões na tela de Padrões CNAB.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {padroesDisponiveis.length > 0 ? (
            <div className="space-y-3">
              <Select
                value={padraoCNAB?.id || ''}
                onValueChange={(value) => {
                  const padrao = padroesSalvos.find(p => p.id === value);
                  onPadraoCNABChange(padrao || null);
                }}
              >
                <SelectTrigger className="w-full md:w-96">
                  <SelectValue placeholder="Selecione o padrão de leitura" />
                </SelectTrigger>
                <SelectContent>
                  {padroesDisponiveis.map(padrao => (
                    <SelectItem key={padrao.id} value={padrao.id}>
                      <div className="flex flex-col">
                        <span>{padrao.nome}</span>
                        {padrao.descricao && (
                          <span className="text-xs text-muted-foreground">{padrao.descricao}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {padraoCNAB && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-medium">{padraoCNAB.nome}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {padraoCNAB.campos.length} campo(s) configurado(s)
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning font-medium">Nenhum padrão configurado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Não há padrão CNAB configurado para este banco e tipo de origem.
              </p>
              <Link 
                to="/configuracao-cnab" 
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              >
                <FileText className="h-3 w-3" />
                Configurar padrão CNAB
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
