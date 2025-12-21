import { useState, useCallback, useRef, useMemo } from 'react';
import { Upload, FileText, FileImage, Sparkles, CheckCircle2, Loader2, ArrowRight, Save, AlertCircle, PlayCircle, FileJson, Download, Eye, Edit, Palette, HelpCircle } from 'lucide-react';
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
import { useBancos } from '@/hooks/useBancos';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ConfiguracaoCNAB, CampoCNAB, TipoLinhaCNAB, TipoRegistroCNAB } from '@/types/boleto';
import { BoletoPreview } from '@/components/boleto/BoletoPreview';
import { CnabTextEditor, CampoMapeado, TipoLinha } from '@/components/cnab/CnabTextEditor';
import { parseCnabPdf, CampoDetectado } from '@/lib/pdfLayoutParser';
import { gerarLinhasCNAB240, gerarCamposHeaderArquivo240, gerarCamposDetalheP240, gerarCamposDetalheQ240, gerarCamposDetalheR240, gerarCamposTrailerLote240, gerarCamposTrailerArquivo240 } from '@/types/cnab';

// Mapeia destinos específicos para campos do boleto, mantém outros inalterados
const mapDestino = (destino: string): string => {
  const mapping: Record<string, string> = {
    'cnpj_sacado': 'cnpj',
    'nome_sacado': 'razao_social',
    'data_vencimento': 'vencimento',
    'endereco_sacado': 'endereco',
    'numero_documento': 'numero_nota',
    'cep_sacado': 'cep',
  };
  return mapping[destino] || destino; // Mantém o destino original se não estiver no mapping
};

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

// Helper para converter TipoRegistroCNAB para TipoLinhaCNAB (compatibilidade)
function mapTipoRegistroParaTipoLinha(tipo: TipoRegistroCNAB): TipoLinhaCNAB {
  switch (tipo) {
    case 'header_arquivo':
      return 'header';
    case 'header_lote':
      return 'header_lote';
    case 'trailer_lote':
      return 'trailer_lote';
    case 'trailer_arquivo':
      return 'trailer';
    default:
      return 'detalhe';
  }
}

// Helper para mapear TipoLinha para código de registro (0, 1, 3, etc)
function mapTipoLinhaParaCodigoRegistro(tipo: TipoLinha, tipoCNAB: 'CNAB_240' | 'CNAB_400'): string {
  if (tipoCNAB === 'CNAB_240') {
    switch (tipo) {
      case 'header_arquivo': return '0';
      case 'header_lote': return '1';
      case 'detalhe_segmento_p':
      case 'detalhe_segmento_q':
      case 'detalhe_segmento_r':
      case 'detalhe':
        return '3';
      case 'trailer_lote': return '5';
      case 'trailer_arquivo': return '9';
      default: return '3';
    }
  } else {
    // CNAB 400
    switch (tipo) {
      case 'header_arquivo': return '0';
      case 'detalhe': return '1';
      case 'trailer_arquivo': return '9';
      default: return '1';
    }
  }
}

