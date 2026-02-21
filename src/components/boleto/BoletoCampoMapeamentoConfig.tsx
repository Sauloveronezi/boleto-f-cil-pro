import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Save, X, Plus, Trash2, Search, ArrowUpDown, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useBoletoCampoMapeamento,
  useUpdateBoletoCampoMapeamento,
  useAddBoletoCampoMapeamento,
  useDeleteBoletoCampoMapeamento,
  BoletoCampoMapeamento,
} from '@/hooks/useBoletoCampoMapeamento';

const TIPOS_TRANSFORMACAO = [
  { value: 'direto', label: 'Direto (campo → valor)' },
  { value: 'primeiros_N', label: 'Primeiros N caracteres' },
  { value: 'ultimos_N', label: 'Últimos N caracteres' },
  { value: 'soma', label: 'Soma de campos' },
  { value: 'concatenar', label: 'Concatenar campos' },
  { value: 'composicao', label: 'Composição (partes de vários campos)' },
];

// Campos da tabela vv_b_boletos_api - lista completa ordenada alfabeticamente
const CAMPOS_DISPONIVEIS = [
  'accountingdocument',
  'AccountingDocument',
  'accountingdocumenttype',
  'bairro',
  'banco',
  'bankaccountlongid',
  'BankAccountLongID',
  'bankcontrolkey',
  'bankinternalid',
  'BankInternalID',
  'billingdocument',
  'br_nfenumber',
  'br_nfnumber',
  'br_nfpartnercnpj',
  'BR_NFPartnerFunction',
  'br_nfsourcedocumenttype',
  'br_nfsubseries',
  'carteira',
  'CashDiscount1Days',
  'CashDiscount1Percent',
  'CashDiscount2Days',
  'cashdiscountamountinfuncnlcrcy',
  'CashDiscountAmountInFuncnlCrcy',
  'cashdiscountamtincocodecrcy',
  'CashDiscountAmtInCoCodeCrcy',
  'cashdiscountamtintransaccrcy',
  'CashDiscountAmtInTransacCrcy',
  'cep',
  'cliente',
  'cliente_id',
  'cod_barras',
  'companycode',
  'customer',
  'dados_extras',
  'data_desconto',
  'data_emissao',
  'data_vencimento',
  'doc_contabil',
  'documento',
  'DocumentReferenceID',
  'dyn_cidade',
  'dyn_conta',
  'dyn_desconto1',
  'dyn_nome_do_cliente',
  'dyn_zonatransporte',
  'empresa',
  'endereco',
  'FinancialAccountType',
  'nosso_numero',
  'numero_cobranca',
  'numero_nota',
  'pais',
  'payeeadditionalname',
  'payeeregion',
  'paymentamountinfunctionalcrcy',
  'PaymentAmountInFunctionalCrcy',
  'paymentcurrency',
  'PaymentCurrency',
  'PaymentDueDate',
  'PaymentMethod',
  'paymentorigin',
  'PaymentOrigin',
  'paymentreference',
  'paymentrundate',
  'paymentrunisproposal',
  'PaymentRunIsProposal',
  'paytamountincocodecurrency',
  'PaytAmountInCoCodeCurrency',
  'PostingDate',
  'serie',
  'taxnumber1',
  'TaxNumber1',
  'uf',
  'valor',
  'valor_com_desconto',
  'valor_desconto',
  'yy1_custtranspzone_sdh',
  'yy1_custtranspzonpais_sdh',
].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

