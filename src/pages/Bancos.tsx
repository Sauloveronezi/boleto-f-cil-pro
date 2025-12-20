import { useState } from 'react';
import { Building2, Settings, Percent, Calendar, FileText, Edit } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { BANCOS_SUPORTADOS } from '@/data/bancos';
import { Banco, ConfiguracaoBanco, TIPOS_IMPRESSAO } from '@/types/boleto';
import { useToast } from '@/hooks/use-toast';

export default function Bancos() {
  const { toast } = useToast();
  const [bancoEditando, setBancoEditando] = useState<Banco | null>(null);
  const [configEditando, setConfigEditando] = useState<ConfiguracaoBanco | null>(null);

  const getConfiguracao = (bancoId: string) => {
    // Sem mocks, retorna undefined por enquanto
    return undefined;
  };

  const handleSalvar = () => {
    toast({
      title: 'Configurações salvas',
      description: 'As configurações do banco foram atualizadas com sucesso.',
    });
    setBancoEditando(null);
    setConfigEditando(null);
  };

  const handleEditar = (banco: Banco) => {
    setBancoEditando(banco);
    const config = getConfiguracao(banco.id);
    setConfigEditando(config || null);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bancos</h1>
          <p className="text-muted-foreground">
            Configure os bancos emissores e suas respectivas taxas e instruções
          </p>
        </div>

        {/* Grid de Bancos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BANCOS_SUPORTADOS.map((banco) => {
            const config = getConfiguracao(banco.id);
            return (
              <Card key={banco.id} className="hover:shadow-card-hover transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{banco.nome_banco}</CardTitle>
                        <p className="text-sm text-muted-foreground">Código: {banco.codigo_banco}</p>
                      </div>
                    </div>
                    <Badge variant={banco.ativo ? 'default' : 'secondary'}>
                      {banco.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Layout: {TIPOS_IMPRESSAO[banco.tipo_layout_padrao].label}
                    </span>
                  </div>

                  {config && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Juros ao mês
                        </span>
                        <span className="font-medium">{config.taxa_juros_mensal}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Multa
                        </span>
                        <span className="font-medium">{config.multa_percentual}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Carência
                        </span>
                        <span className="font-medium">{config.dias_carencia} dia(s)</span>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => handleEditar(banco)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Modal de Edição */}
        <Dialog open={!!bancoEditando} onOpenChange={() => setBancoEditando(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar {bancoEditando?.nome_banco}
              </DialogTitle>
            </DialogHeader>

            {bancoEditando && (
              <div className="space-y-6">
                {/* Taxas */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    Taxas e Multas
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Configure as taxas de juros e multa que serão aplicadas aos
                            boletos vencidos deste banco.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Juros ao mês (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        defaultValue={configEditando?.taxa_juros_mensal || 1}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Multa (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        defaultValue={configEditando?.multa_percentual || 2}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Dias de carência</Label>
                      <Input
                        type="number"
                        defaultValue={configEditando?.dias_carencia || 0}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Dados bancários */}
                <div className="space-y-4">
                  <h3 className="font-medium">Dados Bancários</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Carteira</Label>
                      <Input
                        defaultValue={configEditando?.carteira || ''}
                        className="mt-1"
                        placeholder="Ex: 17"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Agência</Label>
                      <Input
                        defaultValue={configEditando?.agencia || ''}
                        className="mt-1"
                        placeholder="Ex: 1234"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Conta</Label>
                      <Input
                        defaultValue={configEditando?.conta || ''}
                        className="mt-1"
                        placeholder="Ex: 56789-0"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Código do Cedente</Label>
                      <Input
                        defaultValue={configEditando?.codigo_cedente || ''}
                        className="mt-1"
                        placeholder="Ex: 123456"
                      />
                    </div>
                  </div>
                </div>

                {/* Instruções */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    Texto de Instrução Padrão
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Este texto aparecerá nas instruções do boleto. Você pode usar
                            variáveis como {'{{taxa_juros}}'} e {'{{multa}}'}.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Textarea
                    defaultValue={configEditando?.texto_instrucao_padrao || ''}
                    placeholder="Ex: Não receber após 30 dias do vencimento. Cobrar juros de {{taxa_juros}}% ao mês..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setBancoEditando(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvar}>Salvar Configurações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
