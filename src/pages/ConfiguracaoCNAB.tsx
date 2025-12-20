import { useState, useRef, useMemo, useEffect } from 'react';
import { 
  FileText, Plus, Save, Trash2, HelpCircle, Settings2, 
  Upload, Eye, AlertCircle, ArrowLeft, Download 
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Atualização dos padrões CNAB e correções de tipos
import { useToast } from '@/hooks/use-toast';
import { BANCOS_SUPORTADOS } from '@/data/bancos';
import type { ConfiguracaoCNAB, CampoCNAB, TipoRegistroCNAB, TipoLinhaCNAB } from '@/types/boleto';
import { CampoDetectado } from '@/lib/pdfLayoutParser';
import { TipoLinha } from '@/components/cnab/CnabTextEditor';

// --- HELPERS E CONSTANTES ---

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
  'agencia': 'Agência',
  'conta': 'Conta',
  'carteira': 'Carteira'
};

const mapDestino = (destino: string): string => {
  const mapping: Record<string, string> = {
    'cnpj_sacado': 'cnpj',
    'nome_sacado': 'razao_social',
    'data_vencimento': 'vencimento',
    'endereco_sacado': 'endereco',
    'numero_documento': 'numero_nota',
    'cep_sacado': 'cep',
  };
  return mapping[destino] || destino;
};

function mapTipoRegistroParaTipoLinha(tipo: string): TipoLinha {
  switch (tipo) {
    case '0': return 'header_arquivo';
    case '1': return 'header_lote'; // ou detalhe CNAB 400
    case '3': return 'detalhe';
    case '5': return 'trailer_lote';
    case '9': return 'trailer_arquivo';
    case 'P': return 'detalhe_segmento_p';
    case 'Q': return 'detalhe_segmento_q';
    case 'R': return 'detalhe_segmento_r';
    default: return 'detalhe';
  }
}

