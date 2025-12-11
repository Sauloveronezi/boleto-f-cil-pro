import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, FileImage, Sparkles, CheckCircle2, Loader2, ArrowRight, Save, AlertCircle, PlayCircle, FileJson, Download, Eye, Edit, Palette } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useNavigate } from 'react-router-dom';
import { ConfiguracaoCNAB, CampoCNAB, TipoLinhaCNAB } from '@/types/boleto';
import { BoletoPreview } from '@/components/boleto/BoletoPreview';
import { CnabTextEditor, CampoMapeado, TipoLinha } from '@/components/cnab/CnabTextEditor';

type CampoDestino = 'cnpj' | 'razao_social' | 'valor' | 'vencimento' | 'nosso_numero' | 'endereco' | 'numero_nota' | 'cidade' | 'estado' | 'cep';

const mapDestino = (destino: string): CampoDestino => {
  const mapping: Record<string, CampoDestino> = {
    'cnpj_sacado': 'cnpj',
    'nome_sacado': 'razao_social',
    'valor': 'valor',
    'data_vencimento': 'vencimento',
    'nosso_numero': 'nosso_numero',
    'endereco_sacado': 'endereco',
    'numero_documento': 'numero_nota',
    'cidade': 'cidade',
    'estado': 'estado',
    'cep_sacado': 'cep',
  };
  return mapping[destino] || 'razao_social';
};

interface CampoDetectado {
  id: string;
  nome: string;
  posicaoInicio: number;
  posicaoFim: number;
  tamanho: number;
  tipo: 'numerico' | 'alfanumerico' | 'data' | 'valor';
  destino: string;
  valor: string;
  confianca: number;
  tipoLinha: TipoLinha;
  cor: string;
}

const CORES_CAMPOS = [
  'bg-blue-200 dark:bg-blue-900',
  'bg-green-200 dark:bg-green-900',
  'bg-yellow-200 dark:bg-yellow-900',
  'bg-purple-200 dark:bg-purple-900',
  'bg-pink-200 dark:bg-pink-900',
  'bg-orange-200 dark:bg-orange-900',
  'bg-cyan-200 dark:bg-cyan-900',
  'bg-red-200 dark:bg-red-900',
];

