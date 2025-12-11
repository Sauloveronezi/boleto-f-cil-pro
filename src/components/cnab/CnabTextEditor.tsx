import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Edit2, Check, X, Eye, FileText, Palette } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export type TipoLinha = 'header' | 'detalhe' | 'trailer' | 'header_lote' | 'trailer_lote';

export interface CampoMapeado {
  id: string;
  nome: string;
  posicaoInicio: number;
  posicaoFim: number;
  tamanho: number;
  tipo: 'numerico' | 'alfanumerico' | 'data' | 'valor';
  destino: string;
  valor: string;
  tipoLinha: TipoLinha;
  cor: string;
  erro?: string;
}

export interface LinhaCNAB {
  numero: number;
  conteudo: string;
  tipoLinha: TipoLinha;
  tipoRegistro: string;
}

interface CnabTextEditorProps {
  conteudo: string;
  campos: CampoMapeado[];
  tipoCNAB: 'CNAB_240' | 'CNAB_400';
  onCamposChange: (campos: CampoMapeado[]) => void;
  onErrosDetectados?: (erros: { campo: string; mensagem: string }[]) => void;
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
  'bg-indigo-200 dark:bg-indigo-900',
  'bg-teal-200 dark:bg-teal-900',
  'bg-lime-200 dark:bg-lime-900',
  'bg-amber-200 dark:bg-amber-900',
];

const TIPOS_LINHA_LABELS: Record<TipoLinha, string> = {
  header: 'Header do Arquivo',
  detalhe: 'Detalhe (Título)',
  trailer: 'Trailer do Arquivo',
  header_lote: 'Header de Lote',
  trailer_lote: 'Trailer de Lote',
};

const detectarTipoLinha = (linha: string, tipoCNAB: 'CNAB_240' | 'CNAB_400'): TipoLinha => {
  const tipoReg = linha.charAt(0);
  
  if (tipoCNAB === 'CNAB_400') {
    if (tipoReg === '0') return 'header';
    if (tipoReg === '1') return 'detalhe';
    if (tipoReg === '9') return 'trailer';
    return 'detalhe';
  } else {
    // CNAB 240
    const segmento = linha.charAt(7);
    if (tipoReg === '0') return 'header';
    if (tipoReg === '1') return 'header_lote';
    if (tipoReg === '3' && (segmento === 'P' || segmento === 'Q' || segmento === 'R')) return 'detalhe';
    if (tipoReg === '5') return 'trailer_lote';
    if (tipoReg === '9') return 'trailer';
    return 'detalhe';
  }
};

