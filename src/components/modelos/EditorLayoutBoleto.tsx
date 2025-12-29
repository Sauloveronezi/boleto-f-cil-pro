import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Move, Plus, Trash2, Save, ZoomIn, ZoomOut, RotateCcw, 
  Type, Minus, Square, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, ChevronDown, Settings2, Copy, Layers, Eye, EyeOff,
  ArrowUp, ArrowDown, GripVertical, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { renderPDFToImage, PAGE_FORMATS, PageFormatKey } from '@/lib/pdfAnalyzer';

// Tipos de elementos do layout
export type TipoElemento = 'campo' | 'texto' | 'linha' | 'retangulo';

export interface ElementoLayout {
  id: string;
  tipo: TipoElemento;
  nome: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  variavel?: string;
  textoFixo?: string;
  fonte?: string;
  tamanhoFonte?: number;
  negrito?: boolean;
  italico?: boolean;
  alinhamento?: 'left' | 'center' | 'right';
  corTexto?: string;
  corFundo?: string;
  bordaSuperior?: boolean;
  bordaInferior?: boolean;
  bordaEsquerda?: boolean;
  bordaDireita?: boolean;
  espessuraBorda?: number;
  corBorda?: string;
  visivel?: boolean;
  bloqueado?: boolean;
  ordem?: number;
}

interface EditorLayoutBoletoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementos: ElementoLayout[];
  onSave: (elementos: ElementoLayout[]) => void;
  nomeModelo: string;
  larguraPagina?: number;
  alturaPagina?: number;
  pdfBase64?: string;
  iniciarVazio?: boolean;
}

const VARIAVEIS_BOLETO = [
  { variavel: '{{banco_nome}}', label: 'Nome do Banco', categoria: 'banco' },
  { variavel: '{{banco_codigo}}', label: 'Código do Banco', categoria: 'banco' },
  { variavel: '{{banco_logo}}', label: 'Logo do Banco', categoria: 'banco' },
  { variavel: '{{agencia}}', label: 'Agência', categoria: 'banco' },
  { variavel: '{{conta}}', label: 'Conta', categoria: 'banco' },
  { variavel: '{{digito_agencia}}', label: 'Dígito Agência', categoria: 'banco' },
  { variavel: '{{digito_conta}}', label: 'Dígito Conta', categoria: 'banco' },
  { variavel: '{{beneficiario_nome}}', label: 'Nome Beneficiário', categoria: 'beneficiario' },
  { variavel: '{{beneficiario_cnpj}}', label: 'CNPJ Beneficiário', categoria: 'beneficiario' },
  { variavel: '{{beneficiario_endereco}}', label: 'Endereço Beneficiário', categoria: 'beneficiario' },
  { variavel: '{{beneficiario_cidade}}', label: 'Cidade Beneficiário', categoria: 'beneficiario' },
  { variavel: '{{pagador_nome}}', label: 'Nome Pagador', categoria: 'pagador' },
  { variavel: '{{pagador_cnpj}}', label: 'CNPJ/CPF Pagador', categoria: 'pagador' },
  { variavel: '{{pagador_endereco}}', label: 'Endereço Pagador', categoria: 'pagador' },
  { variavel: '{{pagador_cidade_uf}}', label: 'Cidade/UF Pagador', categoria: 'pagador' },
  { variavel: '{{pagador_cep}}', label: 'CEP Pagador', categoria: 'pagador' },
  { variavel: '{{nosso_numero}}', label: 'Nosso Número', categoria: 'titulo' },
  { variavel: '{{numero_documento}}', label: 'Nº Documento', categoria: 'titulo' },
  { variavel: '{{data_documento}}', label: 'Data Documento', categoria: 'titulo' },
  { variavel: '{{data_vencimento}}', label: 'Data Vencimento', categoria: 'titulo' },
  { variavel: '{{data_processamento}}', label: 'Data Processamento', categoria: 'titulo' },
  { variavel: '{{valor_documento}}', label: 'Valor Documento', categoria: 'titulo' },
  { variavel: '{{valor_cobrado}}', label: 'Valor Cobrado', categoria: 'titulo' },
  { variavel: '{{especie_documento}}', label: 'Espécie Doc', categoria: 'titulo' },
  { variavel: '{{aceite}}', label: 'Aceite', categoria: 'titulo' },
  { variavel: '{{carteira}}', label: 'Carteira', categoria: 'titulo' },
  { variavel: '{{especie_moeda}}', label: 'Espécie Moeda', categoria: 'titulo' },
  { variavel: '{{quantidade}}', label: 'Quantidade', categoria: 'titulo' },
  { variavel: '{{valor_moeda}}', label: 'Valor Moeda', categoria: 'titulo' },
  { variavel: '{{local_pagamento}}', label: 'Local de Pagamento', categoria: 'outros' },
  { variavel: '{{linha_digitavel}}', label: 'Linha Digitável', categoria: 'codigo' },
  { variavel: '{{codigo_barras}}', label: 'Código de Barras', categoria: 'codigo' },
  { variavel: '{{instrucoes}}', label: 'Instruções', categoria: 'outros' },
];

