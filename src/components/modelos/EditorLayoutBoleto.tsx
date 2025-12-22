import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Move, Plus, Trash2, Save, ZoomIn, ZoomOut, RotateCcw, 
  Type, Minus, Square, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, ChevronDown, Settings2, Copy, Layers, Eye, EyeOff,
  ArrowUp, ArrowDown, GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

// Tipos de elementos do layout
export type TipoElemento = 'campo' | 'texto' | 'linha' | 'retangulo';

export interface ElementoLayout {
  id: string;
  tipo: TipoElemento;
  nome: string;
  // Posição e dimensões
  x: number;
  y: number;
  largura: number;
  altura: number;
  // Conteúdo
  variavel?: string; // Para campos
  textoFixo?: string; // Para textos estáticos
  // Estilos
  fonte?: string;
  tamanhoFonte?: number;
  negrito?: boolean;
  italico?: boolean;
  alinhamento?: 'left' | 'center' | 'right';
  corTexto?: string;
  corFundo?: string;
  // Bordas individuais
  bordaSuperior?: boolean;
  bordaInferior?: boolean;
  bordaEsquerda?: boolean;
  bordaDireita?: boolean;
  espessuraBorda?: number;
  corBorda?: string;
  // Controle de visibilidade
  visivel?: boolean;
  bloqueado?: boolean;
  // Ordem de renderização
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

// Dimensões padrão do boleto (em mm, escala para px)
const ESCALA = 2; // 1mm = 2px
const LARGURA_BOLETO_MM = 210; // A4 width
const ALTURA_BOLETO_MM = 140; // Altura típica de boleto

export function EditorLayoutBoleto({ 
  open, 
  onOpenChange, 
  elementos: elementosIniciais, 
  onSave, 
  nomeModelo,
  larguraPagina = LARGURA_BOLETO_MM,
  alturaPagina = ALTURA_BOLETO_MM,
}: EditorLayoutBoletoProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [elementos, setElementos] = useState<ElementoLayout[]>([]);
  const [elementoSelecionado, setElementoSelecionado] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mostrarGrade, setMostrarGrade] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [tamanhoGrid, setTamanhoGrid] = useState(5);
  const [abaSelecionada, setAbaSelecionada] = useState<'campos' | 'textos' | 'linhas'>('campos');

  const larguraCanvas = larguraPagina * ESCALA;
  const alturaCanvas = alturaPagina * ESCALA;

  useEffect(() => {
    if (open) {
      if (elementosIniciais.length > 0) {
        setElementos(elementosIniciais.map((e, i) => ({ ...e, ordem: e.ordem ?? i, visivel: e.visivel ?? true })));
      } else {
        setElementos(getElementosPadrao());
      }
      setElementoSelecionado(null);
    }
  }, [open, elementosIniciais]);

