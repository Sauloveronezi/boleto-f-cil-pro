import { useState, useMemo } from 'react';
import { Settings, Plus, Trash2, Eye, EyeOff, Pencil, Check, X } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// All known columns from vv_b_boletos_api table
const ALL_TABLE_COLUMNS: { chave: string; labelPadrao: string }[] = [
  { chave: 'numero_nota', labelPadrao: 'Nº Nota' },
  { chave: 'numero_cobranca', labelPadrao: 'Nº Cobrança' },
  { chave: 'cliente', labelPadrao: 'Cliente' },
  { chave: 'cnpj', labelPadrao: 'CNPJ' },
  { chave: 'transportadora', labelPadrao: 'Transportadora' },
  { chave: 'banco', labelPadrao: 'Banco' },
  { chave: 'data_emissao', labelPadrao: 'Emissão' },
  { chave: 'data_vencimento', labelPadrao: 'Vencimento' },
  { chave: 'valor', labelPadrao: 'Valor' },
  { chave: 'status', labelPadrao: 'Status' },
  { chave: 'documento', labelPadrao: 'Documento' },
  { chave: 'doc_contabil', labelPadrao: 'Doc. Contábil' },
  { chave: 'serie', labelPadrao: 'Série' },
  { chave: 'nosso_numero', labelPadrao: 'Nosso Número' },
  { chave: 'carteira', labelPadrao: 'Carteira' },
  { chave: 'cod_barras', labelPadrao: 'Cód. Barras' },
  { chave: 'valor_desconto', labelPadrao: 'Desconto' },
  { chave: 'valor_com_desconto', labelPadrao: 'Valor c/ Desconto' },
  { chave: 'data_desconto', labelPadrao: 'Data Desconto' },
  { chave: 'endereco', labelPadrao: 'Endereço' },
  { chave: 'bairro', labelPadrao: 'Bairro' },
  { chave: 'cep', labelPadrao: 'CEP' },
  { chave: 'uf', labelPadrao: 'UF' },
  { chave: 'pais', labelPadrao: 'País' },
  { chave: 'empresa', labelPadrao: 'Empresa' },
  { chave: 'companycode', labelPadrao: 'Company Code' },
  { chave: 'customer', labelPadrao: 'Customer' },
  { chave: 'dyn_nome_do_cliente', labelPadrao: 'Nome do Cliente (dyn)' },
  { chave: 'dyn_cidade', labelPadrao: 'Cidade (dyn)' },
  { chave: 'dyn_zonatransporte', labelPadrao: 'Zona Transporte (dyn)' },
  { chave: 'dyn_conta', labelPadrao: 'Conta (dyn)' },
  { chave: 'dyn_desconto1', labelPadrao: 'Desconto 1 (dyn)' },
  { chave: 'AccountingDocument', labelPadrao: 'Accounting Document' },
  { chave: 'accountingdocumenttype', labelPadrao: 'Tipo Doc. Contábil' },
  { chave: 'BankInternalID', labelPadrao: 'Bank Internal ID' },
  { chave: 'BankAccountLongID', labelPadrao: 'Bank Account Long ID' },
  { chave: 'bankcontrolkey', labelPadrao: 'Bank Control Key' },
  { chave: 'billingdocument', labelPadrao: 'Billing Document' },
  { chave: 'br_nfenumber', labelPadrao: 'NF-e Number' },
  { chave: 'br_nfnumber', labelPadrao: 'NF Number' },
  { chave: 'br_nfpartnercnpj', labelPadrao: 'NF Partner CNPJ' },
  { chave: 'BR_NFPartnerFunction', labelPadrao: 'NF Partner Function' },
  { chave: 'br_nfsourcedocumenttype', labelPadrao: 'NF Source Doc Type' },
  { chave: 'br_nfsubseries', labelPadrao: 'NF Sub Séries' },
  { chave: 'taxnumber1', labelPadrao: 'Tax Number 1' },
  { chave: 'CashDiscount1Days', labelPadrao: 'Desconto 1 Dias' },
  { chave: 'CashDiscount1Percent', labelPadrao: 'Desconto 1 %' },
  { chave: 'CashDiscount1DueDate', labelPadrao: 'Data Desconto 1' },
  { chave: 'CashDiscount2Days', labelPadrao: 'Desconto 2 Dias' },
  { chave: 'CashDiscountAmountInFuncnlCrcy', labelPadrao: 'Desconto Moeda Func.' },
  { chave: 'CashDiscountAmtInCoCodeCrcy', labelPadrao: 'Desconto CoCode' },
  { chave: 'CashDiscountAmtInTransacCrcy', labelPadrao: 'Desconto Transação' },
  { chave: 'DocumentReferenceID', labelPadrao: 'Ref. Documento' },
  { chave: 'FinancialAccountType', labelPadrao: 'Tipo Conta Financeira' },
  { chave: 'PaymentMethod', labelPadrao: 'Método Pagamento' },
  { chave: 'PaymentCurrency', labelPadrao: 'Moeda Pagamento' },
  { chave: 'PaymentDueDate', labelPadrao: 'Data Vencimento (Pay)' },
  { chave: 'PaymentOrigin', labelPadrao: 'Origem Pagamento' },
  { chave: 'PostingDate', labelPadrao: 'Data Lançamento' },
  { chave: 'paymentreference', labelPadrao: 'Ref. Pagamento' },
  { chave: 'paymentrundate', labelPadrao: 'Data Execução Pgto' },
  { chave: 'PaymentRunIsProposal', labelPadrao: 'Proposta Pagamento' },
  { chave: 'AmountInFunctionalCurrency', labelPadrao: 'Valor Moeda Func.' },
  { chave: 'PaymentAmountInFunctionalCrcy', labelPadrao: 'Pgto Moeda Func.' },
  { chave: 'PaytAmountInCoCodeCurrency', labelPadrao: 'Pgto CoCode' },
  { chave: 'payeeadditionalname', labelPadrao: 'Nome Adicional' },
  { chave: 'payeeregion', labelPadrao: 'Região Beneficiário' },
  { chave: 'yy1_custtranspzone_sdh', labelPadrao: 'Zona Transporte SDH' },
  { chave: 'yy1_custtranspzonpais_sdh', labelPadrao: 'Zona Transp. País SDH' },
];