// Inverso: TipoLinha -> Código (0, 1, 3...)
function mapTipoLinhaParaCodigoRegistro(tipo: TipoLinha, tipoCNAB: 'CNAB_240' | 'CNAB_400'): string {
  if (tipoCNAB === 'CNAB_240') {
    switch (tipo) {
      case 'header_arquivo': return '0';
      case 'header_lote': return '1';
      case 'detalhe_segmento_p': return '3'; // Segmento P (código 3)
      case 'detalhe_segmento_q': return '3';
      case 'detalhe_segmento_r': return '3';
      case 'detalhe': return '3';
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

// Helper para converter CampoCNAB -> CampoDetectado
function converterParaCampoDetectado(campo: CampoCNAB, index: number): CampoDetectado {
    // Tenta inferir o tipoLinha se não estiver definido
    let tipoLinha: TipoLinha;

    // Mapeamento de compatibilidade TipoLinhaCNAB -> TipoLinha (TipoRegistroCNAB)
    if (campo.tipo_linha) {
        switch (campo.tipo_linha) {
            case 'header': tipoLinha = 'header_arquivo'; break;
            case 'header_lote': tipoLinha = 'header_lote'; break;
            case 'detalhe': tipoLinha = 'detalhe'; break;
            case 'trailer_lote': tipoLinha = 'trailer_lote'; break;
            case 'trailer': tipoLinha = 'trailer_arquivo'; break;
            default: tipoLinha = 'detalhe';
        }
    } else if (campo.tipo_registro) {
        // Se não tiver tipo_linha, tenta inferir pelo tipo_registro
        if (campo.tipo_registro === '0') tipoLinha = 'header_arquivo';
        else if (campo.tipo_registro === '9') tipoLinha = 'trailer_arquivo';
        else if (campo.tipo_registro === '1') tipoLinha = 'header_lote'; // Ambíguo com CNAB400 detalhe
        else if (campo.tipo_registro === '3') tipoLinha = 'detalhe';
        else if (campo.tipo_registro === '5') tipoLinha = 'trailer_lote';
        else tipoLinha = 'detalhe';
    } else {
        tipoLinha = 'detalhe';
    }

    return {
        id: campo.id || String(index + 1),
        nome: campo.nome,
        posicaoInicio: campo.posicao_inicio,
        posicaoFim: campo.posicao_fim,
        tamanho: campo.posicao_fim - campo.posicao_inicio + 1,
        tipo: campo.formato === 'valor_centavos' ? 'valor' : campo.formato?.includes('data') ? 'data' : 'alfanumerico',
        destino: campo.campo_destino,
        valor: '(configurado)',
        confianca: 100,
        tipoLinha: tipoLinha,
        cor: campo.cor || CORES_CAMPOS[index % CORES_CAMPOS.length]
    };
}

// --- COMPONENTE PRINCIPAL ---

export default function ConfiguracaoCNAB() {
  const { toast } = useToast();
  
  // Lista principal
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoCNAB[]>([]);
  
  // Estado de Edição
  const [configSelecionada, setConfigSelecionada] = useState<ConfiguracaoCNAB | null>(null);
  const [novaConfig, setNovaConfig] = useState(false);
  
  // Form State
  const [bancoId, setBancoId] = useState('');
  const [tipoCnab, setTipoCnab] = useState<'CNAB_240' | 'CNAB_400'>('CNAB_400');
  const [nomeConfig, setNomeConfig] = useState('');
  const [descricao, setDescricao] = useState('');
  
  // Editor State (campos sendo editados visualmente)
  const [camposDetectados, setCamposDetectados] = useState<CampoDetectado[]>([]);
  const [segmentoAtual, setSegmentoAtual] = useState<string>('header_arquivo');
  const [campoFocado, setCampoFocado] = useState<string | null>(null);
  
  // Visualizer State
  const [conteudoRemessa, setConteudoRemessa] = useState<string>('');
  const [arquivoTeste, setArquivoTeste] = useState<File | null>(null);

  // Carregar padrões ao montar
  useEffect(() => {
    const salvos = JSON.parse(localStorage.getItem('padroesCNAB') || '[]');
    setConfiguracoes(salvos);
  }, []);

  // --- ACTIONS ---

  const handleNovaConfig = () => {
    setNovaConfig(true);
    setConfigSelecionada(null);
    setBancoId('');
    setTipoCnab('CNAB_400');
    setNomeConfig('');
    setDescricao('');
    setCamposDetectados([]);
    setConteudoRemessa('');
    setSegmentoAtual('header_arquivo');
  };

  const handleEditarConfig = (config: ConfiguracaoCNAB) => {
    setNovaConfig(false);
    setConfigSelecionada(config);
    setBancoId(config.banco_id);
    setTipoCnab(config.tipo_cnab);
    setNomeConfig(config.nome);
    setDescricao(config.descricao || '');
    
    // Converter campos salvos para o formato do editor
    const camposEditaveis = config.campos.map((c, i) => converterParaCampoDetectado(c, i));
    setCamposDetectados(camposEditaveis);
    
    setConteudoRemessa(''); // Resetar visualizador ao abrir nova config
    setSegmentoAtual('header_arquivo');
  };

  const handleVoltar = () => {
    setNovaConfig(false);
    setConfigSelecionada(null);
  };

  const handleArquivoTeste = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setArquivoTeste(file);
        const texto = await file.text();
        setConteudoRemessa(texto);
        toast({ title: 'Arquivo de teste carregado', description: file.name });
    }
  };

  const handleSalvar = () => {
    if (!bancoId || !nomeConfig) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o banco e o nome do padrão.',
        variant: 'destructive'
      });
      return;
    }

    if (camposDetectados.length === 0) {
        toast({
            title: 'Atenção',
            description: 'Você está salvando um padrão sem campos mapeados.',
            variant: 'warning'
        });
    }

    // Converter CampoDetectado -> CampoCNAB
    const camposFinais: CampoCNAB[] = camposDetectados.map((c, index) => ({
        id: c.id,
        nome: c.nome,
        campo_destino: mapDestino(c.destino),
        posicao_inicio: c.posicaoInicio,
        posicao_fim: c.posicaoFim,
        tipo_registro: mapTipoLinhaParaCodigoRegistro(c.tipoLinha as TipoLinha, tipoCnab),
        formato: c.tipo === 'valor' ? 'valor_centavos' : c.tipo === 'data' ? 'data_ddmmaa' : 'texto',
        tipo_linha: c.tipoLinha as TipoLinhaCNAB,
        cor: c.cor
    }));

    const config: ConfiguracaoCNAB = {
      id: configSelecionada?.id || `config_${Date.now()}`,
      banco_id: bancoId,
      tipo_cnab: tipoCnab,
      nome: nomeConfig,
      descricao,
      campos: camposFinais,
      criado_em: configSelecionada?.criado_em || new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    };

    let novasConfigs;
    if (configSelecionada) {
      novasConfigs = configuracoes.map(c => c.id === config.id ? config : c);
    } else {
      novasConfigs = [...configuracoes, config];
    }

    setConfiguracoes(novasConfigs);
    localStorage.setItem('padroesCNAB', JSON.stringify(novasConfigs));

    toast({
      title: 'Configuração salva',
      description: `Padrão "${nomeConfig}" salvo com sucesso.`,
    });

    handleVoltar();
  };

  const handleExcluir = (id: string) => {
    const novasConfigs = configuracoes.filter(c => c.id !== id);
    setConfiguracoes(novasConfigs);
    localStorage.setItem('padroesCNAB', JSON.stringify(novasConfigs));
    handleVoltar();
    toast({
      title: 'Configuração excluída',
      description: 'O padrão CNAB foi removido.',
    });
  };

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

  const handleRemoveCampo = (id: string) => {
      setCamposDetectados(prev => prev.filter(c => c.id !== id));
  };

  const handleAddCampo = () => {
      const novoId = String(Date.now());
      const novoCampo: CampoDetectado = {
          id: novoId,
          nome: 'Novo Campo',
          posicaoInicio: 1,
          posicaoFim: 10,
          tamanho: 10,
          tipo: 'alfanumerico',
          destino: '',
          valor: '',
          confianca: 100,
          tipoLinha: segmentoAtual as TipoLinha,
          cor: CORES_CAMPOS[camposDetectados.length % CORES_CAMPOS.length]
      };
      setCamposDetectados([...camposDetectados, novoCampo]);
      // Scroll para o novo campo?
      setTimeout(() => {
          const el = document.getElementById(`field-row-${novoId}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
  };

  // --- MEMOS ---

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
      if (!grupos[tipo]) grupos[tipo] = []; // Fallback se tipo desconhecido
      grupos[tipo]?.push(campo);
    });

    return grupos;
  }, [camposDetectados]);

  // Visualização da linha
  const linhaVisualizacao = useMemo(() => {
    const tamanho = tipoCnab === 'CNAB_240' ? 240 : 400;

    // Tentar pegar linha real do arquivo se existir
    if (conteudoRemessa) {
        const linhas = conteudoRemessa.split('\n');
        let linhaReal = '';
        
        if (segmentoAtual === 'header_arquivo') {
            linhaReal = linhas.find(l => {
              if (tipoCnab === 'CNAB_240') return l.length >= 8 && l[7] === '0';
              return l.length >= 1 && l[0] === '0';
            }) || '';
        } else if (segmentoAtual === 'header_lote') {
            linhaReal = linhas.find(l => {
              if (tipoCnab === 'CNAB_240') return l.length >= 8 && l[7] === '1';
              return false;
            }) || '';
        } else if (segmentoAtual.startsWith('detalhe')) {
            if (tipoCnab === 'CNAB_240') {
               if (segmentoAtual.includes('segmento')) {
                   const segLetra = segmentoAtual.split('_').pop()?.toUpperCase();
                   linhaReal = linhas.find(l => l.length >= 14 && l[7] === '3' && l[13] === segLetra) || '';
               } else {
                   linhaReal = linhas.find(l => l.length >= 8 && l[7] === '3') || '';
               }
            } else {
               linhaReal = linhas.find(l => l.length >= 1 && l[0] === '1') || '';
            }
        } else if (segmentoAtual === 'trailer_lote') {
            linhaReal = linhas.find(l => {
              if (tipoCnab === 'CNAB_240') return l.length >= 8 && l[7] === '5';
              return false;
            }) || '';
        } else if (segmentoAtual === 'trailer_arquivo') {
            linhaReal = linhas.find(l => {
               if (tipoCnab === 'CNAB_240') return l.length >= 8 && l[7] === '9';
               return l.length >= 1 && l[0] === '9';
            }) || '';
        }

        if (linhaReal) {
            return linhaReal.padEnd(tamanho, ' ').substring(0, tamanho).split('');
        }
    }

    // Se não tiver arquivo, mostra representação visual dos campos
    let linha = Array(tamanho).fill(' ');
    const camposDoSegmento = camposPorSegmento[segmentoAtual] || [];
    
    camposDoSegmento.forEach(campo => {
      const inicio = campo.posicaoInicio - 1;
      const valor = campo.tipo === 'numerico' ? '9'.repeat(campo.tamanho) : 'X'.repeat(campo.tamanho);
      for (let i = 0; i < campo.tamanho; i++) {
        if (inicio + i < tamanho) {
          linha[inicio + i] = valor[i];
        }
      }
    });

    return linha;
  }, [camposPorSegmento, segmentoAtual, tipoCnab, conteudoRemessa]);

  // Handle text selection
  const handleVisualizerSelection = () => {
     const selection = window.getSelection();
     if (!selection || selection.rangeCount === 0) return;
     
     const range = selection.getRangeAt(0);
     const container = document.getElementById('visualizer-content');
     
     if (container && container.contains(range.commonAncestorContainer)) {
        let startNode = range.startContainer;
        if (startNode.nodeType === 3) startNode = startNode.parentNode as Node;
        
        if (startNode instanceof HTMLElement && startNode.hasAttribute('data-pos')) {
           const pos = parseInt(startNode.getAttribute('data-pos') || '0');
           const campo = (camposPorSegmento[segmentoAtual] || []).find(c => pos >= c.posicaoInicio && pos <= c.posicaoFim);
           
           if (campo) {
              setCampoFocado(campo.id);
              const fieldElement = document.getElementById(`field-row-${campo.id}`);
              fieldElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
           }
        }
     }
  };

  const getBancoNome = (id: string) => BANCOS_SUPORTADOS.find(b => b.id === id)?.nome_banco || 'Desconhecido';

  // --- RENDER ---

  if (!novaConfig && !configSelecionada) {
    // LIST VIEW
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Padrões CNAB</h1>
              <p className="text-muted-foreground">Gerencie os layouts de arquivos CNAB</p>
            </div>
            <Button onClick={handleNovaConfig} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Padrão
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configuracoes.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <p className="text-muted-foreground mt-4">Nenhum padrão configurado.</p>
                </div>
            ) : (
                configuracoes.map(config => (
                    <Card 
                        key={config.id} 
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => handleEditarConfig(config)}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg truncate pr-2">{config.nome}</CardTitle>
                                <Badge variant="outline">{config.tipo_cnab.replace('_', ' ')}</Badge>
                            </div>
                            <CardDescription className="text-xs">{getBancoNome(config.banco_id)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                {config.descricao || 'Sem descrição'}
                            </p>
                            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
                                <Settings2 className="h-3 w-3" />
                                {config.campos.length} campos mapeados
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  // EDITOR VIEW
  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
        
        {/* Header Editor */}
        <div className="flex items-center justify-between bg-background z-10 py-2 border-b">
           <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={handleVoltar}>
                   <ArrowLeft className="h-5 w-5" />
               </Button>
               <div>
                   <h1 className="text-xl font-bold">{novaConfig ? 'Novo Padrão' : 'Editar Padrão'}</h1>
                   <p className="text-xs text-muted-foreground">
                       {novaConfig ? 'Defina as configurações do novo layout' : `Editando: ${configSelecionada?.nome}`}
                   </p>
               </div>
           </div>
           <div className="flex gap-2">
               {configSelecionada && (
                   <Button variant="destructive" size="sm" onClick={() => handleExcluir(configSelecionada.id)}>
                       <Trash2 className="h-4 w-4 mr-2" /> Excluir
                   </Button>
               )}
               <Button onClick={handleSalvar} size="sm">
                   <Save className="h-4 w-4 mr-2" /> Salvar
               </Button>
           </div>
        </div>

        {/* Form Dados Básicos */}
        <Card className="flex-none">
            <CardContent className="py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                    <Label>Banco</Label>
                    <Select value={bancoId} onValueChange={setBancoId}>
                        <SelectTrigger className="h-8 text-sm mt-1">
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            {BANCOS_SUPORTADOS.map(b => (
                                <SelectItem key={b.id} value={b.id}>{b.codigo_banco} - {b.nome_banco}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-1">
                    <Label>Tipo CNAB</Label>
                    <Select value={tipoCnab} onValueChange={(v: any) => setTipoCnab(v)}>
                        <SelectTrigger className="h-8 text-sm mt-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="CNAB_400">CNAB 400</SelectItem>
                            <SelectItem value="CNAB_240">CNAB 240</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-1">
                    <Label>Nome</Label>
                    <Input value={nomeConfig} onChange={e => setNomeConfig(e.target.value)} className="h-8 text-sm mt-1" placeholder="Ex: Padrão Bradesco" />
                </div>
                <div className="md:col-span-1">
                    <Label>Descrição</Label>
                    <Input value={descricao} onChange={e => setDescricao(e.target.value)} className="h-8 text-sm mt-1" placeholder="Opcional" />
                </div>
            </CardContent>
        </Card>

        {/* Split View: Editor + Visualizer */}
        <div className="flex-1 flex flex-col min-h-0 gap-4">
            
            {/* Topo: Lista de Campos */}
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border-2 border-muted">
                <CardHeader className="py-2 border-b bg-muted/20 flex-none">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <CardTitle className="text-sm">Mapeamento de Campos</CardTitle>
                            <Tabs value={segmentoAtual} onValueChange={setSegmentoAtual} className="w-auto">
                                <TabsList className="h-7 bg-background border">
                                    <TabsTrigger value="header_arquivo" className="text-xs h-5 px-2">Header Arq</TabsTrigger>
                                    <TabsTrigger value="header_lote" className="text-xs h-5 px-2" disabled={tipoCnab === 'CNAB_400'}>Header Lote</TabsTrigger>
                                    <TabsTrigger value="detalhe" className="text-xs h-5 px-2">Detalhe</TabsTrigger>
                                    {tipoCnab === 'CNAB_240' && (
                                        <>
                                            <TabsTrigger value="detalhe_segmento_p" className="text-xs h-5 px-2">Seg P</TabsTrigger>
                                            <TabsTrigger value="detalhe_segmento_q" className="text-xs h-5 px-2">Seg Q</TabsTrigger>
                                            <TabsTrigger value="detalhe_segmento_r" className="text-xs h-5 px-2">Seg R</TabsTrigger>
                                        </>
                                    )}
                                    <TabsTrigger value="trailer_lote" className="text-xs h-5 px-2" disabled={tipoCnab === 'CNAB_400'}>Trailer Lote</TabsTrigger>
                                    <TabsTrigger value="trailer_arquivo" className="text-xs h-5 px-2">Trailer Arq</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleAddCampo} className="h-7 text-xs gap-1">
                            <Plus className="h-3 w-3" /> Adicionar Campo
                        </Button>
                    </div>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-y-auto p-2">
                     <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground mb-2 px-2 sticky top-0 bg-background z-10 py-2 border-b">
                         <div className="col-span-1">ID</div>
                         <div className="col-span-3">Nome do Campo</div>
                         <div className="col-span-2">Destino (Sistema)</div>
                         <div className="col-span-1">Início</div>
                         <div className="col-span-1">Fim</div>
                         <div className="col-span-1">Tam.</div>
                         <div className="col-span-2">Formato</div>
                         <div className="col-span-1">Ações</div>
                     </div>

                     {(camposPorSegmento[segmentoAtual] || []).length === 0 ? (
                         <div className="text-center py-8 text-muted-foreground text-sm">
                             Nenhum campo mapeado neste segmento.
                         </div>
                     ) : (
                         (camposPorSegmento[segmentoAtual] || []).map((campo) => (
                            <div 
                                key={campo.id}
                                id={`field-row-${campo.id}`}
                                className={`
                                  grid grid-cols-12 gap-2 items-center p-2 rounded-md border text-xs transition-colors mb-1
                                  ${campoFocado === campo.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}
                                `}
                                onMouseEnter={() => setCampoFocado(campo.id)}
                                onMouseLeave={() => setCampoFocado(null)}
                            >
                                <div className="col-span-1 font-mono text-muted-foreground truncate" title={campo.id}>{campo.id}</div>
                                
                                <div className="col-span-3">
                                    <Input 
                                        value={campo.nome} 
                                        onChange={(e) => handleUpdateCampo(campo.id, { nome: e.target.value })}
                                        className="h-6 text-xs px-2"
                                    />
                                </div>

                                <div className="col-span-2">
                                     <Select value={campo.destino} onValueChange={(v) => handleUpdateCampo(campo.id, { destino: v })}>
                                         <SelectTrigger className="h-6 text-xs px-2">
                                             <SelectValue placeholder="Selecione..." />
                                         </SelectTrigger>
                                         <SelectContent>
                                             {Object.entries(CAMPOS_DESTINO_LABELS).map(([k, v]) => (
                                                 <SelectItem key={k} value={k}>{v}</SelectItem>
                                             ))}
                                         </SelectContent>
                                     </Select>
                                </div>
                                
                                <div className="col-span-1">
                                    <Input 
                                        type="number" 
                                        value={campo.posicaoInicio} 
                                        onChange={(e) => handleUpdateCampo(campo.id, { posicaoInicio: parseInt(e.target.value) || 0 })}
                                        className="h-6 text-xs px-1 text-center"
                                    />
                                </div>
                                
                                <div className="col-span-1">
                                    <Input 
                                        type="number" 
                                        value={campo.posicaoFim} 
                                        onChange={(e) => handleUpdateCampo(campo.id, { posicaoFim: parseInt(e.target.value) || 0 })}
                                        className="h-6 text-xs px-1 text-center"
                                    />
                                </div>
                                
                                <div className="col-span-1 text-center font-mono text-muted-foreground">
                                    {campo.tamanho}
                                </div>
                                
                                <div className="col-span-2">
                                    <Select value={campo.tipo} onValueChange={(v: any) => handleUpdateCampo(campo.id, { tipo: v })}>
                                         <SelectTrigger className="h-6 text-xs px-2">
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
                                
                                <div className="col-span-1 text-center">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveCampo(campo.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                         ))
                     )}
                </CardContent>
            </Card>
            
            {/* Rodapé: Visualizador Fixo */}
            <Card className="flex-none border-primary/20 shadow-lg overflow-hidden border-2">
                <CardHeader className="bg-muted/50 py-2 border-b px-4 flex flex-row items-center justify-between h-10">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" />
                        Visualização ({segmentoAtual})
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <label htmlFor="upload-teste" className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1 bg-background px-2 py-1 rounded border shadow-sm">
                            <Upload className="h-3 w-3" />
                            {conteudoRemessa ? 'Trocar Arquivo' : 'Carregar Arquivo de Teste'}
                        </label>
                        <input id="upload-teste" type="file" className="hidden" accept=".txt,.rem,.ret" onChange={handleArquivoTeste} />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div 
                        id="visualizer-content"
                        className="p-4 bg-[#1e1e1e] text-white font-mono text-xs overflow-x-auto whitespace-nowrap leading-relaxed scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent select-text cursor-text"
                        onMouseUp={handleVisualizerSelection}
                    >
                         <div className="flex min-w-max">
                            {linhaVisualizacao.map((char, i) => {
                                const pos = i + 1;
                                const campoAtivo = (camposPorSegmento[segmentoAtual] || []).find(c => c.id === campoFocado);
                                const isHighlighted = campoAtivo && pos >= campoAtivo.posicaoInicio && pos <= campoAtivo.posicaoFim;
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
                    </div>
                    <div className="bg-muted/50 px-4 py-1 text-[10px] text-muted-foreground flex justify-between">
                         <span>Posições: {tipoCnab === 'CNAB_240' ? '240' : '400'}</span>
                         <span>{campoFocado ? `Campo selecionado: ${(camposPorSegmento[segmentoAtual] || []).find(c => c.id === campoFocado)?.nome}` : 'Selecione um campo ou texto'}</span>
                    </div>
                </CardContent>
            </Card>
            
        </div>
      </div>
    </MainLayout>
  );
}
