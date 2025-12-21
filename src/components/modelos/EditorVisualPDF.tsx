import { useState, useRef, useEffect } from 'react';
import { Move, Plus, Trash2, Save, ZoomIn, ZoomOut, RotateCcw, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface CampoMapeado {
  id: string;
  nome: string;
  variavel: string;
  posicao_x: number;
  posicao_y: number;
  largura: number;
  altura: number;
}

interface EditorVisualPDFProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campos: CampoMapeado[];
  onSave: (campos: CampoMapeado[]) => void;
  tipoLayout: string;
}

const VARIAVEIS_BOLETO = [
  { variavel: '{{banco_nome}}', label: 'Nome do Banco', categoria: 'banco' },
  { variavel: '{{banco_codigo}}', label: 'Código do Banco', categoria: 'banco' },
  { variavel: '{{agencia}}', label: 'Agência', categoria: 'banco' },
  { variavel: '{{conta}}', label: 'Conta', categoria: 'banco' },
  { variavel: '{{beneficiario_nome}}', label: 'Nome do Beneficiário', categoria: 'beneficiario' },
  { variavel: '{{beneficiario_cnpj}}', label: 'CNPJ do Beneficiário', categoria: 'beneficiario' },
  { variavel: '{{beneficiario_endereco}}', label: 'Endereço do Beneficiário', categoria: 'beneficiario' },
  { variavel: '{{pagador_nome}}', label: 'Nome do Pagador', categoria: 'pagador' },
  { variavel: '{{pagador_cnpj}}', label: 'CNPJ/CPF do Pagador', categoria: 'pagador' },
  { variavel: '{{pagador_endereco}}', label: 'Endereço do Pagador', categoria: 'pagador' },
  { variavel: '{{nosso_numero}}', label: 'Nosso Número', categoria: 'titulo' },
  { variavel: '{{numero_documento}}', label: 'Número do Documento', categoria: 'titulo' },
  { variavel: '{{data_vencimento}}', label: 'Data de Vencimento', categoria: 'titulo' },
  { variavel: '{{data_emissao}}', label: 'Data de Emissão', categoria: 'titulo' },
  { variavel: '{{valor_documento}}', label: 'Valor do Documento', categoria: 'titulo' },
  { variavel: '{{valor_cobrado}}', label: 'Valor Cobrado', categoria: 'titulo' },
  { variavel: '{{linha_digitavel}}', label: 'Linha Digitável', categoria: 'codigo' },
  { variavel: '{{codigo_barras}}', label: 'Código de Barras', categoria: 'codigo' },
  { variavel: '{{instrucoes}}', label: 'Instruções', categoria: 'outros' },
  { variavel: '{{local_pagamento}}', label: 'Local de Pagamento', categoria: 'outros' },
];

const CATEGORIAS = [
  { id: 'banco', label: 'Banco' },
  { id: 'beneficiario', label: 'Beneficiário' },
  { id: 'pagador', label: 'Pagador' },
  { id: 'titulo', label: 'Título' },
  { id: 'codigo', label: 'Códigos' },
  { id: 'outros', label: 'Outros' },
];

// Dimensões do preview (escala 1:1 com A4 em 72dpi seria 595x842, usamos proporção menor)
const PREVIEW_WIDTH = 595;
const PREVIEW_HEIGHT = 280; // Proporção de boleto típico