export default function ImportarLayout() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: bancos = [], isLoading: bancosLoading } = useBancos();
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

  // Helper to convert LinhaCNAB[] to CampoDetectado[]
  const gerarCamposPadraoCNAB240 = (): CampoDetectado[] => {
    const linhas = gerarLinhasCNAB240();
    const campos: CampoDetectado[] = [];
    let idCounter = 0;

    linhas.forEach(linha => {
      linha.campos.forEach(campo => {
        idCounter++;
        campos.push({
          id: String(idCounter),
          nome: campo.nome,
          posicaoInicio: campo.posicaoInicio,
          posicaoFim: campo.posicaoFim,
          tamanho: campo.posicaoFim - campo.posicaoInicio + 1,
          tipo: campo.formato?.includes('valor') ? 'valor' : campo.formato?.includes('data') ? 'data' : 'alfanumerico',
          destino: campo.campoDestino || '',
          valor: '(padrão)',
          confianca: 100,
          tipoLinha: linha.tipo as TipoLinha,
          cor: linha.corTipo || CORES_CAMPOS[idCounter % CORES_CAMPOS.length]
        });
      });
    });
    return campos;
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

    const intervalId = setInterval(() => {
      setProgresso((prev) => {
        if (prev >= 90) return 90;
        return prev + 10;
      });
    }, 200);

    try {
      let campos: CampoDetectado[] = [];
      
      if (modoImportacao === 'remessa' && conteudoRemessa) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        campos = analisarArquivoRemessa(conteudoRemessa);
      } else if (modoImportacao === 'pdf_layout') {
        if (arquivoLayoutPDF) {
           try {
             // Tentar processar PDF real
             const camposPDF = await parseCnabPdf(arquivoLayoutPDF);
             
             if (camposPDF.length > 0) {
               campos = camposPDF;
               toast({
                 title: 'PDF Processado',
                 description: `${campos.length} campos identificados do layout PDF.`,
               });
             } else {
               throw new Error('Nenhum campo identificado');
             }
           } catch (error) {
             console.warn('Falha ao processar PDF, usando fallback:', error);
             toast({
               title: 'Aviso',
               description: 'Não foi possível extrair campos do PDF automaticamente. Usando modelo padrão.',
               variant: 'destructive'
             });
             
             if (tipoCNAB === 'CNAB_240') {
               campos = gerarCamposPadraoCNAB240();
             } else {
               campos = gerarCamposPadraoCNAB400();
             }
           }
        }
      }
      
      clearInterval(intervalId);
      setProgresso(100);
      setProcessando(false);
      
      setCamposDetectados(campos);

      // Gerar configuração CNAB
      const banco = bancos.find(b => b.id === bancoSelecionado);
      const configCampos: CampoCNAB[] = campos.map((c, index) => ({
        id: `campo_${index + 1}`,
        nome: c.nome,
        campo_destino: mapDestino(c.destino),
        posicao_inicio: c.posicaoInicio,
        posicao_fim: c.posicaoFim,
        tipo_registro: mapTipoLinhaParaCodigoRegistro(c.tipoLinha as TipoLinha, tipoCNAB),
        formato: c.tipo === 'valor' ? 'valor_centavos' : c.tipo === 'data' ? 'data_ddmmaa' : 'texto',
        tipo_linha: mapTipoRegistroParaTipoLinha(c.tipoLinha as TipoRegistroCNAB),
        cor: c.cor
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
      
      if (campos.length > 0) {
        toast({
          title: 'Análise concluída!',
          description: `${campos.length} campos identificados no arquivo.`,
        });
      }
      
    } catch (error) {
      clearInterval(intervalId);
      setProcessando(false);
      setEtapa('upload');
      console.error(error);
      toast({
        title: 'Erro no processamento',
        description: 'Ocorreu um erro ao processar o arquivo.',
        variant: 'destructive'
      });
    }
  };

  const handleSalvar = () => {
    if (!padraoGerado) {
      toast({
        title: 'Erro',
        description: 'Nenhum padrão foi gerado para salvar.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!nomePadrao.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe um nome para o padrão.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Reconstruir campos com todos os dados necessários, incluindo tipo_linha e cor
      const camposCompletos: CampoCNAB[] = camposDetectados.map((c, index) => ({
        id: `campo_${index + 1}`,
        nome: c.nome,
        campo_destino: mapDestino(c.destino),
        posicao_inicio: c.posicaoInicio,
        posicao_fim: c.posicaoFim,
        tipo_registro: mapTipoLinhaParaCodigoRegistro(c.tipoLinha as TipoLinha, tipoCNAB),
        formato: c.tipo === 'valor' ? 'valor_centavos' : c.tipo === 'data' ? 'data_ddmmaa' : 'texto',
        tipo_linha: mapTipoRegistroParaTipoLinha(c.tipoLinha as TipoRegistroCNAB),
        cor: c.cor
      }));

      const now = new Date().toISOString();
      const padraoFinal: ConfiguracaoCNAB = {
        id: `config_${Date.now()}`,
        banco_id: bancoSelecionado,
        tipo_cnab: tipoCNAB,
        nome: nomePadrao.trim(),
        descricao: padraoGerado.descricao || `Padrão ${tipoCNAB} importado`,
        campos: camposCompletos,
        criado_em: now,
        atualizado_em: now
      };

      // Salvar no localStorage
      const padroesExistentes = JSON.parse(localStorage.getItem('padroesCNAB') || '[]') as ConfiguracaoCNAB[];
      padroesExistentes.push(padraoFinal);
      localStorage.setItem('padroesCNAB', JSON.stringify(padroesExistentes));

      toast({
        title: 'Padrão salvo com sucesso!',
        description: `O padrão "${nomePadrao}" está disponível para uso.`,
      });

      navigate('/configuracao-cnab');
    } catch (error) {
      console.error('Erro ao salvar padrão CNAB:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar o padrão. Verifique os dados e tente novamente.',
        variant: 'destructive',
      });
    }
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

  const [segmentoAtual, setSegmentoAtual] = useState<string>('header_arquivo');
  const [campoFocado, setCampoFocado] = useState<string | null>(null);
  const [resultadoTeste, setResultadoTeste] = useState<{ campo: string; valor: string }[] | null>(null);

  // Agrupar campos por segmento
  const camposPorSegmento = useMemo(() => {
    const grupos: Record<string, CampoDetectado[]> = {
      'header_arquivo': [],
      'header_lote': [],
      'detalhe': [], 
      'detalhe_segmento_p': [],
      'detalhe_segmento_q': [],
      'detalhe_segmento_r': [],
      'trailer_lote': [],
      'trailer_arquivo': []
    };

    camposDetectados.forEach(campo => {
      const tipo = campo.tipoLinha || 'detalhe';
      if (!grupos[tipo]) grupos[tipo] = [];
      grupos[tipo].push(campo);
    });

    return grupos;
  }, [camposDetectados]);

  // Gerar linha de visualização para o segmento atual
  const linhaVisualizacao = useMemo(() => {
    const tamanho = tipoCNAB === 'CNAB_240' ? 240 : 400;

    // Tentar pegar linha real do arquivo se existir
    if (conteudoRemessa) {
        const linhas = conteudoRemessa.split('\n');
        let linhaReal = '';
        
        // Lógica de busca de linha por tipo
        if (segmentoAtual === 'header_arquivo') {
            linhaReal = linhas.find(l => {
              if (tipoCNAB === 'CNAB_240') return l.length >= 8 && l[7] === '0';
              return l.length >= 1 && l[0] === '0';
            }) || '';
        } else if (segmentoAtual === 'header_lote') {
            linhaReal = linhas.find(l => {
              if (tipoCNAB === 'CNAB_240') return l.length >= 8 && l[7] === '1';
              return false; // CNAB 400 não tem header de lote
            }) || '';
        } else if (segmentoAtual.startsWith('detalhe')) {
            if (tipoCNAB === 'CNAB_240') {
               if (segmentoAtual.includes('segmento')) {
                   const segLetra = segmentoAtual.split('_').pop()?.toUpperCase();
                   linhaReal = linhas.find(l => l.length >= 14 && l[7] === '3' && l[13] === segLetra) || '';
               } else {
                   // Generic detail or fallback
                   linhaReal = linhas.find(l => l.length >= 8 && l[7] === '3') || '';
               }
            } else {
               linhaReal = linhas.find(l => l.length >= 1 && l[0] === '1') || '';
            }
        } else if (segmentoAtual === 'trailer_lote') {
            linhaReal = linhas.find(l => {
              if (tipoCNAB === 'CNAB_240') return l.length >= 8 && l[7] === '5';
              return false;
            }) || '';
        } else if (segmentoAtual === 'trailer_arquivo') {
            linhaReal = linhas.find(l => {
               if (tipoCNAB === 'CNAB_240') return l.length >= 8 && l[7] === '9';
               return l.length >= 1 && l[0] === '9';
            }) || '';
        }

        if (linhaReal) {
            return linhaReal.padEnd(tamanho, ' ').substring(0, tamanho).split('');
        } else {
           // Retornar array vazio ou marcador para indicar "não encontrado"
           return null;
        }
    }

    let linha = Array(tamanho).fill(' ');
    const camposDoSegmento = camposPorSegmento[segmentoAtual] || [];
    
    camposDoSegmento.forEach(campo => {
      const inicio = campo.posicaoInicio - 1;
      const valor = campo.valor === '(do PDF)' ? (campo.tipo === 'numerico' ? '9'.repeat(campo.tamanho) : 'X'.repeat(campo.tamanho)) : campo.valor;
      for (let i = 0; i < campo.tamanho; i++) {
        if (inicio + i < tamanho) {
          linha[inicio + i] = valor[i] || (campo.tipo === 'numerico' ? '0' : ' ');
        }
      }
    });

    return linha;
  }, [camposPorSegmento, segmentoAtual, tipoCNAB, conteudoRemessa]);

  // Handle text selection in visualizer to focus field
  const handleVisualizerSelection = () => {
     const selection = window.getSelection();
     if (!selection || selection.rangeCount === 0) return;
     
     const range = selection.getRangeAt(0);
     const container = document.getElementById('visualizer-content');
     
     if (container && container.contains(range.commonAncestorContainer)) {
        // This is a rough estimation. Since we use individual spans, selection might be tricky.
        // Better approach: use the spans themselves.
        // Actually, checking if the anchor node is one of our spans.
        
        let startNode = range.startContainer;
        if (startNode.nodeType === 3) startNode = startNode.parentNode as Node;
        
        let endNode = range.endContainer;
        if (endNode.nodeType === 3) endNode = endNode.parentNode as Node;
        
        if (startNode instanceof HTMLElement && startNode.hasAttribute('data-pos')) {
           const pos = parseInt(startNode.getAttribute('data-pos') || '0');
           
           // Find field at this position
           const campo = (camposPorSegmento[segmentoAtual] || []).find(c => pos >= c.posicaoInicio && pos <= c.posicaoFim);
           
           if (campo) {
              setCampoFocado(campo.id);
              // Scroll to field in editor
              const fieldElement = document.getElementById(`field-row-${campo.id}`);
              if (fieldElement) {
                 fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
           }
        }
     }
  };

  // Atualizar campo ao editar
  const handleUpdateCampo = (id: string, updates: Partial<CampoDetectado>) => {
    setCamposDetectados(prev => prev.map(c => {
      if (c.id === id) {
        const novo = { ...c, ...updates };
        if (updates.posicaoInicio || updates.posicaoFim) {
          novo.tamanho = novo.posicaoFim - novo.posicaoInicio + 1;
        }
        return novo;
      }
      return c;
    }));
  };

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
                          {bancosLoading ? (
                            <SelectItem value="" disabled>Carregando...</SelectItem>
                          ) : bancos.map((banco) => (
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
            <div className="flex flex-col h-[calc(100vh-180px)]">
              
              {/* Topo: Editor de Campos (Scrollável) */}
              <div className="flex-1 overflow-hidden min-h-0 mb-4">
                <Card className="h-full flex flex-col">
                  <CardHeader className="pb-3 flex-none">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Editor de Campos</CardTitle>
                      {/* Tabs de Segmento */}
                      <Tabs value={segmentoAtual} onValueChange={setSegmentoAtual} className="w-auto">
                        <TabsList className="grid grid-cols-4 w-full h-auto flex-wrap justify-start gap-1 bg-transparent">
                          {Object.entries(camposPorSegmento).map(([key, campos]) => {
                            if (campos.length === 0 && !['header_arquivo', 'detalhe', 'trailer_arquivo'].includes(key)) return null;
                            return (
                              <TabsTrigger 
                                key={key} 
                                value={key}
                                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border text-xs px-2 py-1 h-8"
                              >
                                {key.replace(/_/g, ' ').toUpperCase()} ({campos.length})
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 overflow-y-auto pr-2">
                     <div className="space-y-2">
                       <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground mb-2 px-2 sticky top-0 bg-background z-10 py-2 border-b">
                         <div className="col-span-1">ID</div>
                         <div className="col-span-4">Nome do Campo</div>
                         <div className="col-span-2">Início</div>
                         <div className="col-span-2">Fim</div>
                         <div className="col-span-1">Tam.</div>
                         <div className="col-span-2">Tipo</div>
                       </div>
                      
                      {(camposPorSegmento[segmentoAtual] || []).map((campo) => (
                        <div 
                            key={campo.id}
                            id={`field-row-${campo.id}`}
                            className={`
                              grid grid-cols-12 gap-2 items-center p-2 rounded-md border text-sm transition-colors
                              ${campoFocado === campo.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}
                            `}
                            onMouseEnter={() => setCampoFocado(campo.id)}
                            onMouseLeave={() => setCampoFocado(null)}
                          >
                          <div className="col-span-1 font-mono text-xs text-muted-foreground">#{campo.id}</div>
                          
                          <div className="col-span-4">
                            <Input 
                              value={campo.nome} 
                              onChange={(e) => handleUpdateCampo(campo.id, { nome: e.target.value })}
                              className="h-7 text-xs"
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <Input 
                              type="number"
                              value={campo.posicaoInicio} 
                              onChange={(e) => handleUpdateCampo(campo.id, { posicaoInicio: parseInt(e.target.value) })}
                              className="h-7 text-xs"
                            />
                          </div>
                          
                          <div className="col-span-2">
                            <Input 
                              type="number"
                              value={campo.posicaoFim} 
                              onChange={(e) => handleUpdateCampo(campo.id, { posicaoFim: parseInt(e.target.value) })}
                              className="h-7 text-xs"
                            />
                          </div>
                          
                          <div className="col-span-1 text-center font-mono text-xs">
                            {campo.tamanho}
                          </div>
                          
                          <div className="col-span-2">
                             <Select 
                               value={campo.tipo} 
                               onValueChange={(v) => handleUpdateCampo(campo.id, { tipo: v as any })}
                             >
                               <SelectTrigger className="h-7 text-xs">
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="alfanumerico">Texto</SelectItem>
                                 <SelectItem value="numerico">Numérico</SelectItem>
                                 <SelectItem value="data">Data</SelectItem>
                                 <SelectItem value="valor">Valor</SelectItem>
                               </SelectContent>
                             </Select>
                          </div>
                        </div>
                      ))}
                      
                      {(camposPorSegmento[segmentoAtual] || []).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Nenhum campo neste segmento.</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => {
                              const novoId = String(camposDetectados.length + 1);
                              setCamposDetectados([...camposDetectados, {
                                id: novoId,
                                nome: 'Novo Campo',
                                posicaoInicio: 1,
                                posicaoFim: 10,
                                tamanho: 10,
                                tipo: 'alfanumerico',
                                destino: '',
                                valor: '',
                                confianca: 100,
                                tipoLinha: segmentoAtual as any,
                                cor: CORES_CAMPOS[camposDetectados.length % CORES_CAMPOS.length]
                              }]);
                            }}
                          >
                            Adicionar Campo
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rodapé: Visualizador de Linha (Fixo) */}
              <div className="flex-none space-y-4">
                <Card className="border-primary/20 shadow-lg overflow-hidden border-2">
                  <CardHeader className="bg-muted/50 py-2 border-b px-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" />
                      Visualização da Linha ({segmentoAtual})
                    </CardTitle>
                    
                    <div className="flex items-center gap-2">
                       <label htmlFor="upload-remessa-teste" className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          {conteudoRemessa ? 'Trocar arquivo de teste' : 'Carregar arquivo de teste'}
                       </label>
                       <input 
                          id="upload-remessa-teste"
                          type="file" 
                          accept=".txt,.rem,.ret" 
                          className="hidden"
                          onChange={handleArquivoRemessa}
                       />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div 
                      id="visualizer-content"
                      className="p-4 bg-[#1e1e1e] text-white font-mono text-xs overflow-x-auto whitespace-nowrap leading-relaxed scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent select-text cursor-text"
                      onMouseUp={handleVisualizerSelection}
                    >
                       {!linhaVisualizacao ? (
                         <div className="flex items-center justify-center h-16 text-muted-foreground/50">
                            <span className="flex items-center gap-2">
                               <AlertCircle className="h-4 w-4" />
                               Registro não encontrado no documento
                            </span>
                         </div>
                       ) : (
                         <div className="flex min-w-max">
                         {linhaVisualizacao.map((char, i) => {
                           const pos = i + 1;
                           // Verificar se esta posição pertence ao campo focado
                           const campoAtivo = (camposPorSegmento[segmentoAtual] || []).find(c => c.id === campoFocado);
                           const isHighlighted = campoAtivo && pos >= campoAtivo.posicaoInicio && pos <= campoAtivo.posicaoFim;
                           
                           // Verificar se pertence a algum outro campo (para colorir)
                           const campoDono = (camposPorSegmento[segmentoAtual] || []).find(c => pos >= c.posicaoInicio && pos <= c.posicaoFim);
                           
                           return (
                             <span 
                               key={i}
                               data-pos={pos}
                               className={`
                                 inline-block w-[9px] text-center transition-all duration-75 relative
                                 ${isHighlighted ? 'bg-yellow-400 text-black font-bold z-10' : ''}
                                 ${!isHighlighted && campoDono ? 'bg-white/10 text-white/90' : 'text-white/30'}
                                 ${pos % 10 === 0 && !isHighlighted ? 'border-r border-white/20' : ''}
                               `}
                               title={`Pos: ${pos} | ${campoDono?.nome || 'Vazio'}`}
                             >
                               {char}
                               {/* Marcador de início/fim de campo */}
                               {isHighlighted && pos === campoAtivo?.posicaoInicio && (
                                  <span className="absolute -top-3 left-0 text-[8px] text-yellow-400 bg-black/80 px-1 rounded select-none">{pos}</span>
                               )}
                               {isHighlighted && pos === campoAtivo?.posicaoFim && (
                                  <span className="absolute -bottom-3 right-0 text-[8px] text-yellow-400 bg-black/80 px-1 rounded select-none">{pos}</span>
                               )}
                             </span>
                           );
                         })}
                         </div>
                       )}
                    </div>
                    <div className="bg-muted/50 p-2 text-[10px] text-muted-foreground flex justify-between items-center px-4">
                      <div className="flex gap-4">
                          <span>Posições: {tipoCNAB === 'CNAB_240' ? '240' : '400'}</span>
                          {campoFocado && (
                            <span className="font-bold text-primary animate-pulse">
                                Editando: {(camposPorSegmento[segmentoAtual] || []).find(c => c.id === campoFocado)?.nome}
                            </span>
                          )}
                      </div>
                      <span className="text-xs">
                        Selecione um trecho do texto para localizar o campo correspondente
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Botões de Ação */}
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={handleReset}>
                    Cancelar / Voltar
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportarJSON} className="gap-2">
                      <Download className="h-4 w-4" />
                      Exportar JSON
                    </Button>
                    <Button onClick={handleSalvar} className="gap-2 min-w-[150px]">
                      <Save className="h-4 w-4" />
                      Salvar Padrão
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </TooltipProvider>
    </MainLayout>
  );
}