/** Combobox com pesquisa para selecionar campo fonte */
function CampoFonteCombobox({
  value,
  onValueChange,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between font-normal', className)}
        >
          <span className="truncate">{value || 'Selecione...'}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar campo..." />
          <CommandList>
            <CommandEmpty>Nenhum campo encontrado.</CommandEmpty>
            <CommandGroup>
              {CAMPOS_DISPONIVEIS.map((campo) => (
                <CommandItem
                  key={campo}
                  value={campo}
                  onSelect={() => {
                    onValueChange(campo);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-3.5 w-3.5', value === campo ? 'opacity-100' : 'opacity-0')} />
                  {campo}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Editor de parâmetros para soma/concatenar */
function ParametrosEditor({
  tipo,
  parametros,
  onChange,
}: {
  tipo: string;
  parametros: Record<string, any>;
  onChange: (p: Record<string, any>) => void;
}) {
  const campos: string[] = parametros?.campos || [];

  if (tipo === 'ultimos_N' || tipo === 'primeiros_N') {
    return (
      <div className="flex items-center gap-2 mt-1">
        <Label className="text-xs whitespace-nowrap">N caracteres:</Label>
        <Input
          type="number"
          className="h-7 w-20"
          value={parametros?.n || ''}
          onChange={(e) => onChange({ ...parametros, n: parseInt(e.target.value) || 0 })}
        />
      </div>
    );
  }

  if (tipo === 'soma' || tipo === 'concatenar') {
    return (
      <div className="space-y-2 mt-1">
        <Label className="text-xs">
          Campos para {tipo === 'soma' ? 'somar' : 'concatenar'}:
        </Label>
        {campos.map((c, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <CampoFonteCombobox
              value={c}
              onValueChange={(v) => {
                const novo = [...campos];
                novo[idx] = v;
                onChange({ ...parametros, campos: novo });
              }}
              className="h-7 flex-1 text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => {
                const novo = campos.filter((_, i) => i !== idx);
                onChange({ ...parametros, campos: novo });
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {tipo === 'concatenar' && campos.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Separador:</Label>
            <Input
              className="h-7 w-20"
              placeholder="ex: / "
              value={parametros?.separador || ''}
              onChange={(e) => onChange({ ...parametros, separador: e.target.value })}
            />
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onChange({ ...parametros, campos: [...campos, ''] })}
        >
          <Plus className="h-3 w-3 mr-1" /> Adicionar campo
        </Button>
      </div>
    );
  }

  if (tipo === 'composicao') {
    const partes: Array<{ campo: string; extracao: string; n?: number; separador?: string }> =
      parametros?.partes || [];

    const updateParte = (idx: number, key: string, value: any) => {
      const novas = [...partes];
      novas[idx] = { ...novas[idx], [key]: value };
      onChange({ ...parametros, partes: novas });
    };

    const removeParte = (idx: number) => {
      onChange({ ...parametros, partes: partes.filter((_, i) => i !== idx) });
    };

    const addParte = () => {
      onChange({
        ...parametros,
        partes: [...partes, { campo: '', extracao: 'completo', n: 4, separador: '' }],
      });
    };

    return (
      <div className="space-y-3 mt-1 min-w-[340px]">
        <Label className="text-xs">
          Partes da composição (cada parte extrai dados de um campo):
        </Label>
        {partes.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            Ex: últimos 4 de BankInternalID + "/" + BankAccountLongID + "-" + bankcontrolkey
          </p>
        )}
        {partes.map((parte, idx) => (
          <div key={idx} className="border rounded p-3 space-y-2 bg-background">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] shrink-0">Parte {idx + 1}</Badge>
              {idx > 0 && (
                <div className="flex items-center gap-1">
                  <Label className="text-[10px] whitespace-nowrap">Separador antes:</Label>
                  <Input
                    className="h-6 w-16 text-xs text-center"
                    placeholder="/ ou -"
                    value={parte.separador || ''}
                    onChange={(e) => updateParte(idx, 'separador', e.target.value)}
                  />
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive shrink-0"
                onClick={() => removeParte(idx)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-[10px]">Campo</Label>
                <CampoFonteCombobox
                  value={parte.campo || ''}
                  onValueChange={(v) => updateParte(idx, 'campo', v)}
                  className="h-8 w-full text-xs"
                />
                {parte.campo && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                    Selecionado: <strong>{parte.campo}</strong>
                  </span>
                )}
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-[10px]">Extração</Label>
                  <Select
                    value={parte.extracao || 'completo'}
                    onValueChange={(v) => updateParte(idx, 'extracao', v)}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completo">Valor completo</SelectItem>
                      <SelectItem value="primeiros">Primeiros N dígitos</SelectItem>
                      <SelectItem value="ultimos">Últimos N dígitos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(parte.extracao === 'primeiros' || parte.extracao === 'ultimos') && (
                  <div className="w-20 shrink-0">
                    <Label className="text-[10px]">N dígitos</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={parte.n || ''}
                      onChange={(e) => updateParte(idx, 'n', parseInt(e.target.value) || 0)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addParte}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar parte
        </Button>
        {partes.length > 0 && (
          <div className="text-xs text-muted-foreground bg-muted rounded p-2 break-words">
            <strong>Preview:</strong>{' '}
            {partes.map((p, i) => {
              let desc = p.campo || '???';
              if (p.extracao === 'primeiros') desc = `primeiros ${p.n || '?'} de ${desc}`;
              if (p.extracao === 'ultimos') desc = `últimos ${p.n || '?'} de ${desc}`;
              return (i > 0 && p.separador ? ` "${p.separador}" ${desc}` : desc);
            }).join(' + ')}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function BoletoCampoMapeamentoConfig() {
  const { toast } = useToast();
  const { data: campos = [], isLoading } = useBoletoCampoMapeamento();
  const updateMut = useUpdateBoletoCampoMapeamento();
  const addMut = useAddBoletoCampoMapeamento();
  const deleteMut = useDeleteBoletoCampoMapeamento();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<BoletoCampoMapeamento> & { parametros?: Record<string, any> }>({});
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newCampo, setNewCampo] = useState<Partial<BoletoCampoMapeamento>>({
    campo_boleto: '', label: '', fonte_campo: '', tipo_transformacao: 'direto', ativo: true, ordem: 99, parametros: {},
  });

  const startEdit = (c: BoletoCampoMapeamento) => {
    setEditingId(c.id);
    setEditValues({
      fonte_campo: c.fonte_campo,
      tipo_transformacao: c.tipo_transformacao,
      label: c.label,
      parametros: c.parametros || {},
    });
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
    <Card className="overflow-hidden">
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
                <CampoFonteCombobox
                  value={newCampo.fonte_campo || ''}
                  onValueChange={v => setNewCampo(p => ({ ...p, fonte_campo: v }))}
                  className="w-full h-9"
                />
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
            {(newCampo.tipo_transformacao !== 'direto') && (
              <ParametrosEditor
                tipo={newCampo.tipo_transformacao}
                parametros={(newCampo.parametros as Record<string, any>) || {}}
                onChange={(p) => setNewCampo(prev => ({ ...prev, parametros: p }))}
              />
            )}
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
          <div className="border rounded-lg overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Ativo</TableHead>
                  <TableHead className="min-w-[120px]">Campo Boleto</TableHead>
                  <TableHead className="min-w-[120px]">Label</TableHead>
                  <TableHead className="min-w-[150px]">Campo Fonte (Tabela)</TableHead>
                  <TableHead className="min-w-[200px]">Tipo</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
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
                    <TableCell className="truncate">
                      <Badge variant="outline" className="font-mono text-xs max-w-full truncate">{c.campo_boleto}</Badge>
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
                        <CampoFonteCombobox
                          value={editValues.fonte_campo || ''}
                          onValueChange={v => setEditValues(p => ({ ...p, fonte_campo: v }))}
                          className="h-8 w-full"
                        />
                      ) : (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded block truncate">{c.fonte_campo}</code>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === c.id ? (
                        <div className="space-y-1">
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
                          <ParametrosEditor
                            tipo={editValues.tipo_transformacao || 'direto'}
                            parametros={editValues.parametros || {}}
                            onChange={(p) => setEditValues(prev => ({ ...prev, parametros: p }))}
                          />
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            {TIPOS_TRANSFORMACAO.find(t => t.value === c.tipo_transformacao)?.label || c.tipo_transformacao}
                          </span>
                          {(c.tipo_transformacao === 'soma' || c.tipo_transformacao === 'concatenar') && c.parametros?.campos?.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              ({(c.parametros.campos as string[]).join(c.tipo_transformacao === 'concatenar' ? ` ${c.parametros.separador || '+'} ` : ' + ')})
                            </div>
                          )}
                          {(c.tipo_transformacao === 'ultimos_N' || c.tipo_transformacao === 'primeiros_N') && c.parametros?.n && (
                            <span className="text-xs text-muted-foreground ml-1">(N={c.parametros.n})</span>
                          )}
                          {c.tipo_transformacao === 'composicao' && c.parametros?.partes?.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {(c.parametros.partes as Array<any>).map((p: any, i: number) => {
                                let desc = p.campo || '?';
                                if (p.extracao === 'primeiros') desc = `${desc}[0:${p.n}]`;
                                if (p.extracao === 'ultimos') desc = `${desc}[-${p.n}:]`;
                                return (i > 0 && p.separador ? `"${p.separador}"${desc}` : desc);
                              }).join(' + ')}
                            </div>
                          )}
                        </div>
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