export function EditorVisualPDF({ open, onOpenChange, campos, onSave, tipoLayout }: EditorVisualPDFProps) {
  const [camposEditor, setCamposEditor] = useState<CampoMapeado[]>([]);
  const [campoSelecionado, setCampoSelecionado] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setCamposEditor(campos.length > 0 ? [...campos] : getDefaultCampos());
    }
  }, [open, campos]);

  const getDefaultCampos = (): CampoMapeado[] => {
    return [
      { id: '1', nome: 'Nome do Banco', variavel: '{{banco_nome}}', posicao_x: 70, posicao_y: 10, largura: 150, altura: 20 },
      { id: '2', nome: 'Linha Digitável', variavel: '{{linha_digitavel}}', posicao_x: 300, posicao_y: 10, largura: 280, altura: 20 },
      { id: '3', nome: 'Vencimento', variavel: '{{data_vencimento}}', posicao_x: 480, posicao_y: 40, largura: 100, altura: 20 },
      { id: '4', nome: 'Beneficiário', variavel: '{{beneficiario_nome}}', posicao_x: 10, posicao_y: 70, largura: 300, altura: 20 },
      { id: '5', nome: 'Nosso Número', variavel: '{{nosso_numero}}', posicao_x: 480, posicao_y: 70, largura: 100, altura: 20 },
      { id: '6', nome: 'Valor', variavel: '{{valor_documento}}', posicao_x: 480, posicao_y: 100, largura: 100, altura: 20 },
      { id: '7', nome: 'Pagador', variavel: '{{pagador_nome}}', posicao_x: 10, posicao_y: 180, largura: 400, altura: 20 },
      { id: '8', nome: 'Código de Barras', variavel: '{{codigo_barras}}', posicao_x: 10, posicao_y: 230, largura: 400, altura: 40 },
    ];
  };

  const handleAddCampo = (variavel: string, label: string) => {
    const novoCampo: CampoMapeado = {
      id: `campo_${Date.now()}`,
      nome: label,
      variavel,
      posicao_x: 10,
      posicao_y: 10 + camposEditor.length * 25,
      largura: 150,
      altura: 20,
    };
    setCamposEditor([...camposEditor, novoCampo]);
    setCampoSelecionado(novoCampo.id);
  };

  const handleRemoveCampo = (id: string) => {
    setCamposEditor(camposEditor.filter(c => c.id !== id));
    if (campoSelecionado === id) {
      setCampoSelecionado(null);
    }
  };

  const handleUpdateCampo = (id: string, updates: Partial<CampoMapeado>) => {
    setCamposEditor(camposEditor.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleMouseDown = (e: React.MouseEvent, campoId: string) => {
    e.preventDefault();
    const campo = camposEditor.find(c => c.id === campoId);
    if (!campo || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - campo.posicao_x * zoom,
      y: e.clientY - rect.top - campo.posicao_y * zoom,
    });
    setIsDragging(true);
    setCampoSelecionado(campoId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !campoSelecionado || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(PREVIEW_WIDTH - 50, (e.clientX - rect.left - dragOffset.x) / zoom));
    const newY = Math.max(0, Math.min(PREVIEW_HEIGHT - 20, (e.clientY - rect.top - dragOffset.y) / zoom));

    handleUpdateCampo(campoSelecionado, {
      posicao_x: Math.round(newX),
      posicao_y: Math.round(newY),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    onSave(camposEditor);
    onOpenChange(false);
  };

  const campoAtual = camposEditor.find(c => c.id === campoSelecionado);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5" />
            Editor Visual de Layout - {tipoLayout}
          </DialogTitle>
          <DialogDescription>
            Arraste os campos para posicioná-los no layout do boleto. Clique em um campo para editar suas propriedades.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Painel lateral - Variáveis disponíveis */}
          <div className="w-64 border-r bg-muted/30 flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-medium text-sm">Variáveis Disponíveis</h3>
              <p className="text-xs text-muted-foreground mt-1">Clique para adicionar ao layout</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {CATEGORIAS.map(cat => (
                  <div key={cat.id}>
                    <Label className="text-xs text-muted-foreground uppercase">{cat.label}</Label>
                    <div className="mt-2 space-y-1">
                      {VARIAVEIS_BOLETO.filter(v => v.categoria === cat.id).map(v => {
                        const jaAdicionado = camposEditor.some(c => c.variavel === v.variavel);
                        return (
                          <Button
                            key={v.variavel}
                            variant={jaAdicionado ? 'secondary' : 'ghost'}
                            size="sm"
                            className="w-full justify-start text-xs h-7"
                            onClick={() => !jaAdicionado && handleAddCampo(v.variavel, v.label)}
                            disabled={jaAdicionado}
                          >
                            {jaAdicionado && <span className="text-green-500 mr-1">✓</span>}
                            {v.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Área central - Canvas de preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="outline" size="sm" onClick={() => setCamposEditor(getDefaultCampos())}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Resetar
                </Button>
              </div>
              <Badge variant="outline">{camposEditor.length} campos</Badge>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto p-4 bg-zinc-100 dark:bg-zinc-900">
              <div
                ref={canvasRef}
                className="relative bg-white dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-600 mx-auto shadow-lg"
                style={{
                  width: PREVIEW_WIDTH * zoom,
                  height: PREVIEW_HEIGHT * zoom,
                  cursor: isDragging ? 'grabbing' : 'default',
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Grid de fundo */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #ccc 1px, transparent 1px),
                      linear-gradient(to bottom, #ccc 1px, transparent 1px)
                    `,
                    backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                  }}
                />

                {/* Campos */}
                {camposEditor.map(campo => (
                  <div
                    key={campo.id}
                    className={`absolute border-2 rounded cursor-grab flex items-center px-1 text-xs overflow-hidden transition-colors ${
                      campoSelecionado === campo.id
                        ? 'border-primary bg-primary/20 shadow-md z-10'
                        : 'border-zinc-400 bg-zinc-100/80 dark:bg-zinc-700/80 hover:border-primary/50'
                    }`}
                    style={{
                      left: campo.posicao_x * zoom,
                      top: campo.posicao_y * zoom,
                      width: campo.largura * zoom,
                      height: campo.altura * zoom,
                      fontSize: `${10 * zoom}px`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, campo.id)}
                    onClick={() => setCampoSelecionado(campo.id)}
                  >
                    <GripVertical className="h-3 w-3 mr-1 flex-shrink-0 opacity-50" />
                    <span className="truncate">{campo.nome}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Painel direito - Propriedades do campo selecionado */}
          <div className="w-72 border-l bg-muted/30 flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-medium text-sm">Propriedades do Campo</h3>
            </div>

            {campoAtual ? (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  <div>
                    <Label className="text-xs">Nome/Label</Label>
                    <Input
                      value={campoAtual.nome}
                      onChange={(e) => handleUpdateCampo(campoAtual.id, { nome: e.target.value })}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Variável</Label>
                    <Select
                      value={campoAtual.variavel}
                      onValueChange={(v) => handleUpdateCampo(campoAtual.id, { variavel: v })}
                    >
                      <SelectTrigger className="mt-1 h-8 text-sm">
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

                  <Separator />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Posição X</Label>
                      <Input
                        type="number"
                        value={campoAtual.posicao_x}
                        onChange={(e) => handleUpdateCampo(campoAtual.id, { posicao_x: parseInt(e.target.value) || 0 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Posição Y</Label>
                      <Input
                        type="number"
                        value={campoAtual.posicao_y}
                        onChange={(e) => handleUpdateCampo(campoAtual.id, { posicao_y: parseInt(e.target.value) || 0 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Largura</Label>
                      <Input
                        type="number"
                        value={campoAtual.largura}
                        onChange={(e) => handleUpdateCampo(campoAtual.id, { largura: parseInt(e.target.value) || 50 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Altura</Label>
                      <Input
                        type="number"
                        value={campoAtual.altura}
                        onChange={(e) => handleUpdateCampo(campoAtual.id, { altura: parseInt(e.target.value) || 20 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>

                  <Separator />

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => handleRemoveCampo(campoAtual.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover Campo
                  </Button>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Selecione um campo no canvas para editar suas propriedades
                </p>
              </div>
            )}

            {/* Campos adicionados */}
            <div className="border-t p-4">
              <Label className="text-xs text-muted-foreground">Campos no Layout ({camposEditor.length})</Label>
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {camposEditor.map(campo => (
                  <div
                    key={campo.id}
                    className={`flex items-center justify-between text-xs p-1 rounded cursor-pointer ${
                      campoSelecionado === campo.id ? 'bg-primary/20' : 'hover:bg-muted'
                    }`}
                    onClick={() => setCampoSelecionado(campo.id)}
                  >
                    <span className="truncate">{campo.nome}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCampo(campo.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Layout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
