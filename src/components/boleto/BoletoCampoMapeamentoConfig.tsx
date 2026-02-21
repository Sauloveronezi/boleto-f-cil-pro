import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Save, X, Plus, Trash2, Search, ArrowUpDown } from 'lucide-react';
import {
  useBoletoCampoMapeamento,
  useUpdateBoletoCampoMapeamento,
  useAddBoletoCampoMapeamento,
  useDeleteBoletoCampoMapeamento,
  BoletoCampoMapeamento,
} from '@/hooks/useBoletoCampoMapeamento';

const TIPOS_TRANSFORMACAO = [
  { value: 'direto', label: 'Direto (campo → valor)' },
  { value: 'ultimos_N', label: 'Últimos N caracteres' },
  { value: 'soma', label: 'Soma de campos' },
  { value: 'concatenar', label: 'Concatenar campos' },
];

// Campos conhecidos da tabela vv_b_boletos_api
const CAMPOS_DISPONIVEIS = [
  'numero_nota', 'numero_cobranca', 'cliente', 'dyn_nome_do_cliente', 'taxnumber1', 'TaxNumber1',
  'endereco', 'bairro', 'dyn_cidade', 'uf', 'cep', 'pais',
  'banco', 'BankInternalID', 'bankinternalid', 'BankAccountLongID', 'bankaccountlongid', 'bankcontrolkey',
  'data_emissao', 'data_vencimento', 'valor', 'valor_desconto', 'valor_com_desconto',
  'nosso_numero', 'cod_barras', 'serie', 'documento', 'doc_contabil',
  'companycode', 'empresa', 'customer', 'dyn_conta', 'dyn_zonatransporte', 'dyn_desconto1',
  'PaymentDueDate', 'PostingDate', 'PaymentMethod', 'PaymentCurrency',
  'AccountingDocument', 'br_nfpartnercnpj', 'br_nfnumber', 'br_nfenumber',
  'carteira',
];

export function BoletoCampoMapeamentoConfig() {
  const { toast } = useToast();
  const { data: campos = [], isLoading } = useBoletoCampoMapeamento();
  const updateMut = useUpdateBoletoCampoMapeamento();
  const addMut = useAddBoletoCampoMapeamento();
  const deleteMut = useDeleteBoletoCampoMapeamento();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<BoletoCampoMapeamento>>({});
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newCampo, setNewCampo] = useState<Partial<BoletoCampoMapeamento>>({
    campo_boleto: '', label: '', fonte_campo: '', tipo_transformacao: 'direto', ativo: true, ordem: 99, parametros: {},
  });

  const startEdit = (c: BoletoCampoMapeamento) => {
    setEditingId(c.id);
    setEditValues({ fonte_campo: c.fonte_campo, tipo_transformacao: c.tipo_transformacao, label: c.label });
  };

  const saveEdit = async (id: string) => {
    try {
      await updateMut.mutateAsync({ id, updates: editValues as any });
      setEditingId(null);
      toast({ title: 'Salvo', description: 'Mapeamento atualizado.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleAdd = async () => {
    if (!newCampo.campo_boleto || !newCampo.fonte_campo) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    try {
      await addMut.mutateAsync(newCampo as any);
      setShowAdd(false);
      setNewCampo({ campo_boleto: '', label: '', fonte_campo: '', tipo_transformacao: 'direto', ativo: true, ordem: 99, parametros: {} });
      toast({ title: 'Adicionado', description: 'Novo mapeamento criado.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: 'Removido' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    await updateMut.mutateAsync({ id, updates: { ativo } as any });
  };

  const filteredCampos = campos.filter(c =>
    !search || c.campo_boleto.toLowerCase().includes(search.toLowerCase()) ||
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.fonte_campo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowUpDown className="h-5 w-5" />
          Mapeamento de Campos do Boleto
        </CardTitle>
        <CardDescription>
          Configure quais campos da tabela de boletos são usados em cada posição do boleto impresso.
          Alterações aqui refletem imediatamente na geração dos PDFs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por campo, label ou fonte..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>

        {showAdd && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Campo Boleto</Label>
                <Input
                  placeholder="Ex: pagador_nome"
                  value={newCampo.campo_boleto}
                  onChange={e => setNewCampo(p => ({ ...p, campo_boleto: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Label</Label>
                <Input
                  placeholder="Ex: Nome do Pagador"
                  value={newCampo.label}
                  onChange={e => setNewCampo(p => ({ ...p, label: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Campo Fonte</Label>
                <Select value={newCampo.fonte_campo} onValueChange={v => setNewCampo(p => ({ ...p, fonte_campo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {CAMPOS_DISPONIVEIS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={newCampo.tipo_transformacao} onValueChange={v => setNewCampo(p => ({ ...p, tipo_transformacao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_TRANSFORMACAO.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleAdd} disabled={addMut.isPending}>
                <Save className="h-4 w-4 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : (
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Ativo</TableHead>
                  <TableHead>Campo Boleto</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Campo Fonte (Tabela)</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampos.map(c => (
                  <TableRow key={c.id} className={!c.ativo ? 'opacity-50' : ''}>
                    <TableCell>
                      <Switch
                        checked={c.ativo}
                        onCheckedChange={checked => handleToggleAtivo(c.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{c.campo_boleto}</Badge>
                    </TableCell>
                    <TableCell>
                      {editingId === c.id ? (
                        <Input
                          value={editValues.label || ''}
                          onChange={e => setEditValues(p => ({ ...p, label: e.target.value }))}
                          className="h-8"
                        />
                      ) : (
                        c.label
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === c.id ? (
                        <Select
                          value={editValues.fonte_campo || ''}
                          onValueChange={v => setEditValues(p => ({ ...p, fonte_campo: v }))}
                        >
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CAMPOS_DISPONIVEIS.map(campo => (
                              <SelectItem key={campo} value={campo}>{campo}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{c.fonte_campo}</code>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === c.id ? (
                        <Select
                          value={editValues.tipo_transformacao || 'direto'}
                          onValueChange={v => setEditValues(p => ({ ...p, tipo_transformacao: v }))}
                        >
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIPOS_TRANSFORMACAO.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">{c.tipo_transformacao}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === c.id ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(c.id)}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCampos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum mapeamento encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