const CATEGORIAS = [
  { id: 'banco', label: 'Banco', cor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { id: 'beneficiario', label: 'Beneficiário', cor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { id: 'pagador', label: 'Pagador', cor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { id: 'titulo', label: 'Título', cor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { id: 'codigo', label: 'Códigos', cor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { id: 'outros', label: 'Outros', cor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
];

const FONTES = [
  { value: 'helvetica', label: 'Helvetica' },
  { value: 'times', label: 'Times New Roman' },
  { value: 'courier', label: 'Courier' },
  { value: 'arial', label: 'Arial' },
];

// Scale: 1mm = 2px in editor
const ESCALA = 2;

export function EditorLayoutBoleto({ 
  open, 
  onOpenChange, 
  elementos: elementosIniciais, 
  onSave, 
  nomeModelo,
  larguraPagina: larguraPaginaInicial,
  alturaPagina: alturaPaginaInicial,
  pdfBase64,
  iniciarVazio = false,
}: EditorLayoutBoletoProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Page format state
  const [formatoPagina, setFormatoPagina] = useState<PageFormatKey>('A4');
  const [larguraPagina, setLarguraPagina] = useState(larguraPaginaInicial || PAGE_FORMATS.A4.larguraMm);
  const [alturaPagina, setAlturaPagina] = useState(alturaPaginaInicial || PAGE_FORMATS.A4.alturaMm);
  
  // Elements state
  const [elementos, setElementos] = useState<ElementoLayout[]>([]);
  const [elementoSelecionado, setElementoSelecionado] = useState<string | null>(null);
  
  // Canvas state
  const [zoom, setZoom] = useState(1);
  const [mostrarGrade, setMostrarGrade] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [tamanhoGrid, setTamanhoGrid] = useState(5);
  const [abaSelecionada, setAbaSelecionada] = useState<'campos' | 'textos' | 'linhas'>('campos');
  
  // Drag state - stored in refs to avoid stale closures
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const resizeHandleRef = useRef<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, elemX: 0, elemY: 0, elemW: 0, elemH: 0 });
  const selectedIdRef = useRef<string | null>(null);
  
  // PDF background as image
  const [pdfImageUrl, setPdfImageUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const larguraCanvas = larguraPagina * ESCALA;
  const alturaCanvas = alturaPagina * ESCALA;

  // Load PDF as image when pdfBase64 changes
  useEffect(() => {
    if (pdfBase64 && open) {
      setLoadingPdf(true);
      renderPDFToImage(pdfBase64, 2)
        .then(({ dataUrl }) => {
          setPdfImageUrl(dataUrl);
        })
        .catch((err) => {
          console.error('Error rendering PDF:', err);
          setPdfImageUrl(null);
        })
        .finally(() => {
          setLoadingPdf(false);
        });
    } else {
      setPdfImageUrl(null);
    }
  }, [pdfBase64, open]);

  // Initialize elements when dialog opens
  useEffect(() => {
    if (open) {
      if (elementosIniciais.length > 0) {
        setElementos(elementosIniciais.map((e, i) => ({ 
          ...e, 
          ordem: e.ordem ?? i, 
          visivel: e.visivel ?? true 
        })));
      } else if (iniciarVazio) {
        // When importing PDF, start empty
        setElementos([]);
      } else {
        // New model without PDF - start empty (no default layout)
        setElementos([]);
      }
      setElementoSelecionado(null);
      
      // Set page dimensions
      if (larguraPaginaInicial && alturaPaginaInicial) {
        setLarguraPagina(larguraPaginaInicial);
        setAlturaPagina(alturaPaginaInicial);
        setFormatoPagina('CUSTOM');
      }
    }
  }, [open, elementosIniciais, iniciarVazio, larguraPaginaInicial, alturaPaginaInicial]);

  // Keep ref in sync with state
  useEffect(() => {
    selectedIdRef.current = elementoSelecionado;
  }, [elementoSelecionado]);

  const snapValue = (value: number): number => {
    if (!snapToGrid) return value;
    return Math.round(value / tamanhoGrid) * tamanhoGrid;
  };

  const handleFormatoChange = (formato: PageFormatKey) => {
    setFormatoPagina(formato);
    if (formato !== 'CUSTOM') {
      setLarguraPagina(PAGE_FORMATS[formato].larguraMm);
      setAlturaPagina(PAGE_FORMATS[formato].alturaMm);
    }
  };

  const adicionarElemento = (tipo: TipoElemento, config?: Partial<ElementoLayout>) => {
    const id = `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Position new element in visible area
    const centerX = Math.min(100, larguraCanvas / 2 - 60);
    const centerY = Math.min(50, alturaCanvas / 2 - 10);
    
    const novoElemento: ElementoLayout = {
      id,
      tipo,
      nome: config?.nome || `Novo ${tipo}`,
      x: snapValue(centerX + elementos.length * 10),
      y: snapValue(centerY + elementos.length * 10),
      largura: tipo === 'linha' ? 200 : (tipo === 'retangulo' ? 100 : 120),
      altura: tipo === 'linha' ? 2 : (tipo === 'retangulo' ? 50 : 20),
      tamanhoFonte: 10,
      alinhamento: 'left',
      corTexto: '#000000',
      corFundo: tipo === 'linha' || tipo === 'retangulo' ? '#000000' : 'transparent',
      visivel: true,
      ordem: elementos.length,
      ...config,
    };
    
    setElementos(prev => {
      const updated = [...prev, novoElemento];
      console.log('[Editor] Elemento adicionado:', novoElemento.nome, 'Total:', updated.length);
      return updated;
    });
    setElementoSelecionado(id);
    
    toast({
      title: 'Elemento adicionado',
      description: `${novoElemento.nome} foi adicionado ao layout.`,
    });
  };

  const adicionarCampo = (variavel: string, label: string) => {
    const jaExiste = elementos.some(e => e.variavel === variavel);
    if (jaExiste) {
      toast({
        title: 'Campo já existe',
        description: 'Este campo já foi adicionado ao layout.',
        variant: 'destructive',
      });
      return;
    }
    adicionarElemento('campo', { nome: label, variavel });
  };

  const adicionarTexto = () => {
    adicionarElemento('texto', { 
      nome: 'Novo Texto', 
      textoFixo: 'Texto aqui',
      tamanhoFonte: 10,
    });
  };

  const adicionarLinha = (orientacao: 'horizontal' | 'vertical' = 'horizontal') => {
    adicionarElemento('linha', {
      nome: orientacao === 'horizontal' ? 'Linha Horizontal' : 'Linha Vertical',
      largura: orientacao === 'horizontal' ? 200 : 2,
      altura: orientacao === 'horizontal' ? 2 : 100,
      corFundo: '#000000',
    });
  };

  const adicionarRetangulo = () => {
    adicionarElemento('retangulo', {
      nome: 'Retângulo',
      largura: 100,
      altura: 50,
      corFundo: 'transparent',
      bordaSuperior: true,
      bordaInferior: true,
      bordaEsquerda: true,
      bordaDireita: true,
      espessuraBorda: 1,
      corBorda: '#000000',
    });
  };

  const removerElemento = (id: string) => {
    setElementos(prev => prev.filter(e => e.id !== id));
    if (elementoSelecionado === id) {
      setElementoSelecionado(null);
    }
  };

  const duplicarElemento = (id: string) => {
    const elemento = elementos.find(e => e.id === id);
    if (!elemento) return;
    
    const novoId = `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const novoElemento: ElementoLayout = {
      ...elemento,
      id: novoId,
      nome: `${elemento.nome} (cópia)`,
      x: elemento.x + 10,
      y: elemento.y + 10,
      ordem: elementos.length,
    };
    
    setElementos(prev => [...prev, novoElemento]);
    setElementoSelecionado(novoId);
  };

  const atualizarElemento = (id: string, updates: Partial<ElementoLayout>) => {
    setElementos(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  // Global mouse handlers for drag/resize
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const selectedId = selectedIdRef.current;
      if (!selectedId) return;
      
      if (!isDraggingRef.current && !isResizingRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / zoom;
      const mouseY = (e.clientY - rect.top) / zoom;
      
      const startData = dragStartRef.current;
      
      if (isDraggingRef.current) {
        const deltaX = mouseX - startData.x;
        const deltaY = mouseY - startData.y;
        
        let newX = snapValue(startData.elemX + deltaX);
        let newY = snapValue(startData.elemY + deltaY);
        
        // Constrain to canvas
        newX = Math.max(0, Math.min(larguraCanvas - startData.elemW, newX));
        newY = Math.max(0, Math.min(alturaCanvas - startData.elemH, newY));
        
        setElementos(prev => prev.map(el => 
          el.id === selectedId 
            ? { ...el, x: Math.round(newX), y: Math.round(newY) }
            : el
        ));
      } else if (isResizingRef.current && resizeHandleRef.current) {
        const handle = resizeHandleRef.current;
        let updates: Partial<ElementoLayout> = {};
        
        if (handle.includes('e')) {
          updates.largura = snapValue(Math.max(20, mouseX - startData.elemX));
        }
        if (handle.includes('w')) {
          const newWidth = snapValue(Math.max(20, startData.elemX + startData.elemW - mouseX));
          updates.x = snapValue(startData.elemX + startData.elemW - newWidth);
          updates.largura = newWidth;
        }
        if (handle.includes('s')) {
          updates.altura = snapValue(Math.max(10, mouseY - startData.elemY));
        }
        if (handle.includes('n')) {
          const newHeight = snapValue(Math.max(10, startData.elemY + startData.elemH - mouseY));
          updates.y = snapValue(startData.elemY + startData.elemH - newHeight);
          updates.altura = newHeight;
        }
        
        setElementos(prev => prev.map(el => 
          el.id === selectedId ? { ...el, ...updates } : el
        ));
      }
    };
    
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
      resizeHandleRef.current = null;
    };
    
    if (open) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [open, zoom, snapValue, larguraCanvas, alturaCanvas]);

  const handleElementMouseDown = (e: React.MouseEvent, elementoId: string, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const elemento = elementos.find(el => el.id === elementoId);
    if (!elemento || elemento.bloqueado || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;
    
    // Store initial state
    dragStartRef.current = {
      x: mouseX,
      y: mouseY,
      elemX: elemento.x,
      elemY: elemento.y,
      elemW: elemento.largura,
      elemH: elemento.altura,
    };
    
    if (handle) {
      isResizingRef.current = true;
      resizeHandleRef.current = handle;
    } else {
      isDraggingRef.current = true;
    }
    
    setElementoSelecionado(elementoId);
  };

  const handleSave = () => {
    onSave(elementos);
    toast({
      title: 'Layout salvo',
      description: `${elementos.length} elementos salvos no modelo.`,
    });
    onOpenChange(false);
  };

  const elementoAtual = elementos.find(e => e.id === elementoSelecionado);

  const renderElemento = (elemento: ElementoLayout) => {
    if (!elemento.visivel) return null;
    
    const isSelected = elementoSelecionado === elemento.id;
    const baseStyle: React.CSSProperties = {
      left: elemento.x * zoom,
      top: elemento.y * zoom,
      width: elemento.largura * zoom,
      height: elemento.altura * zoom,
      zIndex: isSelected ? 15 : 10,
    };

    const getBorderStyle = () => {
      if (elemento.tipo === 'linha') return {};
      
      const borderWidth = (elemento.espessuraBorda || 1) * zoom;
      const borderColor = elemento.corBorda || '#000000';
      
      return {
        borderTopWidth: elemento.bordaSuperior ? borderWidth : 0,
        borderBottomWidth: elemento.bordaInferior ? borderWidth : 0,
        borderLeftWidth: elemento.bordaEsquerda ? borderWidth : 0,
        borderRightWidth: elemento.bordaDireita ? borderWidth : 0,
        borderColor: borderColor,
        borderStyle: 'solid' as const,
      };
    };

    const getTextStyle = (): React.CSSProperties => ({
      fontSize: (elemento.tamanhoFonte || 10) * zoom,
      fontWeight: elemento.negrito ? 'bold' : 'normal',
      fontStyle: elemento.italico ? 'italic' : 'normal',
      textAlign: elemento.alinhamento || 'left',
      color: elemento.corTexto || '#000000',
      fontFamily: elemento.fonte || 'helvetica, sans-serif',
    });

    const renderResizeHandles = () => {
      if (!isSelected) return null;
      
      const handleSize = 8;
      const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
      
      return handles.map(handle => {
        let style: React.CSSProperties = {
          position: 'absolute',
          width: handleSize,
          height: handleSize,
          backgroundColor: 'hsl(var(--primary))',
          border: '1px solid white',
          zIndex: 25,
        };

        if (handle.includes('n')) style.top = -handleSize / 2;
        if (handle.includes('s')) style.bottom = -handleSize / 2;
        if (handle.includes('e')) style.right = -handleSize / 2;
        if (handle.includes('w')) style.left = -handleSize / 2;
        if (handle === 'n' || handle === 's') { style.left = '50%'; style.transform = 'translateX(-50%)'; }
        if (handle === 'e' || handle === 'w') { style.top = '50%'; style.transform = 'translateY(-50%)'; }

        const cursors: Record<string, string> = {
          n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
          ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize',
        };
        style.cursor = cursors[handle];

        return (
          <div
            key={handle}
            style={style}
            onMouseDown={(e) => handleElementMouseDown(e, elemento.id, handle)}
          />
        );
      });
    };

    if (elemento.tipo === 'linha') {
      return (
        <div
          key={elemento.id}
          className={`absolute cursor-move ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
          style={{
            ...baseStyle,
            backgroundColor: elemento.corFundo || '#000000',
          }}
          onMouseDown={(e) => handleElementMouseDown(e, elemento.id)}
        >
          {renderResizeHandles()}
        </div>
      );
    }

    if (elemento.tipo === 'retangulo') {
      return (
        <div
          key={elemento.id}
          className={`absolute cursor-move ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
          style={{
            ...baseStyle,
            backgroundColor: elemento.corFundo || 'transparent',
            ...getBorderStyle(),
          }}
          onMouseDown={(e) => handleElementMouseDown(e, elemento.id)}
        >
          {renderResizeHandles()}
        </div>
      );
    }

    return (
      <div
        key={elemento.id}
        className={`absolute cursor-move overflow-hidden ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
        style={{
          ...baseStyle,
          backgroundColor: elemento.corFundo || 'transparent',
          ...getBorderStyle(),
          ...getTextStyle(),
        }}
        onMouseDown={(e) => handleElementMouseDown(e, elemento.id)}
      >
        <div className="h-full flex items-center px-1 truncate">
          {elemento.tipo === 'texto' ? elemento.textoFixo : elemento.variavel}
        </div>
        {renderResizeHandles()}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Editor de Layout - {nomeModelo}
          </DialogTitle>
          <DialogDescription>
            Adicione campos, textos e linhas. Arraste para posicionar e redimensionar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Add elements */}
          <div className="w-72 border-r bg-muted/30 flex flex-col">
            <Tabs value={abaSelecionada} onValueChange={(v) => setAbaSelecionada(v as typeof abaSelecionada)} className="flex-1 flex flex-col">
              <TabsList className="w-full rounded-none border-b">
                <TabsTrigger value="campos" className="flex-1 text-xs">Campos</TabsTrigger>
                <TabsTrigger value="textos" className="flex-1 text-xs">Textos</TabsTrigger>
                <TabsTrigger value="linhas" className="flex-1 text-xs">Linhas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="campos" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-3">
                    {CATEGORIAS.map(cat => {
                      const camposCategoria = VARIAVEIS_BOLETO.filter(v => v.categoria === cat.id);
                      return (
                        <Collapsible key={cat.id} defaultOpen>
                          <CollapsibleTrigger className="flex items-center justify-between w-full py-1 text-xs font-medium">
                            <span className={`px-2 py-0.5 rounded ${cat.cor}`}>{cat.label}</span>
                            <ChevronDown className="h-3 w-3" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-1 space-y-0.5">
                            {camposCategoria.map(v => {
                              const jaAdicionado = elementos.some(e => e.variavel === v.variavel);
                              return (
                                <Button
                                  key={v.variavel}
                                  variant={jaAdicionado ? 'secondary' : 'ghost'}
                                  size="sm"
                                  className="w-full justify-start text-xs h-7"
                                  onClick={() => {
                                    if (!jaAdicionado) {
                                      adicionarCampo(v.variavel, v.label);
                                    }
                                  }}
                                  disabled={jaAdicionado}
                                >
                                  {jaAdicionado && <span className="text-green-500 mr-1">✓</span>}
                                  <Plus className="h-3 w-3 mr-1" />
                                  {v.label}
                                </Button>
                              );
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="textos" className="flex-1 overflow-hidden m-0">
                <div className="p-3 space-y-2">
                  <Button onClick={() => adicionarTexto()} className="w-full">
                    <Type className="h-4 w-4 mr-2" />
                    Adicionar Texto
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Adicione textos estáticos como labels e títulos.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="linhas" className="flex-1 overflow-hidden m-0">
                <div className="p-3 space-y-2">
                  <Button onClick={() => adicionarLinha('horizontal')} variant="outline" className="w-full">
                    <Minus className="h-4 w-4 mr-2" />
                    Linha Horizontal
                  </Button>
                  <Button onClick={() => adicionarLinha('vertical')} variant="outline" className="w-full">
                    <Minus className="h-4 w-4 mr-2 rotate-90" />
                    Linha Vertical
                  </Button>
                  <Button onClick={() => adicionarRetangulo()} variant="outline" className="w-full">
                    <Square className="h-4 w-4 mr-2" />
                    Retângulo/Caixa
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Central Area - Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm w-14 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2">
                  <Switch checked={mostrarGrade} onCheckedChange={setMostrarGrade} id="grade" />
                  <Label htmlFor="grade" className="text-xs">Grade</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={snapToGrid} onCheckedChange={setSnapToGrid} id="snap" />
                  <Label htmlFor="snap" className="text-xs">Snap</Label>
                </div>
                <Separator orientation="vertical" className="h-6" />
                {/* Page Format Selector */}
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Select value={formatoPagina} onValueChange={(v) => handleFormatoChange(v as PageFormatKey)}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAGE_FORMATS).map(([key, format]) => (
                        <SelectItem key={key} value={key}>{format.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formatoPagina === 'CUSTOM' && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={larguraPagina}
                      onChange={(e) => setLarguraPagina(parseInt(e.target.value) || 210)}
                      className="h-8 w-16 text-xs"
                      min={50}
                      max={500}
                    />
                    <span className="text-xs text-muted-foreground">×</span>
                    <Input
                      type="number"
                      value={alturaPagina}
                      onChange={(e) => setAlturaPagina(parseInt(e.target.value) || 297)}
                      className="h-8 w-16 text-xs"
                      min={50}
                      max={500}
                    />
                    <span className="text-xs text-muted-foreground">mm</span>
                  </div>
                )}
              </div>
              <Badge variant="outline">{elementos.length} elementos</Badge>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto p-4 bg-zinc-200 dark:bg-zinc-900">
              <div
                ref={canvasRef}
                className="relative bg-white shadow-xl mx-auto"
                style={{
                  width: larguraCanvas * zoom,
                  height: alturaCanvas * zoom,
                  cursor: 'default',
                }}
                onClick={() => setElementoSelecionado(null)}
              >
                {/* PDF as background image */}
                {loadingPdf && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <span className="text-sm text-muted-foreground">Carregando PDF...</span>
                  </div>
                )}
                {pdfImageUrl && !loadingPdf && (
                  <img
                    src={pdfImageUrl}
                    alt="Modelo PDF"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={{ zIndex: 0, opacity: 0.5 }}
                  />
                )}

                {/* Background grid */}
                {mostrarGrade && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, #ccc 1px, transparent 1px),
                        linear-gradient(to bottom, #ccc 1px, transparent 1px)
                      `,
                      backgroundSize: `${tamanhoGrid * zoom}px ${tamanhoGrid * zoom}px`,
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Sorted elements */}
                {[...elementos]
                  .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
                  .map(renderElemento)}
              </div>
            </div>
          </div>

          {/* Right Panel - Properties */}
          <div className="w-80 border-l bg-muted/30 flex flex-col">
            <div className="p-3 border-b">
              <h3 className="font-medium text-sm">Propriedades</h3>
            </div>

            {elementoAtual ? (
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  {/* Basic info */}
                  <div className="space-y-2">
                    <Label className="text-xs">Nome</Label>
                    <Input
                      value={elementoAtual.nome}
                      onChange={(e) => atualizarElemento(elementoAtual.id, { nome: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>

                  {elementoAtual.tipo === 'texto' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Texto</Label>
                      <Input
                        value={elementoAtual.textoFixo || ''}
                        onChange={(e) => atualizarElemento(elementoAtual.id, { textoFixo: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                  {elementoAtual.tipo === 'campo' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Variável</Label>
                      <Select
                        value={elementoAtual.variavel}
                        onValueChange={(v) => atualizarElemento(elementoAtual.id, { variavel: v })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VARIAVEIS_BOLETO.map(v => (
                            <SelectItem key={v.variavel} value={v.variavel}>
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  {/* Position and Size */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Posição e Tamanho</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <Label className="text-[10px]">X</Label>
                        <Input
                          type="number"
                          value={elementoAtual.x}
                          onChange={(e) => atualizarElemento(elementoAtual.id, { x: parseInt(e.target.value) || 0 })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Y</Label>
                        <Input
                          type="number"
                          value={elementoAtual.y}
                          onChange={(e) => atualizarElemento(elementoAtual.id, { y: parseInt(e.target.value) || 0 })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Largura</Label>
                        <Input
                          type="number"
                          value={elementoAtual.largura}
                          onChange={(e) => atualizarElemento(elementoAtual.id, { largura: parseInt(e.target.value) || 20 })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Altura</Label>
                        <Input
                          type="number"
                          value={elementoAtual.altura}
                          onChange={(e) => atualizarElemento(elementoAtual.id, { altura: parseInt(e.target.value) || 10 })}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Font and text formatting */}
                  {(elementoAtual.tipo === 'campo' || elementoAtual.tipo === 'texto') && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Formatação de Texto</Label>
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-2">
                            <Select
                              value={elementoAtual.fonte || 'helvetica'}
                              onValueChange={(v) => atualizarElemento(elementoAtual.id, { fonte: v })}
                            >
                              <SelectTrigger className="h-7 text-xs flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FONTES.map(f => (
                                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={elementoAtual.tamanhoFonte || 10}
                              onChange={(e) => atualizarElemento(elementoAtual.id, { tamanhoFonte: parseInt(e.target.value) || 10 })}
                              className="h-7 text-xs w-16"
                              min={6}
                              max={72}
                            />
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              variant={elementoAtual.negrito ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => atualizarElemento(elementoAtual.id, { negrito: !elementoAtual.negrito })}
                            >
                              <Bold className="h-3 w-3" />
                            </Button>
                            <Button
                              variant={elementoAtual.italico ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => atualizarElemento(elementoAtual.id, { italico: !elementoAtual.italico })}
                            >
                              <Italic className="h-3 w-3" />
                            </Button>
                            <Separator orientation="vertical" className="h-7" />
                            <Button
                              variant={elementoAtual.alinhamento === 'left' ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => atualizarElemento(elementoAtual.id, { alinhamento: 'left' })}
                            >
                              <AlignLeft className="h-3 w-3" />
                            </Button>
                            <Button
                              variant={elementoAtual.alinhamento === 'center' ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => atualizarElemento(elementoAtual.id, { alinhamento: 'center' })}
                            >
                              <AlignCenter className="h-3 w-3" />
                            </Button>
                            <Button
                              variant={elementoAtual.alinhamento === 'right' ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => atualizarElemento(elementoAtual.id, { alinhamento: 'right' })}
                            >
                              <AlignRight className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] w-16">Cor Texto</Label>
                            <input
                              type="color"
                              value={elementoAtual.corTexto || '#000000'}
                              onChange={(e) => atualizarElemento(elementoAtual.id, { corTexto: e.target.value })}
                              className="h-7 w-12 cursor-pointer rounded border"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Borders */}
                  {elementoAtual.tipo !== 'linha' && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Bordas</Label>
                        <div className="mt-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={elementoAtual.bordaSuperior || false}
                                onCheckedChange={(v) => atualizarElemento(elementoAtual.id, { bordaSuperior: v })}
                                id="borda-top"
                              />
                              <Label htmlFor="borda-top" className="text-xs">Superior</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={elementoAtual.bordaInferior || false}
                                onCheckedChange={(v) => atualizarElemento(elementoAtual.id, { bordaInferior: v })}
                                id="borda-bottom"
                              />
                              <Label htmlFor="borda-bottom" className="text-xs">Inferior</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={elementoAtual.bordaEsquerda || false}
                                onCheckedChange={(v) => atualizarElemento(elementoAtual.id, { bordaEsquerda: v })}
                                id="borda-left"
                              />
                              <Label htmlFor="borda-left" className="text-xs">Esquerda</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={elementoAtual.bordaDireita || false}
                                onCheckedChange={(v) => atualizarElemento(elementoAtual.id, { bordaDireita: v })}
                                id="borda-right"
                              />
                              <Label htmlFor="borda-right" className="text-xs">Direita</Label>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] w-16">Cor</Label>
                            <input
                              type="color"
                              value={elementoAtual.corBorda || '#000000'}
                              onChange={(e) => atualizarElemento(elementoAtual.id, { corBorda: e.target.value })}
                              className="h-7 w-12 cursor-pointer rounded border"
                            />
                            <Label className="text-[10px] w-16">Espessura</Label>
                            <Input
                              type="number"
                              value={elementoAtual.espessuraBorda || 1}
                              onChange={(e) => atualizarElemento(elementoAtual.id, { espessuraBorda: parseInt(e.target.value) || 1 })}
                              className="h-7 text-xs w-14"
                              min={1}
                              max={10}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Background color */}
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-20">Cor Fundo</Label>
                    <input
                      type="color"
                      value={elementoAtual.corFundo === 'transparent' ? '#ffffff' : (elementoAtual.corFundo || '#ffffff')}
                      onChange={(e) => atualizarElemento(elementoAtual.id, { corFundo: e.target.value })}
                      className="h-7 w-12 cursor-pointer rounded border"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => atualizarElemento(elementoAtual.id, { corFundo: 'transparent' })}
                    >
                      Transparente
                    </Button>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => duplicarElemento(elementoAtual.id)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Duplicar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => removerElemento(elementoAtual.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remover
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Selecione um elemento no canvas para editar suas propriedades
                </p>
              </div>
            )}

            {/* Elements list */}
            <div className="border-t p-3">
              <Label className="text-xs text-muted-foreground">Elementos ({elementos.length})</Label>
              <ScrollArea className="h-32 mt-2">
                <div className="space-y-1">
                  {[...elementos]
                    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
                    .map(el => (
                      <div
                        key={el.id}
                        className={`flex items-center gap-1 text-xs p-1.5 rounded cursor-pointer ${
                          elementoSelecionado === el.id ? 'bg-primary/20' : 'hover:bg-muted'
                        }`}
                        onClick={() => setElementoSelecionado(el.id)}
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        {el.tipo === 'campo' && <Square className="h-3 w-3 text-blue-500" />}
                        {el.tipo === 'texto' && <Type className="h-3 w-3 text-green-500" />}
                        {el.tipo === 'linha' && <Minus className="h-3 w-3 text-orange-500" />}
                        {el.tipo === 'retangulo' && <Square className="h-3 w-3 text-purple-500" />}
                        <span className="truncate flex-1">{el.nome}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            atualizarElemento(el.id, { visivel: !el.visivel });
                          }}
                        >
                          {el.visivel ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </Button>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Layout ({elementos.length} elementos)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
