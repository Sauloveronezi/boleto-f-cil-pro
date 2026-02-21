import { useState } from 'react';
import { Settings, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useBoletosApiConfig,
  useAddBoletosApiConfig,
  useToggleBoletosApiConfig,
  useDeleteBoletosApiConfig,
  BoletosApiConfigItem,
} from '@/hooks/useBoletosApiConfig';

export function BoletosApiConfigDialog() {
  const { data: config } = useBoletosApiConfig();
  const addConfig = useAddBoletosApiConfig();
  const toggleConfig = useToggleBoletosApiConfig();
  const deleteConfig = useDeleteBoletosApiConfig();

  const [novoTipo, setNovoTipo] = useState<'coluna' | 'filtro'>('coluna');
  const [novaChave, setNovaChave] = useState('');
  const [novoLabel, setNovoLabel] = useState('');
  const [novoCampo, setNovoCampo] = useState('');

  const colunas = config?.filter(c => c.tipo === 'coluna') || [];
  const filtros = config?.filter(c => c.tipo === 'filtro') || [];

  const handleAdd = () => {
    if (!novaChave.trim() || !novoLabel.trim()) return;
    addConfig.mutate({
      tipo: novoTipo,
      chave: novaChave.trim(),
      label: novoLabel.trim(),
      campo_boleto: novoCampo.trim() || novaChave.trim(),
    });
    setNovaChave('');
    setNovoLabel('');
    setNovoCampo('');
  };

  const renderList = (items: BoletosApiConfigItem[], titulo: string) => (
    <div>
      <h4 className="font-semibold text-sm text-foreground mb-2">{titulo}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum item configurado</p>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded border border-border bg-muted/30 overflow-hidden"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Badge variant={item.visivel ? 'default' : 'secondary'} className="text-xs shrink-0 max-w-[120px] truncate">
                  {item.chave}
                </Badge>
                <span className="text-sm truncate">{item.label}</span>
                {item.campo_boleto && item.campo_boleto !== item.chave && (
                  <span className="text-xs text-muted-foreground truncate">→ {item.campo_boleto}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => toggleConfig.mutate({ id: item.id, visivel: !item.visivel })}
                  title={item.visivel ? 'Ocultar' : 'Mostrar'}
                >
                  {item.visivel ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteConfig.mutate(item.id)}
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Configurar colunas e filtros">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Colunas e Filtros
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Adicionar novo */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm">Adicionar novo</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coluna">Coluna</SelectItem>
                    <SelectItem value="filtro">Filtro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Chave (identificador)</Label>
                <Input
                  value={novaChave}
                  onChange={e => setNovaChave(e.target.value)}
                  placeholder="ex: documento"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Label (exibição)</Label>
                <Input
                  value={novoLabel}
                  onChange={e => setNovoLabel(e.target.value)}
                  placeholder="ex: Documento"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Campo no boleto</Label>
                <Input
                  value={novoCampo}
                  onChange={e => setNovoCampo(e.target.value)}
                  placeholder="ex: documento"
                  className="mt-1"
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!novaChave.trim() || !novoLabel.trim() || addConfig.isPending}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>

          {/* Colunas */}
          {renderList(colunas, 'Colunas da Tabela')}

          {/* Filtros */}
          {renderList(filtros, 'Filtros Disponíveis')}
        </div>
      </DialogContent>
    </Dialog>
  );
}
