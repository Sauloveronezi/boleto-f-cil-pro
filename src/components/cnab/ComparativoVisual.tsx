import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { FileText, Receipt, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { LinhaCNAB, TipoRegistroCNAB, CampoCNABCompleto } from '@/types/boleto';
import { LABELS_TIPO_LINHA, CORES_TIPO_LINHA, identificarTipoLinha } from '@/types/cnab';

interface ComparativoVisualProps {
  conteudoRemessa: string;
  linhasConfig: LinhaCNAB[];
  tipoCNAB: 'CNAB_240' | 'CNAB_400';
  dadosExtraidos: Record<string, string>;
  onCampoClick?: (campo: CampoCNABCompleto) => void;
}

interface LinhaArquivo {
  numero: number;
  conteudo: string;
  tipo: TipoRegistroCNAB;
}

export function ComparativoVisual({
  conteudoRemessa,
  linhasConfig,
  tipoCNAB,
  dadosExtraidos,
  onCampoClick,
}: ComparativoVisualProps) {
  const [mostrarNaoUtilizados, setMostrarNaoUtilizados] = useState(true);
  const [tipoLinhaFiltro, setTipoLinhaFiltro] = useState<TipoRegistroCNAB | 'todos'>('todos');
  const [campoSelecionado, setCampoSelecionado] = useState<string | null>(null);

  // Parse das linhas do arquivo
  const linhasArquivo: LinhaArquivo[] = useMemo(() => {
    return conteudoRemessa.split('\n').filter(l => l.trim()).map((linha, index) => ({
      numero: index + 1,
      conteudo: linha,
      tipo: identificarTipoLinha(linha, tipoCNAB),
    }));
  }, [conteudoRemessa, tipoCNAB]);

  // Filtrar linhas por tipo
  const linhasFiltradas = useMemo(() => {
    if (tipoLinhaFiltro === 'todos') return linhasArquivo;
    return linhasArquivo.filter(l => l.tipo === tipoLinhaFiltro);
  }, [linhasArquivo, tipoLinhaFiltro]);

  // Obter campos para um tipo de linha
  const getCamposParaTipo = (tipo: TipoRegistroCNAB): CampoCNABCompleto[] => {
    const linhaConfig = linhasConfig.find(l => l.tipo === tipo);
    if (!linhaConfig) return [];
    
    if (mostrarNaoUtilizados) {
      return linhaConfig.campos;
    }
    return linhaConfig.campos.filter(c => c.utilizadoNoBoleto);
  };

  // Renderizar linha com campos coloridos
  const renderizarLinhaColorida = (linha: LinhaArquivo) => {
    const campos = getCamposParaTipo(linha.tipo);
    
    if (campos.length === 0) {
      return <span className="font-mono text-xs text-muted-foreground">{linha.conteudo}</span>;
    }

    // Criar array de caracteres com suas cores
    const chars: { char: string; cor: string | null; campo: CampoCNABCompleto | null }[] = 
      linha.conteudo.split('').map(char => ({ char, cor: null, campo: null }));

    // Aplicar cores dos campos
    for (const campo of campos) {
      const inicio = campo.posicaoInicio - 1;
      const fim = Math.min(campo.posicaoFim, linha.conteudo.length);
      for (let i = inicio; i < fim; i++) {
        if (chars[i]) {
          chars[i].cor = campo.utilizadoNoBoleto ? campo.cor : 'bg-muted/50';
          chars[i].campo = campo;
        }
      }
    }

    // Agrupar caracteres consecutivos com mesma cor
    const grupos: { texto: string; cor: string | null; campo: CampoCNABCompleto | null }[] = [];
    let grupoAtual = { texto: '', cor: chars[0]?.cor || null, campo: chars[0]?.campo || null };
    
    for (const c of chars) {
      if (c.cor === grupoAtual.cor && c.campo?.id === grupoAtual.campo?.id) {
        grupoAtual.texto += c.char;
      } else {
        if (grupoAtual.texto) grupos.push(grupoAtual);
        grupoAtual = { texto: c.char, cor: c.cor, campo: c.campo };
      }
    }
    if (grupoAtual.texto) grupos.push(grupoAtual);

    return (
      <TooltipProvider>
        <span className="font-mono text-xs">
          {grupos.map((g, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span 
                  className={`${g.cor || ''} ${g.campo && campoSelecionado === g.campo.id ? 'ring-2 ring-primary' : ''} ${g.campo?.utilizadoNoBoleto ? '' : 'opacity-40'} cursor-pointer transition-all`}
                  onClick={() => {
                    if (g.campo) {
                      setCampoSelecionado(g.campo.id);
                      onCampoClick?.(g.campo);
                    }
                  }}
                >
                  {g.texto}
                </span>
              </TooltipTrigger>
              {g.campo && (
                <TooltipContent side="top" className="max-w-xs">
                  <div className="text-xs space-y-1">
                    <p className="font-bold">{g.campo.nome}</p>
                    <p className="text-muted-foreground">Posição: {g.campo.posicaoInicio}-{g.campo.posicaoFim}</p>
                    {g.campo.campoDestino && (
                      <p className="text-primary">→ {g.campo.campoDestino}</p>
                    )}
                    <p className="border-t pt-1 mt-1">Valor: {g.texto.trim() || '(vazio)'}</p>
                    {!g.campo.utilizadoNoBoleto && (
                      <Badge variant="outline" className="text-[10px]">Não utilizado no boleto</Badge>
                    )}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </span>
      </TooltipProvider>
    );
  };

  // Campos utilizados no boleto (para legenda)
  const camposUtilizados = useMemo(() => {
    return linhasConfig.flatMap(l => l.campos.filter(c => c.utilizadoNoBoleto));
  }, [linhasConfig]);

  // Tipos de linha únicos disponíveis
  const tiposDisponiveis = useMemo(() => {
    const tipos = new Set(linhasArquivo.map(l => l.tipo));
    return Array.from(tipos);
  }, [linhasArquivo]);

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="mostrar-nao-utilizados"
              checked={mostrarNaoUtilizados}
              onCheckedChange={setMostrarNaoUtilizados}
            />
            <Label htmlFor="mostrar-nao-utilizados" className="text-sm">
              {mostrarNaoUtilizados ? (
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> Mostrar todos os campos</span>
              ) : (
                <span className="flex items-center gap-1"><EyeOff className="h-4 w-4" /> Apenas campos do boleto</span>
              )}
            </Label>
          </div>
        </div>

        <Tabs value={tipoLinhaFiltro} onValueChange={(v) => setTipoLinhaFiltro(v as TipoRegistroCNAB | 'todos')}>
          <TabsList className="h-8">
            <TabsTrigger value="todos" className="text-xs px-2 h-6">Todas</TabsTrigger>
            {tiposDisponiveis.map(tipo => (
              <TabsTrigger key={tipo} value={tipo} className="text-xs px-2 h-6">
                {LABELS_TIPO_LINHA[tipo]?.substring(0, 10) || tipo}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Lado esquerdo: Arquivo TXT */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Arquivo de Remessa CNAB
            </CardTitle>
            <CardDescription className="text-xs">
              Campos coloridos indicam dados mapeados para o boleto
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="p-2 bg-muted/20 space-y-0.5">
                {linhasFiltradas.map((linha) => (
                  <div 
                    key={linha.numero}
                    className={`flex items-start gap-2 py-0.5 px-1 rounded hover:bg-muted/50 border-l-2 ${CORES_TIPO_LINHA[linha.tipo] || ''}`}
                  >
                    <div className="flex items-center gap-1 min-w-[70px] shrink-0">
                      <span className="text-[10px] text-muted-foreground w-4">{linha.numero}</span>
                      <Badge variant="outline" className="text-[9px] px-1 h-4">
                        {linha.tipo.includes('segmento') ? linha.tipo.split('_').pop()?.toUpperCase() : linha.tipo.charAt(0).toUpperCase()}
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

        {/* Lado direito: Legenda e Preview */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Mapeamento CNAB → Boleto
            </CardTitle>
            <CardDescription className="text-xs">
              Campos extraídos e seus valores no boleto
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="p-3 space-y-4">
                {/* Legenda de campos utilizados */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                    Campos utilizados no boleto ({camposUtilizados.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {camposUtilizados.map((campo) => (
                      <div 
                        key={campo.id}
                        className={`flex items-center justify-between p-2 rounded text-xs border ${
                          campoSelecionado === campo.id ? 'border-primary bg-primary/5' : 'bg-muted/30'
                        }`}
                        onClick={() => setCampoSelecionado(campo.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${campo.cor}`} />
                          <span className="font-medium">{campo.nome}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="secondary" className="text-[10px]">
                            {campo.campoDestino}
                          </Badge>
                        </div>
                        <div className="text-right text-muted-foreground">
                          <span className="text-[10px]">pos. {campo.posicaoInicio}-{campo.posicaoFim}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Valores extraídos */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                    Valores extraídos do arquivo
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(dadosExtraidos).map(([campo, valor]) => (
                      <div key={campo} className="p-2 bg-muted/30 rounded">
                        <p className="text-[10px] text-muted-foreground">{campo}</p>
                        <p className="text-xs font-medium truncate" title={valor}>
                          {valor || '(vazio)'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