  const getElementosPadrao = (): ElementoLayout[] => {
    return [
      // Cabeçalho com logo e linha digitável
      { id: 'el_1', tipo: 'linha', nome: 'Linha Cabeçalho', x: 0, y: 40, largura: larguraCanvas, altura: 2, corFundo: '#000000', visivel: true, ordem: 0 },
      { id: 'el_2', tipo: 'campo', nome: 'Logo Banco', variavel: '{{banco_logo}}', x: 10, y: 5, largura: 80, altura: 30, visivel: true, ordem: 1 },
      { id: 'el_3', tipo: 'campo', nome: 'Código Banco', variavel: '{{banco_codigo}}', x: 100, y: 10, largura: 60, altura: 20, tamanhoFonte: 16, negrito: true, alinhamento: 'center', bordaEsquerda: true, bordaDireita: true, visivel: true, ordem: 2 },
      { id: 'el_4', tipo: 'campo', nome: 'Linha Digitável', variavel: '{{linha_digitavel}}', x: 170, y: 10, largura: 240, altura: 20, tamanhoFonte: 12, negrito: true, alinhamento: 'right', visivel: true, ordem: 3 },
      
      // Segunda linha
      { id: 'el_5', tipo: 'linha', nome: 'Linha 2', x: 0, y: 80, largura: larguraCanvas, altura: 1, corFundo: '#000000', visivel: true, ordem: 4 },
      { id: 'el_6', tipo: 'texto', nome: 'Label Local Pagamento', textoFixo: 'Local de Pagamento', x: 10, y: 45, largura: 100, altura: 12, tamanhoFonte: 8, visivel: true, ordem: 5 },
      { id: 'el_7', tipo: 'campo', nome: 'Local Pagamento', variavel: '{{local_pagamento}}', x: 10, y: 55, largura: 300, altura: 18, tamanhoFonte: 10, visivel: true, ordem: 6 },
      { id: 'el_8', tipo: 'texto', nome: 'Label Vencimento', textoFixo: 'Vencimento', x: 330, y: 45, largura: 80, altura: 12, tamanhoFonte: 8, visivel: true, ordem: 7 },
      { id: 'el_9', tipo: 'campo', nome: 'Data Vencimento', variavel: '{{data_vencimento}}', x: 330, y: 55, largura: 80, altura: 18, tamanhoFonte: 10, negrito: true, alinhamento: 'center', visivel: true, ordem: 8 },
      
      // Beneficiário
      { id: 'el_10', tipo: 'linha', nome: 'Linha 3', x: 0, y: 120, largura: larguraCanvas, altura: 1, corFundo: '#000000', visivel: true, ordem: 9 },
      { id: 'el_11', tipo: 'texto', nome: 'Label Beneficiário', textoFixo: 'Beneficiário', x: 10, y: 85, largura: 80, altura: 12, tamanhoFonte: 8, visivel: true, ordem: 10 },
      { id: 'el_12', tipo: 'campo', nome: 'Beneficiário', variavel: '{{beneficiario_nome}}', x: 10, y: 95, largura: 280, altura: 18, tamanhoFonte: 10, visivel: true, ordem: 11 },
      { id: 'el_13', tipo: 'texto', nome: 'Label Agência', textoFixo: 'Agência/Código Beneficiário', x: 300, y: 85, largura: 110, altura: 12, tamanhoFonte: 8, visivel: true, ordem: 12 },
      { id: 'el_14', tipo: 'campo', nome: 'Agência Conta', variavel: '{{agencia}}', x: 300, y: 95, largura: 110, altura: 18, tamanhoFonte: 10, alinhamento: 'center', visivel: true, ordem: 13 },
      
      // Pagador
      { id: 'el_15', tipo: 'linha', nome: 'Linha Pagador', x: 0, y: 200, largura: larguraCanvas, altura: 1, corFundo: '#000000', visivel: true, ordem: 14 },
      { id: 'el_16', tipo: 'texto', nome: 'Label Pagador', textoFixo: 'Pagador', x: 10, y: 205, largura: 60, altura: 12, tamanhoFonte: 8, visivel: true, ordem: 15 },
      { id: 'el_17', tipo: 'campo', nome: 'Pagador Nome', variavel: '{{pagador_nome}}', x: 10, y: 215, largura: 350, altura: 15, tamanhoFonte: 9, visivel: true, ordem: 16 },
      { id: 'el_18', tipo: 'campo', nome: 'Pagador Endereço', variavel: '{{pagador_endereco}}', x: 10, y: 230, largura: 350, altura: 15, tamanhoFonte: 9, visivel: true, ordem: 17 },
      { id: 'el_19', tipo: 'campo', nome: 'Pagador CNPJ', variavel: '{{pagador_cnpj}}', x: 370, y: 215, largura: 40, altura: 15, tamanhoFonte: 9, visivel: true, ordem: 18 },
      
      // Código de barras
      { id: 'el_20', tipo: 'campo', nome: 'Código de Barras', variavel: '{{codigo_barras}}', x: 10, y: 255, largura: 350, altura: 40, corFundo: '#000000', visivel: true, ordem: 19 },
    ];
  };