export function CnabTextEditor({ conteudo, campos, tipoCNAB, onCamposChange, onErrosDetectados }: CnabTextEditorProps) {
  const [linhasSelecionadas, setLinhasSelecionadas] = useState<number[]>([]);
  const [tipoLinhaFiltro, setTipoLinhaFiltro] = useState<TipoLinha | 'todos'>('todos');
  const [campoEditando, setCampoEditando] = useState<string | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState<'texto' | 'tabela'>('texto');
  const [campoSelecionado, setCampoSelecionado] = useState<string | null>(null);

  // Parse das linhas
  const linhas: LinhaCNAB[] = useMemo(() => {
    return conteudo.split('\n').filter(l => l.trim()).map((linha, index) => ({
      numero: index + 1,
      conteudo: linha,
      tipoLinha: detectarTipoLinha(linha, tipoCNAB),
      tipoRegistro: linha.charAt(0),
    }));
  }, [conteudo, tipoCNAB]);

  // Filtrar linhas por tipo
  const linhasFiltradas = useMemo(() => {
    if (tipoLinhaFiltro === 'todos') return linhas;
    return linhas.filter(l => l.tipoLinha === tipoLinhaFiltro);
  }, [linhas, tipoLinhaFiltro]);

  // Detectar erros nos campos
  const erros = useMemo(() => {
    const listaErros: { campo: string; mensagem: string }[] = [];
    
    for (const campo of campos) {
      // Verificar se posição excede tamanho da linha
      const linhasDoTipo = linhas.filter(l => l.tipoLinha === campo.tipoLinha);
      for (const linha of linhasDoTipo) {
        if (campo.posicaoFim > linha.conteudo.length) {
          listaErros.push({
            campo: campo.nome,
            mensagem: `Posição ${campo.posicaoFim} excede o tamanho da linha (${linha.conteudo.length} chars)`,
          });
          break;
        }
        
        // Verificar tipo de dado
        const valor = linha.conteudo.substring(campo.posicaoInicio - 1, campo.posicaoFim);
        if (campo.tipo === 'numerico' && !/^\d*$/.test(valor.trim())) {
          listaErros.push({
            campo: campo.nome,
            mensagem: `Valor "${valor.trim()}" não é numérico`,
          });
        }
      }
    }
    
    onErrosDetectados?.(listaErros);
    return listaErros;
  }, [campos, linhas, onErrosDetectados]);

  // Atualizar campo
  const atualizarCampo = (id: string, updates: Partial<CampoMapeado>) => {
    const novosCampos = campos.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    onCamposChange(novosCampos);
  };

  // Adicionar novo campo
  const adicionarCampo = (tipoLinha: TipoLinha) => {
    const novoCampo: CampoMapeado = {
      id: `campo_${Date.now()}`,
      nome: 'Novo Campo',
      posicaoInicio: 1,
      posicaoFim: 10,
      tamanho: 10,
      tipo: 'alfanumerico',
      destino: 'custom',
      valor: '',
      tipoLinha,
      cor: CORES_CAMPOS[campos.length % CORES_CAMPOS.length],
    };
    onCamposChange([...campos, novoCampo]);
    setCampoEditando(novoCampo.id);
  };

  // Remover campo
  const removerCampo = (id: string) => {
    onCamposChange(campos.filter(c => c.id !== id));
  };

  // Renderizar linha com destaque colorido
  const renderizarLinhaColorida = (linha: LinhaCNAB) => {
    const camposLinha = campos.filter(c => c.tipoLinha === linha.tipoLinha);
    
    if (camposLinha.length === 0) {
      return <span className="font-mono text-xs">{linha.conteudo}</span>;
    }

    // Criar array de caracteres com suas cores
    const chars: { char: string; cor: string | null; campo: CampoMapeado | null }[] = 
      linha.conteudo.split('').map(char => ({ char, cor: null, campo: null }));

    // Aplicar cores dos campos
    for (const campo of camposLinha) {
      const inicio = campo.posicaoInicio - 1;
      const fim = Math.min(campo.posicaoFim, linha.conteudo.length);
      for (let i = inicio; i < fim; i++) {
        if (chars[i]) {
          chars[i].cor = campo.cor;
          chars[i].campo = campo;
        }
      }
    }

    // Agrupar caracteres consecutivos com mesma cor
    const grupos: { texto: string; cor: string | null; campo: CampoMapeado | null }[] = [];
    let grupoAtual = { texto: '', cor: chars[0]?.cor || null, campo: chars[0]?.campo || null };
    
    for (const c of chars) {
      if (c.cor === grupoAtual.cor) {
        grupoAtual.texto += c.char;
      } else {
        if (grupoAtual.texto) grupos.push(grupoAtual);
        grupoAtual = { texto: c.char, cor: c.cor, campo: c.campo };
      }
    }
    if (grupoAtual.texto) grupos.push(grupoAtual);

    return (
      <span className="font-mono text-xs">
        {grupos.map((g, i) => (
          <TooltipProvider key={i}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span 
                  className={`${g.cor || ''} ${g.campo && campoSelecionado === g.campo.id ? 'ring-2 ring-primary' : ''} cursor-pointer transition-all`}
                  onClick={() => g.campo && setCampoSelecionado(g.campo.id)}
                >
                  {g.texto}
                </span>
              </TooltipTrigger>
              {g.campo && (
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-bold">{g.campo.nome}</p>
                    <p>Posição: {g.campo.posicaoInicio}-{g.campo.posicaoFim}</p>
                    <p>Valor: {g.texto.trim()}</p>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ))}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Filtrar por tipo de linha:</Label>
          <Select value={tipoLinhaFiltro} onValueChange={(v) => setTipoLinhaFiltro(v as TipoLinha | 'todos')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as linhas</SelectItem>
              <SelectItem value="header">Header do Arquivo</SelectItem>
              <SelectItem value="detalhe">Detalhe (Título)</SelectItem>
              <SelectItem value="trailer">Trailer do Arquivo</SelectItem>
              {tipoCNAB === 'CNAB_240' && (
                <>
                  <SelectItem value="header_lote">Header de Lote</SelectItem>
                  <SelectItem value="trailer_lote">Trailer de Lote</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <Tabs value={modoVisualizacao} onValueChange={(v) => setModoVisualizacao(v as 'texto' | 'tabela')}>
          <TabsList>
            <TabsTrigger value="texto" className="gap-2">
              <FileText className="h-4 w-4" />
              Texto
            </TabsTrigger>
            <TabsTrigger value="tabela" className="gap-2">
              <Eye className="h-4 w-4" />
              Campos
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Erros detectados */}
      {erros.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {erros.length} erro(s) detectado(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <ul className="text-xs space-y-1">
              {erros.map((erro, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-[10px]">{erro.campo}</Badge>
                  <span>{erro.mensagem}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Editor de Texto com Cores */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Arquivo CNAB - Visualização Colorida
              </CardTitle>
              <CardDescription className="text-xs">
                Clique em um campo destacado para editar sua configuração
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 bg-muted/30">
                  {linhasFiltradas.map((linha, index) => (
                    <div 
                      key={linha.numero}
                      className={`flex items-start gap-2 py-1 hover:bg-muted/50 ${
                        linhasSelecionadas.includes(linha.numero) ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <span className="text-[10px] text-muted-foreground w-4">{linha.numero}</span>
                        <Badge variant="outline" className="text-[10px] px-1">
                          {linha.tipoRegistro}
                        </Badge>
                        <Badge className="text-[10px] px-1" variant="secondary">
                          {TIPOS_LINHA_LABELS[linha.tipoLinha]?.substring(0, 3)}
                        </Badge>
                      </div>
                      <div className="flex-1 overflow-x-auto whitespace-nowrap">
                        {renderizarLinhaColorida(linha)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Campos por Tipo de Linha */}
        <div>
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Campos Mapeados</CardTitle>
              <CardDescription className="text-xs">
                Edite as posições e tipos de cada campo
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-2 space-y-4">
                  {(['header', 'detalhe', 'trailer'] as TipoLinha[]).map((tipoLinha) => {
                    const camposTipo = campos.filter(c => c.tipoLinha === tipoLinha);
                    if (camposTipo.length === 0 && tipoLinhaFiltro !== 'todos' && tipoLinhaFiltro !== tipoLinha) return null;
                    
                    return (
                      <div key={tipoLinha}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-muted-foreground">
                            {TIPOS_LINHA_LABELS[tipoLinha]}
                          </h4>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 text-xs"
                            onClick={() => adicionarCampo(tipoLinha)}
                          >
                            + Campo
                          </Button>
                        </div>
                        
                        {camposTipo.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Nenhum campo mapeado</p>
                        ) : (
                          <div className="space-y-1">
                            {camposTipo.map((campo) => (
                              <div 
                                key={campo.id}
                                className={`p-2 rounded border text-xs ${
                                  campoSelecionado === campo.id ? 'border-primary bg-primary/5' : 'bg-muted/30'
                                } ${campo.erro ? 'border-destructive' : ''}`}
                                onClick={() => setCampoSelecionado(campo.id)}
                              >
                                {campoEditando === campo.id ? (
                                  <div className="space-y-2">
                                    <Input
                                      value={campo.nome}
                                      onChange={(e) => atualizarCampo(campo.id, { nome: e.target.value })}
                                      className="h-6 text-xs"
                                      placeholder="Nome do campo"
                                    />
                                    <div className="flex gap-1">
                                      <Input
                                        type="number"
                                        value={campo.posicaoInicio}
                                        onChange={(e) => atualizarCampo(campo.id, { 
                                          posicaoInicio: Number(e.target.value),
                                          tamanho: campo.posicaoFim - Number(e.target.value) + 1
                                        })}
                                        className="h-6 text-xs w-16"
                                        placeholder="Início"
                                      />
                                      <Input
                                        type="number"
                                        value={campo.posicaoFim}
                                        onChange={(e) => atualizarCampo(campo.id, { 
                                          posicaoFim: Number(e.target.value),
                                          tamanho: Number(e.target.value) - campo.posicaoInicio + 1
                                        })}
                                        className="h-6 text-xs w-16"
                                        placeholder="Fim"
                                      />
                                    </div>
                                    <Select 
                                      value={campo.tipo} 
                                      onValueChange={(v) => atualizarCampo(campo.id, { tipo: v as any })}
                                    >
                                      <SelectTrigger className="h-6 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="numerico">Numérico</SelectItem>
                                        <SelectItem value="alfanumerico">Alfanumérico</SelectItem>
                                        <SelectItem value="data">Data</SelectItem>
                                        <SelectItem value="valor">Valor</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <div className="flex justify-end gap-1">
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setCampoEditando(null)}>
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removerCampo(campo.id)}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded ${campo.cor}`} />
                                      <div>
                                        <p className="font-medium">{campo.nome}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {campo.posicaoInicio}-{campo.posicaoFim} ({campo.tamanho})
                                        </p>
                                      </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => {
                                      e.stopPropagation();
                                      setCampoEditando(campo.id);
                                    }}>
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Legenda de Cores */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-xs">Legenda de Campos</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-2">
            {campos.map((campo) => (
              <div 
                key={campo.id} 
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer ${
                  campoSelecionado === campo.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setCampoSelecionado(campo.id)}
              >
                <div className={`w-3 h-3 rounded ${campo.cor}`} />
                <span>{campo.nome}</span>
                <Badge variant="outline" className="text-[10px] ml-1">
                  {campo.posicaoInicio}-{campo.posicaoFim}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