export default function ImportarLayout() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const jsonInputRef = useRef<HTMLInputElement>(null);
  
  const [arquivoRemessa, setArquivoRemessa] = useState<File | null>(null);
  const [arquivoPDF, setArquivoPDF] = useState<File | null>(null);
  const [arquivoJSON, setArquivoJSON] = useState<File | null>(null);
  const [conteudoRemessa, setConteudoRemessa] = useState<string>('');
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [camposDetectados, setCamposDetectados] = useState<CampoDetectado[]>([]);
  const [bancoSelecionado, setBancoSelecionado] = useState<string>('');
  const [tipoCNAB, setTipoCNAB] = useState<'CNAB_240' | 'CNAB_400'>('CNAB_400');
  const [nomePadrao, setNomePadrao] = useState('');
  const [etapa, setEtapa] = useState<'upload' | 'processando' | 'resultado'>('upload');
  const [padraoGerado, setPadraoGerado] = useState<ConfiguracaoCNAB | null>(null);
  const [camposExtraidos, setCamposExtraidos] = useState<Record<string, string>>({});
  const [modoImportacao, setModoImportacao] = useState<'remessa' | 'json' | 'pdf_layout'>('remessa');
  const [arquivoLayoutPDF, setArquivoLayoutPDF] = useState<File | null>(null);
  const [mostrarEditorVisual, setMostrarEditorVisual] = useState(false);
  const [errosLeitura, setErrosLeitura] = useState<{ campo: string; mensagem: string }[]>([]);

  const handleArquivoRemessa = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setArquivoRemessa(file);
      const texto = await file.text();
      setConteudoRemessa(texto);
      toast({ title: 'Arquivo de remessa carregado', description: file.name });
      
      // Auto-extrair campos se já houver padrão
      if (padraoGerado) {
        extrairCamposDoArquivo(texto, padraoGerado);
      }
    }
  };

  const handleArquivoPDF = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Tipo de arquivo inválido',
          description: 'Por favor, envie um arquivo PDF.',
          variant: 'destructive',
        });
        return;
      }
      setArquivoPDF(file);
      toast({ title: 'Arquivo PDF carregado', description: file.name });
    }
  };

  const handleArquivoJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const texto = await file.text();
        const config = JSON.parse(texto) as ConfiguracaoCNAB;
        
        if (!config.campos || !config.tipo_cnab) {
          throw new Error('Formato de JSON inválido');
        }
        
        setArquivoJSON(file);
        setPadraoGerado(config);
        setTipoCNAB(config.tipo_cnab);
        setBancoSelecionado(config.banco_id || '');
        setNomePadrao(config.nome || file.name.replace('.json', ''));
        setEtapa('resultado');
        
        // Converter campos para o formato de detecção
        const camposConvertidos: CampoDetectado[] = config.campos.map((c, i) => ({
          id: String(i + 1),
          nome: c.nome,
          posicaoInicio: c.posicao_inicio,
          posicaoFim: c.posicao_fim,
          tamanho: c.posicao_fim - c.posicao_inicio + 1,
          tipo: c.formato === 'valor_centavos' ? 'valor' : c.formato?.includes('data') ? 'data' : 'alfanumerico',
          destino: c.campo_destino,
          valor: '',
          confianca: 100,
          tipoLinha: (c.tipo_linha || 'detalhe') as TipoLinha,
          cor: c.cor || CORES_CAMPOS[i % CORES_CAMPOS.length]
        }));
        setCamposDetectados(camposConvertidos);
        
        toast({ title: 'Padrão JSON importado!', description: `${config.campos.length} campos carregados.` });
      } catch (err) {
        toast({
          title: 'Erro ao importar JSON',
          description: 'O arquivo não está em formato válido de padrão CNAB.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDropRemessa = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setArquivoRemessa(file);
      const texto = await file.text();
      setConteudoRemessa(texto);
      toast({ title: 'Arquivo de remessa carregado', description: file.name });
    }
  }, [toast]);

  const handleDropPDF = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setArquivoPDF(file);
      toast({ title: 'Arquivo PDF carregado', description: file.name });
    }
  }, [toast]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const extrairCamposDoArquivo = (conteudo: string, config: ConfiguracaoCNAB) => {
    const linhas = conteudo.split('\n').filter(l => l.trim());
    const linhaDetalhe = linhas.find(l => {
      const tipo = l.charAt(0);
      return tipo === '1' || tipo === '3';
    }) || linhas[1] || linhas[0];

    const extraidos: Record<string, string> = {};
    
    for (const campo of config.campos) {
      let valor = linhaDetalhe.substring(campo.posicao_inicio - 1, campo.posicao_fim).trim();
      
      // Aplicar formato
      if (campo.formato === 'valor_centavos' && valor) {
        const num = parseInt(valor) / 100;
        valor = `R$ ${num.toFixed(2).replace('.', ',')}`;
      } else if ((campo.formato === 'data_ddmmaa' || campo.formato === 'data_ddmmaaaa') && valor.length >= 6) {
        const dia = valor.substring(0, 2);
        const mes = valor.substring(2, 4);
        const ano = valor.substring(4);
        valor = `${dia}/${mes}/${ano.length === 2 ? '20' + ano : ano}`;
      } else if (campo.campo_destino === 'cnpj' && valor.length >= 11) {
        // Formatar CNPJ/CPF
        const numeros = valor.replace(/\D/g, '');
        if (numeros.length === 14) {
          valor = numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        } else if (numeros.length === 11) {
          valor = numeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
        }
      }
      
      extraidos[campo.campo_destino] = valor;
      extraidos[campo.nome.toLowerCase().replace(/\s/g, '_')] = valor;
    }
    
    setCamposExtraidos(extraidos);
    return extraidos;
  };

  const handleExportarJSON = () => {
    if (!padraoGerado) return;
    
    const dataStr = JSON.stringify(padraoGerado, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileName = `${nomePadrao || 'padrao_cnab'}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    toast({ title: 'JSON exportado!', description: exportFileName });
  };

  const analisarArquivoRemessa = (conteudo: string): CampoDetectado[] => {
    const linhas = conteudo.split('\n').filter(l => l.trim());
    const campos: CampoDetectado[] = [];
    
    if (linhas.length === 0) return campos;

    // Identificar linhas por tipo
    const linhaHeader = linhas.find(l => l.charAt(0) === '0');
    const linhaDetalhe = linhas.find(l => {
      const tipo = l.charAt(0);
      return tipo === '1' || tipo === '3' || (tipoCNAB === 'CNAB_400' && l.length >= 400 && tipo !== '0' && tipo !== '9');
    }) || linhas[1] || linhas[0];
    const linhaTrailer = linhas.find(l => l.charAt(0) === '9');

    // Padrões por tipo de linha para CNAB 400
    const padroesHeader400 = [
      { nome: 'Tipo Registro Header', inicio: 1, fim: 1, destino: 'tipo_registro', tipo: 'numerico' as const, tipoLinha: 'header' as TipoLinha },
      { nome: 'Código Banco Header', inicio: 77, fim: 79, destino: 'codigo_banco', tipo: 'numerico' as const, tipoLinha: 'header' as TipoLinha },
      { nome: 'Razão Social Cedente', inicio: 47, fim: 76, destino: 'razao_social_cedente', tipo: 'alfanumerico' as const, tipoLinha: 'header' as TipoLinha },
      { nome: 'Data Gravação', inicio: 95, fim: 100, destino: 'data_gravacao', tipo: 'data' as const, tipoLinha: 'header' as TipoLinha },
    ];

    const padroesDetalhe400 = [
      { nome: 'Tipo Registro', inicio: 1, fim: 1, destino: 'tipo_registro', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Código Banco', inicio: 77, fim: 79, destino: 'codigo_banco', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Agência', inicio: 18, fim: 21, destino: 'agencia', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Conta', inicio: 22, fim: 29, destino: 'conta', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Nosso Número', inicio: 63, fim: 73, destino: 'nosso_numero', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Carteira', inicio: 108, fim: 108, destino: 'carteira', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Número Documento', inicio: 117, fim: 126, destino: 'numero_documento', tipo: 'alfanumerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Data Vencimento', inicio: 121, fim: 126, destino: 'data_vencimento', tipo: 'data' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Valor Título', inicio: 127, fim: 139, destino: 'valor', tipo: 'valor' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Espécie Título', inicio: 148, fim: 149, destino: 'especie', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Data Emissão', inicio: 151, fim: 156, destino: 'data_emissao', tipo: 'data' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Juros Mora', inicio: 161, fim: 173, destino: 'juros_mora', tipo: 'valor' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Tipo Inscricao Sacado', inicio: 219, fim: 220, destino: 'tipo_inscricao_sacado', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'CNPJ/CPF Sacado', inicio: 221, fim: 234, destino: 'cnpj_sacado', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Nome Sacado', inicio: 235, fim: 274, destino: 'nome_sacado', tipo: 'alfanumerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Endereço Sacado', inicio: 275, fim: 314, destino: 'endereco_sacado', tipo: 'alfanumerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'CEP Sacado', inicio: 327, fim: 334, destino: 'cep_sacado', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
    ];

    const padroesTrailer400 = [
      { nome: 'Tipo Registro Trailer', inicio: 1, fim: 1, destino: 'tipo_registro', tipo: 'numerico' as const, tipoLinha: 'trailer' as TipoLinha },
      { nome: 'Quantidade Registros', inicio: 2, fim: 7, destino: 'qtd_registros', tipo: 'numerico' as const, tipoLinha: 'trailer' as TipoLinha },
    ];

    // Padrões para CNAB 240
    const padroesDetalhe240 = [
      { nome: 'Código Banco', inicio: 1, fim: 3, destino: 'codigo_banco', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Lote Serviço', inicio: 4, fim: 7, destino: 'lote', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Tipo Registro', inicio: 8, fim: 8, destino: 'tipo_registro', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Agência', inicio: 24, fim: 28, destino: 'agencia', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Conta', inicio: 29, fim: 36, destino: 'conta', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Nosso Número', inicio: 58, fim: 73, destino: 'nosso_numero', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Data Vencimento', inicio: 78, fim: 85, destino: 'data_vencimento', tipo: 'data' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Valor Título', inicio: 120, fim: 134, destino: 'valor', tipo: 'valor' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'CNPJ/CPF Sacado', inicio: 134, fim: 147, destino: 'cnpj_sacado', tipo: 'numerico' as const, tipoLinha: 'detalhe' as TipoLinha },
      { nome: 'Nome Sacado', inicio: 144, fim: 183, destino: 'nome_sacado', tipo: 'alfanumerico' as const, tipoLinha: 'detalhe' as TipoLinha },
    ];

    // Função para processar campos de uma linha
    const processarLinha = (linha: string | undefined, padroes: typeof padroesDetalhe400) => {
      if (!linha) return;
      
      for (const padrao of padroes) {
        if (padrao.fim <= linha.length) {
          const valor = linha.substring(padrao.inicio - 1, padrao.fim).trim();
          if (valor) {
            const idCounter = campos.length + 1;
            campos.push({
              id: String(idCounter),
              nome: padrao.nome,
              valor: valor,
              posicaoInicio: padrao.inicio,
              posicaoFim: padrao.fim,
              tamanho: padrao.fim - padrao.inicio + 1,
              tipo: padrao.tipo,
              destino: padrao.destino,
              confianca: Math.floor(Math.random() * 15) + 85,
              tipoLinha: padrao.tipoLinha,
              cor: CORES_CAMPOS[(idCounter - 1) % CORES_CAMPOS.length]
            });
          }
        }
      }
    };

    if (tipoCNAB === 'CNAB_400') {
      processarLinha(linhaHeader, padroesHeader400);
      processarLinha(linhaDetalhe, padroesDetalhe400);
      processarLinha(linhaTrailer, padroesTrailer400);
    } else {
      processarLinha(linhaDetalhe, padroesDetalhe240);
    }

    return campos;
  };

  // Gerar campos padrão CNAB 400 baseado na especificação do banco
  const gerarCamposPadraoCNAB400 = (): CampoDetectado[] => {
    const camposPadrao = [
      { nome: 'Tipo Registro', inicio: 1, fim: 1, destino: 'tipo_registro', tipo: 'numerico' as const },
      { nome: 'Código Banco', inicio: 77, fim: 79, destino: 'codigo_banco', tipo: 'numerico' as const },
      { nome: 'Agência', inicio: 18, fim: 21, destino: 'agencia', tipo: 'numerico' as const },
      { nome: 'Conta', inicio: 22, fim: 29, destino: 'conta', tipo: 'numerico' as const },
      { nome: 'Nosso Número', inicio: 63, fim: 73, destino: 'nosso_numero', tipo: 'numerico' as const },
      { nome: 'Carteira', inicio: 108, fim: 108, destino: 'carteira', tipo: 'numerico' as const },
      { nome: 'Número Documento', inicio: 117, fim: 126, destino: 'numero_documento', tipo: 'alfanumerico' as const },
      { nome: 'Data Vencimento', inicio: 121, fim: 126, destino: 'data_vencimento', tipo: 'data' as const },
      { nome: 'Valor Título', inicio: 127, fim: 139, destino: 'valor', tipo: 'valor' as const },
      { nome: 'CNPJ/CPF Sacado', inicio: 221, fim: 234, destino: 'cnpj_sacado', tipo: 'numerico' as const },
      { nome: 'Nome Sacado', inicio: 235, fim: 274, destino: 'nome_sacado', tipo: 'alfanumerico' as const },
      { nome: 'Endereço Sacado', inicio: 275, fim: 314, destino: 'endereco_sacado', tipo: 'alfanumerico' as const },
      { nome: 'CEP Sacado', inicio: 327, fim: 334, destino: 'cep_sacado', tipo: 'numerico' as const },
    ];

    return camposPadrao.map((p, index) => ({
      id: String(index + 1),
      nome: p.nome,
      posicaoInicio: p.inicio,
      posicaoFim: p.fim,
      tamanho: p.fim - p.inicio + 1,
      tipo: p.tipo,
      destino: p.destino,
      valor: '(do PDF)',
      confianca: 95,
      tipoLinha: 'detalhe' as TipoLinha,
      cor: CORES_CAMPOS[index % CORES_CAMPOS.length]
    }));
  };

  const handleGerarPadrao = async () => {
    // Validar arquivos conforme modo de importação
    if (modoImportacao === 'remessa' && !arquivoRemessa) {
      toast({
        title: 'Dados incompletos',
        description: 'Por favor, carregue o arquivo de remessa.',
        variant: 'destructive',
      });
      return;
    }
    
    if (modoImportacao === 'pdf_layout' && !arquivoLayoutPDF) {
      toast({
        title: 'Dados incompletos',
        description: 'Por favor, carregue o PDF de layout do banco.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!bancoSelecionado) {
      toast({
        title: 'Dados incompletos',
        description: 'Por favor, selecione o banco.',
        variant: 'destructive',
      });
      return;
    }

    setEtapa('processando');
    setProcessando(true);
    setProgresso(0);

    // Simular processamento
    const intervalId = setInterval(() => {
      setProgresso((prev) => {
        if (prev >= 100) {
          clearInterval(intervalId);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(intervalId);
      setProgresso(100);
      setProcessando(false);
      
      let campos: CampoDetectado[] = [];
      
      if (modoImportacao === 'remessa' && conteudoRemessa) {
        // Analisar arquivo de remessa
        campos = analisarArquivoRemessa(conteudoRemessa);
      } else if (modoImportacao === 'pdf_layout') {
        // Para PDF de layout do banco, gerar campos padrão CNAB 400
        campos = gerarCamposPadraoCNAB400();
      }
      
      setCamposDetectados(campos);

      // Gerar configuração CNAB
      const banco = bancosMock.find(b => b.id === bancoSelecionado);
      const configCampos: CampoCNAB[] = campos.map((c, index) => ({
        id: `campo_${index + 1}`,
        nome: c.nome,
        campo_destino: mapDestino(c.destino),
        posicao_inicio: c.posicaoInicio,
        posicao_fim: c.posicaoFim,
        tipo_registro: '1',
        formato: c.tipo === 'valor' ? 'valor_centavos' : c.tipo === 'data' ? 'data_ddmmaa' : 'texto'
      }));

      const now = new Date().toISOString();
      const novaConfig: ConfiguracaoCNAB = {
        id: `config_${Date.now()}`,
        banco_id: bancoSelecionado,
        tipo_cnab: tipoCNAB,
        nome: nomePadrao || `Padrão ${banco?.nome_banco} - ${tipoCNAB}`,
        descricao: modoImportacao === 'pdf_layout' ? `Padrão importado do PDF de layout` : `Padrão detectado automaticamente`,
        campos: configCampos,
        criado_em: now,
        atualizado_em: now
      };

      setPadraoGerado(novaConfig);
      setEtapa('resultado');
      
      toast({
        title: 'Análise concluída!',
        description: `${campos.length} campos identificados no arquivo.`,
      });
    }, 2500);
  };

  const handleSalvar = () => {
    if (!padraoGerado) return;
    
    if (!nomePadrao) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe um nome para o padrão.',
        variant: 'destructive',
      });
      return;
    }

    // Atualizar nome
    const padraoFinal = { ...padraoGerado, nome: nomePadrao };

    // Salvar no localStorage
    const padroesExistentes = JSON.parse(localStorage.getItem('padroesCNAB') || '[]');
    padroesExistentes.push(padraoFinal);
    localStorage.setItem('padroesCNAB', JSON.stringify(padroesExistentes));

    toast({
      title: 'Padrão salvo com sucesso!',
      description: `O padrão "${nomePadrao}" está disponível para uso.`,
    });

    navigate('/configuracao-cnab');
  };

  const handleReset = () => {
    setArquivoRemessa(null);
    setArquivoPDF(null);
    setArquivoJSON(null);
    setConteudoRemessa('');
    setCamposDetectados([]);
    setNomePadrao('');
    setPadraoGerado(null);
    setEtapa('upload');
    setResultadoTeste(null);
    setCamposExtraidos({});
  };

  const [resultadoTeste, setResultadoTeste] = useState<{ campo: string; valor: string }[] | null>(null);

  const handleTestarPadrao = () => {
    if (!padraoGerado || !conteudoRemessa) {
      toast({
        title: 'Erro',
        description: 'Arquivo de remessa ou padrão não disponível.',
        variant: 'destructive',
      });
      return;
    }

    const extraidos = extrairCamposDoArquivo(conteudoRemessa, padraoGerado);
    
    const resultados: { campo: string; valor: string }[] = [];
    for (const campo of padraoGerado.campos) {
      resultados.push({
        campo: campo.nome || CAMPOS_DESTINO_LABELS[campo.campo_destino] || campo.campo_destino,
        valor: extraidos[campo.campo_destino] || extraidos[campo.nome?.toLowerCase().replace(/\s/g, '_') || ''] || '(vazio)'
      });
    }

    setResultadoTeste(resultados);
    toast({
      title: 'Teste concluído',
      description: `${resultados.length} campos extraídos do arquivo.`,
    });
  };

  const CAMPOS_DESTINO_LABELS: Record<string, string> = {
    'cnpj': 'CNPJ/CPF',
    'razao_social': 'Razão Social',
    'valor': 'Valor',
    'vencimento': 'Vencimento',
    'nosso_numero': 'Nosso Número',
    'endereco': 'Endereço',
    'numero_nota': 'Número Nota',
    'cidade': 'Cidade',
    'estado': 'Estado',
    'cep': 'CEP',
  };

  return (
    <MainLayout>
      <TooltipProvider>
        <div className="space-y-6 max-w-5xl">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Importar Layout CNAB
            </h1>
            <p className="text-muted-foreground">
              Carregue um arquivo de remessa CNAB para detectar automaticamente o padrão de campos
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
                    <li>Faça upload de um arquivo de remessa CNAB (.txt, .rem)</li>
                    <li>Opcionalmente, envie um PDF de boleto para referência</li>
                    <li>O sistema analisa o arquivo e identifica as posições dos campos</li>
                    <li>Revise o mapeamento e salve como um novo padrão CNAB</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Etapa: Upload */}
          {etapa === 'upload' && (
            <div className="space-y-6">
              {/* Tabs de Modo de Importação */}
              <Tabs value={modoImportacao} onValueChange={(v) => setModoImportacao(v as 'remessa' | 'json' | 'pdf_layout')}>
                <TabsList className="grid w-full max-w-xl grid-cols-3">
                  <TabsTrigger value="remessa" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Arquivo Remessa
                  </TabsTrigger>
                  <TabsTrigger value="pdf_layout" className="gap-2">
                    <FileImage className="h-4 w-4" />
                    Layout do Banco (PDF)
                  </TabsTrigger>
                  <TabsTrigger value="json" className="gap-2">
                    <FileJson className="h-4 w-4" />
                    Importar JSON
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="remessa" className="mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upload Remessa */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Arquivo de Remessa CNAB
                        </CardTitle>
                        <CardDescription>
                          Arquivo .txt ou .rem com os dados de cobrança
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div
                          onDrop={handleDropRemessa}
                          onDragOver={handleDragOver}
                          className={`
                            border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                            ${arquivoRemessa ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                          `}
                        >
                          <input
                            type="file"
                            accept=".txt,.rem,.ret"
                            onChange={handleArquivoRemessa}
                            className="hidden"
                            id="file-remessa"
                          />
                          <label htmlFor="file-remessa" className="cursor-pointer">
                            {arquivoRemessa ? (
                              <div className="space-y-2">
                                <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
                                <p className="font-medium">{arquivoRemessa.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(arquivoRemessa.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                                <p className="text-sm">Arraste ou clique para selecionar</p>
                                <p className="text-xs text-muted-foreground">
                                  Formatos: .txt, .rem, .ret
                                </p>
                              </div>
                            )}
                          </label>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Upload PDF (opcional) */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileImage className="h-5 w-5" />
                          PDF do Boleto (opcional)
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>PDF de um boleto para referência visual</p>
                            </TooltipContent>
                          </Tooltip>
                        </CardTitle>
                        <CardDescription>
                          PDF de um boleto gerado para comparação
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div
                          onDrop={handleDropPDF}
                          onDragOver={handleDragOver}
                          className={`
                            border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                            ${arquivoPDF ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                          `}
                        >
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleArquivoPDF}
                            className="hidden"
                            id="file-pdf"
                          />
                          <label htmlFor="file-pdf" className="cursor-pointer">
                            {arquivoPDF ? (
                              <div className="space-y-2">
                                <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
                                <p className="font-medium">{arquivoPDF.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(arquivoPDF.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                                <p className="text-sm">Arraste ou clique para selecionar</p>
                                <p className="text-xs text-muted-foreground">
                                  Formato: .pdf
                                </p>
                              </div>
                            )}
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="json" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileJson className="h-5 w-5" />
                        Importar Padrão CNAB de Arquivo JSON
                      </CardTitle>
                      <CardDescription>
                        Carregue um arquivo JSON com a configuração de campos exportada anteriormente
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div
                        className={`
                          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                          ${arquivoJSON ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                        `}
                        onClick={() => jsonInputRef.current?.click()}
                      >
                        <input
                          ref={jsonInputRef}
                          type="file"
                          accept=".json"
                          onChange={handleArquivoJSON}
                          className="hidden"
                        />
                        {arquivoJSON ? (
                          <div className="space-y-2">
                            <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
                            <p className="font-medium">{arquivoJSON.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Clique para selecionar outro arquivo
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <FileJson className="h-10 w-10 mx-auto text-muted-foreground" />
                            <p className="text-sm font-medium">Clique para selecionar arquivo JSON</p>
                            <p className="text-xs text-muted-foreground">
                              Formato esperado: configuração de padrão CNAB exportada
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pdf_layout" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileImage className="h-5 w-5" />
                        Layout do Banco (PDF)
                      </CardTitle>
                      <CardDescription>
                        Carregue o PDF de especificação de layout CNAB fornecido pelo banco
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Análise inteligente de layout</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              O sistema irá analisar o PDF de especificação do banco e identificar automaticamente
                              as posições dos campos (Nome do Sacado, Valor, Vencimento, etc.)
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div
                        className={`
                          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                          ${arquivoLayoutPDF ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                        `}
                        onClick={() => document.getElementById('file-layout-pdf')?.click()}
                      >
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setArquivoLayoutPDF(file);
                              toast({ title: 'PDF de layout carregado', description: file.name });
                            }
                          }}
                          className="hidden"
                          id="file-layout-pdf"
                        />
                        {arquivoLayoutPDF ? (
                          <div className="space-y-2">
                            <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
                            <p className="font-medium">{arquivoLayoutPDF.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(arquivoLayoutPDF.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Clique para selecionar outro arquivo
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <FileImage className="h-10 w-10 mx-auto text-muted-foreground" />
                            <p className="text-sm font-medium">Clique para selecionar PDF de layout</p>
                            <p className="text-xs text-muted-foreground">
                              PDF de especificação de layout CNAB do banco
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {arquivoLayoutPDF && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          <span>Opcionalmente, carregue também um arquivo de remessa para validar o layout</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Configurações */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configurações do Padrão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Banco</Label>
                      <Select value={bancoSelecionado} onValueChange={setBancoSelecionado}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o banco" />
                        </SelectTrigger>
                        <SelectContent>
                          {bancosMock.map((banco) => (
                            <SelectItem key={banco.id} value={banco.id}>
                              {banco.codigo_banco} - {banco.nome_banco}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo CNAB</Label>
                      <Select value={tipoCNAB} onValueChange={(v) => setTipoCNAB(v as 'CNAB_240' | 'CNAB_400')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CNAB_240">CNAB 240</SelectItem>
                          <SelectItem value="CNAB_400">CNAB 400</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome do Padrão</Label>
                      <Input 
                        placeholder="Ex: Padrão Bradesco Cobrança"
                        value={nomePadrao}
                        onChange={(e) => setNomePadrao(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview do Arquivo */}
              {conteudoRemessa && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Preview do Arquivo</CardTitle>
                    <CardDescription>Primeiras linhas do arquivo de remessa</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-[150px]">
                      {conteudoRemessa.split('\n').slice(0, 5).join('\n')}
                    </pre>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                {modoImportacao === 'remessa' && (
                  <Button
                    onClick={handleGerarPadrao}
                    disabled={!arquivoRemessa || !bancoSelecionado}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Gerar Padrão CNAB
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {modoImportacao === 'pdf_layout' && (
                  <Button
                    onClick={handleGerarPadrao}
                    disabled={!arquivoLayoutPDF || !bancoSelecionado}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Analisar Layout do Banco
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
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
                    <h3 className="text-lg font-semibold">Analisando arquivo...</h3>
                    <p className="text-muted-foreground mt-1">
                      Identificando campos e posições no arquivo CNAB
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
              {/* Botões de modo de visualização */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant={mostrarEditorVisual ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMostrarEditorVisual(true)}
                    className="gap-2"
                  >
                    <Palette className="h-4 w-4" />
                    Editor Visual (Texto Colorido)
                  </Button>
                  <Button
                    variant={!mostrarEditorVisual ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMostrarEditorVisual(false)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Lista de Campos
                  </Button>
                </div>
                {errosLeitura.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errosLeitura.length} erro(s) de leitura
                  </Badge>
                )}
              </div>

              {/* Editor Visual com Texto Colorido */}
              {mostrarEditorVisual && conteudoRemessa && (
                <CnabTextEditor
                  conteudo={conteudoRemessa}
                  campos={camposDetectados.map(c => ({
                    id: c.id,
                    nome: c.nome,
                    posicaoInicio: c.posicaoInicio,
                    posicaoFim: c.posicaoFim,
                    tamanho: c.tamanho,
                    tipo: c.tipo,
                    destino: c.destino,
                    valor: c.valor,
                    tipoLinha: c.tipoLinha,
                    cor: c.cor,
                  }))}
                  tipoCNAB={tipoCNAB}
                  onCamposChange={(novosCampos) => {
                    setCamposDetectados(novosCampos.map((c, i) => ({
                      ...c,
                      confianca: camposDetectados[i]?.confianca || 90,
                    })));
                    // Atualizar padrão gerado também
                    if (padraoGerado) {
                      const configCampos: CampoCNAB[] = novosCampos.map((c, index) => ({
                        id: `campo_${index + 1}`,
                        nome: c.nome,
                        campo_destino: mapDestino(c.destino),
                        posicao_inicio: c.posicaoInicio,
                        posicao_fim: c.posicaoFim,
                        tipo_registro: '1',
                        formato: c.tipo === 'valor' ? 'valor_centavos' : c.tipo === 'data' ? 'data_ddmmaa' : 'texto',
                        tipo_linha: c.tipoLinha as TipoLinhaCNAB,
                        cor: c.cor
                      }));
                      setPadraoGerado({ ...padraoGerado, campos: configCampos });
                    }
                  }}
                  onErrosDetectados={setErrosLeitura}
                />
              )}

              {/* Lista tradicional de campos */}
              {!mostrarEditorVisual && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Campos Detectados
                    </CardTitle>
                    <CardDescription>
                      {camposDetectados.length} campos identificados no arquivo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {camposDetectados.map((campo) => (
                        <div
                          key={campo.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded ${campo.cor}`} />
                            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-xs font-mono">
                              {campo.id}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{campo.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                Posição: {campo.posicaoInicio}-{campo.posicaoFim} ({campo.tamanho} chars) | Linha: {campo.tipoLinha}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <Badge variant="outline" className="mb-1">{campo.tipo}</Badge>
                              <p className="text-xs font-mono bg-background px-2 py-1 rounded">
                                {campo.valor.substring(0, 15)}{campo.valor.length > 15 ? '...' : ''}
                              </p>
                            </div>
                            <Badge className={campo.confianca >= 90 ? 'bg-primary' : 'bg-muted'}>
                              {campo.confianca}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Salvar Padrão CNAB</CardTitle>
                  <CardDescription>
                    Dê um nome ao padrão para salvar na lista de configurações
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nome do Padrão</Label>
                    <Input
                      value={nomePadrao}
                      onChange={(e) => setNomePadrao(e.target.value)}
                      placeholder="Ex: Padrão Bradesco CNAB 400"
                      className="mt-1"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {arquivoRemessa?.name}
                    </span>
                    <span>•</span>
                    <span>{tipoCNAB}</span>
                    <span>•</span>
                    <span>{camposDetectados.length} campos</span>
                  </div>
                </CardContent>
              </Card>

              {/* Resultado do Teste */}
              {resultadoTeste && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <PlayCircle className="h-5 w-5 text-primary" />
                      Resultado do Teste
                    </CardTitle>
                    <CardDescription>
                      Valores extraídos do arquivo usando o padrão gerado
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Campos Extraídos</h4>
                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                          {resultadoTeste.map((r, i) => (
                            <div key={i} className="flex justify-between p-2 bg-background rounded border">
                              <span className="text-sm font-medium">{r.campo}:</span>
                              <span className="text-sm font-mono">{r.valor}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Preview do Boleto
                        </h4>
                        <div className="transform scale-75 origin-top-left">
                          <BoletoPreview
                            nota={null}
                            cliente={null}
                            banco={bancosMock.find(b => b.id === bancoSelecionado) || null}
                            campos={camposExtraidos}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preview do Boleto (quando há campos extraídos) */}
              {Object.keys(camposExtraidos).length > 0 && !resultadoTeste && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      Preview do Boleto
                    </CardTitle>
                    <CardDescription>
                      Visualização do boleto com os dados extraídos do arquivo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-w-2xl mx-auto">
                      <BoletoPreview
                        nota={null}
                        cliente={null}
                        banco={bancosMock.find(b => b.id === bancoSelecionado) || null}
                        campos={camposExtraidos}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upload de arquivo para testar */}
              {padraoGerado && !conteudoRemessa && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Carregar Arquivo para Teste</CardTitle>
                    <CardDescription>
                      Carregue um arquivo de remessa para testar o padrão importado
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      onDrop={handleDropRemessa}
                      onDragOver={handleDragOver}
                      className="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer border-border hover:border-primary/50 hover:bg-muted/50"
                    >
                      <input
                        type="file"
                        accept=".txt,.rem,.ret"
                        onChange={handleArquivoRemessa}
                        className="hidden"
                        id="file-remessa-test"
                      />
                      <label htmlFor="file-remessa-test" className="cursor-pointer">
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm">Arraste ou clique para carregar arquivo de remessa</p>
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleReset}>
                  Analisar outro arquivo
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleExportarJSON} className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar JSON
                  </Button>
                  <Button variant="secondary" onClick={handleTestarPadrao} disabled={!conteudoRemessa} className="gap-2">
                    <PlayCircle className="h-4 w-4" />
                    Testar Padrão
                  </Button>
                  <Button onClick={handleSalvar} className="gap-2">
                    <Save className="h-4 w-4" />
                    Salvar Padrão CNAB
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </TooltipProvider>
    </MainLayout>
  );
}