  const snapValue = (value: number): number => {
    if (!snapToGrid) return value;
    return Math.round(value / tamanhoGrid) * tamanhoGrid;
  };

  const adicionarElemento = (tipo: TipoElemento, config?: Partial<ElementoLayout>) => {
    const id = `el_${Date.now()}`;
    const novoElemento: ElementoLayout = {
      id,
      tipo,
      nome: config?.nome || `Novo ${tipo}`,
      x: 10,
      y: 10 + elementos.length * 5,
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
    
    setElementos(prev => [...prev, novoElemento]);
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
    
    const novoId = `el_${Date.now()}`;
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

  const moverElemento = (id: string, direcao: 'up' | 'down') => {
    const index = elementos.findIndex(e => e.id === id);
    if (index === -1) return;
    
    const novaOrdem = [...elementos].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    const novoIndex = direcao === 'up' ? Math.max(0, index - 1) : Math.min(elementos.length - 1, index + 1);
    
    if (novoIndex !== index) {
      const item = novaOrdem.splice(index, 1)[0];
      novaOrdem.splice(novoIndex, 0, item);
      setElementos(novaOrdem.map((e, i) => ({ ...e, ordem: i })));
    }
  };

  const handleMouseDown = (e: React.MouseEvent, elementoId: string, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const elemento = elementos.find(el => el.id === elementoId);
    if (!elemento || elemento.bloqueado || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    
    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
    } else {
      setDragOffset({
        x: e.clientX - rect.left - elemento.x * zoom,
        y: e.clientY - rect.top - elemento.y * zoom,
      });
      setIsDragging(true);
    }
    
    setElementoSelecionado(elementoId);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!elementoSelecionado || !canvasRef.current) return;

    const elemento = elementos.find(el => el.id === elementoSelecionado);
    if (!elemento) return;

    const rect = canvasRef.current.getBoundingClientRect();

    if (isDragging) {
      const newX = snapValue(Math.max(0, Math.min(larguraCanvas - elemento.largura, (e.clientX - rect.left - dragOffset.x) / zoom)));
      const newY = snapValue(Math.max(0, Math.min(alturaCanvas - elemento.altura, (e.clientY - rect.top - dragOffset.y) / zoom)));
      
      atualizarElemento(elementoSelecionado, { x: Math.round(newX), y: Math.round(newY) });
    } else if (isResizing && resizeHandle) {
      const mouseX = (e.clientX - rect.left) / zoom;
      const mouseY = (e.clientY - rect.top) / zoom;

      let updates: Partial<ElementoLayout> = {};

      if (resizeHandle.includes('e')) {
        updates.largura = snapValue(Math.max(20, mouseX - elemento.x));
      }
      if (resizeHandle.includes('w')) {
        const newWidth = snapValue(Math.max(20, elemento.x + elemento.largura - mouseX));
        updates.x = snapValue(elemento.x + elemento.largura - newWidth);
        updates.largura = newWidth;
      }
      if (resizeHandle.includes('s')) {
        updates.altura = snapValue(Math.max(10, mouseY - elemento.y));
      }
      if (resizeHandle.includes('n')) {
        const newHeight = snapValue(Math.max(10, elemento.y + elemento.altura - mouseY));
        updates.y = snapValue(elemento.y + elemento.altura - newHeight);
        updates.altura = newHeight;
      }

      atualizarElemento(elementoSelecionado, updates);
    }
  }, [isDragging, isResizing, elementoSelecionado, zoom, dragOffset, resizeHandle, elementos, snapValue, larguraCanvas, alturaCanvas]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
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

    if (elemento.tipo === 'linha') {
      return (
        <div
          key={elemento.id}
          className={`absolute cursor-move ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
          style={{
            ...baseStyle,
            backgroundColor: elemento.corFundo || '#000000',
          }}
          onMouseDown={(e) => handleMouseDown(e, elemento.id)}
        />
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
          onMouseDown={(e) => handleMouseDown(e, elemento.id)}
        >
          {isSelected && renderResizeHandles()}
        </div>
      );
    }

    return (
      <div
        key={elemento.id}
        className={`absolute cursor-move overflow-hidden ${isSelected ? 'ring-2 ring-primary ring-offset-1 z-10' : ''}`}
        style={{
          ...baseStyle,
          backgroundColor: elemento.corFundo || 'transparent',
          ...getBorderStyle(),
          ...getTextStyle(),
        }}
        onMouseDown={(e) => handleMouseDown(e, elemento.id)}
      >
        <div className="h-full flex items-center px-1 truncate">
          {elemento.tipo === 'texto' ? elemento.textoFixo : elemento.variavel}
        </div>
        {isSelected && renderResizeHandles()}
      </div>
    );
  };

  const renderResizeHandles = () => {
    const handleSize = 8;
    const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    
    return handles.map(handle => {
      let style: React.CSSProperties = {
        position: 'absolute',
        width: handleSize,
        height: handleSize,
        backgroundColor: 'hsl(var(--primary))',
        border: '1px solid white',
        zIndex: 20,
      };

      if (handle.includes('n')) style.top = -handleSize / 2;
      if (handle.includes('s')) style.bottom = -handleSize / 2;
      if (handle.includes('e')) style.right = -handleSize / 2;
      if (handle.includes('w')) style.left = -handleSize / 2;
      if (handle === 'n' || handle === 's') style.left = '50%';
      if (handle === 'e' || handle === 'w') style.top = '50%';
      if (handle === 'n' || handle === 's') style.transform = 'translateX(-50%)';
      if (handle === 'e' || handle === 'w') style.transform = 'translateY(-50%)';

      const cursors: Record<string, string> = {
        n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
        ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize',
      };
      style.cursor = cursors[handle];

      return (
        <div
          key={handle}
          style={style}
          onMouseDown={(e) => handleMouseDown(e, elementoSelecionado!, handle)}
        />
      );
    });
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
            Adicione campos, textos e linhas. Arraste para posicionar e redimensionar. Configure bordas individualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Painel Esquerdo - Adicionar elementos */}
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
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
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      adicionarTexto();
                    }} 
                    className="w-full"
                  >
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
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      adicionarLinha('horizontal');
                    }} 
                    variant="outline" 
                    className="w-full"
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    Linha Horizontal
                  </Button>
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      adicionarLinha('vertical');
                    }} 
                    variant="outline" 
                    className="w-full"
                  >
                    <Minus className="h-4 w-4 mr-2 rotate-90" />
                    Linha Vertical
                  </Button>
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      adicionarRetangulo();
                    }} 
                    variant="outline" 
                    className="w-full"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Retângulo/Caixa
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use linhas para dividir seções e retângulos para criar caixas com bordas.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Área Central - Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
              <div className="flex items-center gap-2">
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
                <Button variant="outline" size="sm" onClick={() => setElementos(getElementosPadrao())}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Resetar
                </Button>
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
                  cursor: isDragging ? 'grabbing' : 'default',
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={() => setElementoSelecionado(null)}
              >
                {/* Grade de fundo */}
                {mostrarGrade && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, #ccc 1px, transparent 1px),
                        linear-gradient(to bottom, #ccc 1px, transparent 1px)
                      `,
                      backgroundSize: `${tamanhoGrid * zoom}px ${tamanhoGrid * zoom}px`,
                    }}
                  />
                )}

                {/* Elementos ordenados */}
                {[...elementos]
                  .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
                  .map(renderElemento)}
              </div>
            </div>
          </div>

          {/* Painel Direito - Propriedades */}
          <div className="w-80 border-l bg-muted/30 flex flex-col">
            <div className="p-3 border-b">
              <h3 className="font-medium text-sm">Propriedades</h3>
            </div>

            {elementoAtual ? (
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  {/* Informações básicas */}
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

                  {/* Posição e Tamanho */}
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

                  {/* Fonte e Texto (para campos e textos) */}
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

                  {/* Bordas */}
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

                  {/* Cor de fundo */}
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

                  {/* Ações */}
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

            {/* Lista de elementos */}
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
