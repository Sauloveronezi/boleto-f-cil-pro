import { FileText, Download, Building2, Users, Receipt, Palette, Database } from 'lucide-react';
import { Banco, Cliente, NotaFiscal, ModeloBoleto, TipoOrigem, TIPOS_ORIGEM } from '@/types/boleto';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface ResumoGeracaoProps {
  tipoOrigem: TipoOrigem | null;
  banco: Banco | null;
  clientes: Cliente[];
  clientesSelecionados: string[];
  notas: NotaFiscal[];
  notasSelecionadas: string[];
  modelos: ModeloBoleto[];
  modeloSelecionado: string | null;
  onModeloChange: (modeloId: string) => void;
  tipoSaida: 'arquivo_unico' | 'individual';
  onTipoSaidaChange: (tipo: 'arquivo_unico' | 'individual') => void;
  onGerar: () => void;
}

export function ResumoGeracao({
  tipoOrigem,
  banco,
  clientes,
  clientesSelecionados,
  notas,
  notasSelecionadas,
  modelos,
  modeloSelecionado,
  onModeloChange,
  tipoSaida,
  onTipoSaidaChange,
  onGerar,
}: ResumoGeracaoProps) {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const notasSelecionadasData = notas.filter((n) => notasSelecionadas.includes(n.id));
  const valorTotal = notasSelecionadasData.reduce((acc, n) => acc + n.valor_titulo, 0);

  // Modelos do banco OU modelos genéricos (caso não haja específico para o banco)
  const modelosDoBanco = modelos.filter((m) => m.banco_id === banco?.id);
  const modelosDisponiveis = modelosDoBanco.length > 0 ? modelosDoBanco : modelos;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Origem</p>
                <p className="font-semibold">
                  {tipoOrigem ? TIPOS_ORIGEM[tipoOrigem].label : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Banco Emissor</p>
                <p className="font-semibold">{banco?.nome_banco || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clientes</p>
                <p className="font-semibold">{clientesSelecionados.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Boletos</p>
                <p className="font-semibold">{notasSelecionadas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Valor Total */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total dos Boletos</p>
              <p className="text-3xl font-bold text-primary">{formatarMoeda(valorTotal)}</p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-1">
              {notasSelecionadas.length} boleto(s)
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seleção de Modelo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5" />
              Modelo de Layout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o modelo de layout para os boletos. O modelo define como os dados
              serão apresentados no boleto impresso.
            </p>
            <Select value={modeloSelecionado || ''} onValueChange={onModeloChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent>
                {modelosDisponiveis.map((modelo) => (
                  <SelectItem key={modelo.id} value={modelo.id}>
                    {modelo.nome_modelo}
                    {modelo.padrao && ' (Padrão)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {modelosDisponiveis.length === 0 && (
              <p className="text-sm text-warning">
                Nenhum modelo disponível para o banco selecionado. Configure um modelo
                em "Modelos de Layout".
              </p>
            )}
          </CardContent>
        </Card>

        {/* Opções de Saída */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" />
              Opções de Saída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Escolha como deseja gerar os boletos. Você pode gerar todos em um único
              arquivo ou individualmente.
            </p>
            <RadioGroup
              value={tipoSaida}
              onValueChange={(value) => onTipoSaidaChange(value as 'arquivo_unico' | 'individual')}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="arquivo_unico" id="arquivo_unico" className="mt-1" />
                <div>
                  <Label htmlFor="arquivo_unico" className="font-medium cursor-pointer">
                    Arquivo Único
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gera um único PDF com todos os boletos em sequência
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="individual" id="individual" className="mt-1" />
                <div>
                  <Label htmlFor="individual" className="font-medium cursor-pointer">
                    Boleto a Boleto
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gera um arquivo para cada boleto (download em ZIP ou individual)
                  </p>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Observação sobre pré-registro */}
      <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-warning">Atenção:</strong> Os boletos serão gerados em modo de{' '}
          <strong>pré-registro</strong>. Após a geração, você poderá registrá-los no banco
          através da opção "Registrar no Banco" (em breve).
        </p>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-4">
        <Button
          size="lg"
          onClick={onGerar}
          disabled={!modeloSelecionado || notasSelecionadas.length === 0}
          className="px-8"
        >
          <Download className="h-5 w-5 mr-2" />
          Gerar {notasSelecionadas.length} Boleto(s)
        </Button>
      </div>
    </div>
  );
}