export function BoletosApiConfigDialog() {
  const { data: config } = useBoletosApiConfig();
  const addConfig = useAddBoletosApiConfig();
  const toggleConfig = useToggleBoletosApiConfig();
  const deleteConfig = useDeleteBoletosApiConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [novoTipo, setNovoTipo] = useState<'coluna' | 'filtro'>('coluna');
  const [novaChave, setNovaChave] = useState('');
  const [novoLabel, setNovoLabel] = useState('');
  const [novoCampo, setNovoCampo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const colunas = config?.filter(c => c.tipo === 'coluna') || [];
  const filtros = config?.filter(c => c.tipo === 'filtro') || [];

  // Columns from table not yet added
  const colunasNaoAdicionadas = useMemo(() => {
    const chavesExistentes = new Set(colunas.map(c => c.chave));
    return ALL_TABLE_COLUMNS.filter(c => !chavesExistentes.has(c.chave));
  }, [colunas]);

  const filteredNaoAdicionadas = useMemo(() => {
    if (!searchTerm) return colunasNaoAdicionadas;
    const lower = searchTerm.toLowerCase();
    return colunasNaoAdicionadas.filter(c =>
      c.chave.toLowerCase().includes(lower) || c.labelPadrao.toLowerCase().includes(lower)
    );
  }, [colunasNaoAdicionadas, searchTerm]);

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

  const handleAddFromTable = (chave: string, label: string) => {
    addConfig.mutate({
      tipo: 'coluna',
      chave,
      label,
      campo_boleto: chave,
      ordem: colunas.length + 1,
    });
  };

  const handleSaveLabel = async (id: string) => {
    if (!editingLabel.trim()) return;
    const { error } = await supabase
      .from('vv_b_boletos_api_config' as any)
      .update({ label: editingLabel.trim(), updated_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['boletos-api-config'] });
    }
    setEditingId(null);
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
                {editingId === item.id ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <Input
                      value={editingLabel}
                      onChange={e => setEditingLabel(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveLabel(item.id); if (e.key === 'Escape') setEditingId(null); }}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveLabel(item.id)}>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm truncate">{item.label}</span>
                    {item.campo_boleto && item.campo_boleto !== item.chave && (
                      <span className="text-xs text-muted-foreground truncate">→ {item.campo_boleto}</span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                {editingId !== item.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setEditingId(item.id); setEditingLabel(item.label); }}
                    title="Editar label"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
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
          {/* Adicionar novo manual */}
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

          {/* Colunas configuradas */}
          {renderList(colunas, 'Colunas da Tabela')}

          {/* Filtros configurados */}
          {renderList(filtros, 'Filtros Disponíveis')}

          {/* Colunas disponíveis para adicionar */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-2">
              Campos Disponíveis ({colunasNaoAdicionadas.length})
            </h4>
            <Input
              placeholder="Pesquisar campo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="mb-2"
            />
            {filteredNaoAdicionadas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Todos os campos já foram adicionados</p>
            ) : (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {filteredNaoAdicionadas.map(col => (
                  <div
                    key={col.chave}
                    className="flex items-center justify-between p-2 rounded border border-dashed border-border bg-background hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge variant="outline" className="text-xs shrink-0 max-w-[140px] truncate">
                        {col.chave}
                      </Badge>
                      <span className="text-sm text-muted-foreground truncate">{col.labelPadrao}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleAddFromTable(col.chave, col.labelPadrao)}
                      disabled={addConfig.isPending}
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
