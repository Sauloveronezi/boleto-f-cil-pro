import { useState, useEffect } from 'react';
import { Settings, Server, Shield, Database, Globe, ToggleLeft, ToggleRight, Save, AlertTriangle, Building2, MapPin } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DadosEmpresa, EMPRESA_PADRAO, salvarDadosEmpresa, carregarDadosEmpresa } from '@/types/empresa';
import { ApiConfigCard } from '@/components/api/ApiConfigCard';
import { BoletoCampoMapeamentoConfig } from '@/components/boleto/BoletoCampoMapeamentoConfig';
import { usePermissoes } from '@/hooks/usePermissoes';
import { Protected } from '@/components/auth/Protected';
import { Loader2 } from 'lucide-react';

export default function Configuracoes() {
  const { toast } = useToast();
  const { isLoading: isLoadingPermissoes } = usePermissoes();
  const [modoDemo, setModoDemo] = useState(true);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [empresa, setEmpresa] = useState<DadosEmpresa>(EMPRESA_PADRAO);

  useEffect(() => {
    const dadosSalvos = carregarDadosEmpresa();
    setEmpresa(dadosSalvos);
  }, []);

  const handleSalvar = () => {
    salvarDadosEmpresa(empresa);
    toast({
      title: 'Configurações salvas',
      description: 'As configurações do sistema foram atualizadas com sucesso.',
    });
  };

  const atualizarEmpresa = (campo: keyof DadosEmpresa, valor: string) => {
    setEmpresa(prev => ({ ...prev, [campo]: valor }));
  };

  if (isLoadingPermissoes) {
    return (
      <MainLayout modoDemo={modoDemo}>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout modoDemo={modoDemo}>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Configure as opções do sistema e integrações
          </p>
        </div>

        <Tabs defaultValue="empresa" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <Protected modulo="configuracoes">
              <TabsTrigger value="empresa">Empresa</TabsTrigger>
            </Protected>
            <Protected modulo="configuracoes">
              <TabsTrigger value="operacao">Operação</TabsTrigger>
            </Protected>
            <Protected modulo="integracoes">
              <TabsTrigger value="api">API</TabsTrigger>
            </Protected>
            <Protected modulo="configuracoes">
              <TabsTrigger value="mapeamento">Mapeamento Boleto</TabsTrigger>
            </Protected>
            <Protected modulo="configuracoes">
              <TabsTrigger value="seguranca">Segurança</TabsTrigger>
            </Protected>
          </TabsList>

          {/* Dados da Empresa */}
          <Protected modulo="configuracoes">
            <TabsContent value="empresa" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5" />
                    Dados da Empresa (Beneficiário)
                  </CardTitle>
                  <CardDescription>
                    Configure os dados da empresa que aparecerão nos boletos como beneficiário
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Razão Social *</Label>
                      <Input
                        value={empresa.razaoSocial}
                        onChange={(e) => atualizarEmpresa('razaoSocial', e.target.value)}
                        placeholder="Razão Social da Empresa"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Nome Fantasia</Label>
                      <Input
                        value={empresa.nomeFantasia}
                        onChange={(e) => atualizarEmpresa('nomeFantasia', e.target.value)}
                        placeholder="Nome Fantasia"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>CNPJ *</Label>
                    <Input
                      value={empresa.cnpj}
                      onChange={(e) => atualizarEmpresa('cnpj', e.target.value)}
                      placeholder="00.000.000/0001-00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Inscrição Estadual</Label>
                    <Input
                      value={empresa.inscricaoEstadual}
                      onChange={(e) => atualizarEmpresa('inscricaoEstadual', e.target.value)}
                      placeholder="Inscrição Estadual"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Inscrição Municipal</Label>
                    <Input
                      value={empresa.inscricaoMunicipal}
                      onChange={(e) => atualizarEmpresa('inscricaoMunicipal', e.target.value)}
                      placeholder="Inscrição Municipal"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Label>Logradouro</Label>
                    <Input
                      value={empresa.endereco}
                      onChange={(e) => atualizarEmpresa('endereco', e.target.value)}
                      placeholder="Rua, Avenida, etc."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input
                      value={empresa.numero}
                      onChange={(e) => atualizarEmpresa('numero', e.target.value)}
                      placeholder="Nº"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Complemento</Label>
                    <Input
                      value={empresa.complemento}
                      onChange={(e) => atualizarEmpresa('complemento', e.target.value)}
                      placeholder="Sala, Andar, etc."
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Bairro</Label>
                    <Input
                      value={empresa.bairro}
                      onChange={(e) => atualizarEmpresa('bairro', e.target.value)}
                      placeholder="Bairro"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={empresa.cidade}
                      onChange={(e) => atualizarEmpresa('cidade', e.target.value)}
                      placeholder="Cidade"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input
                      value={empresa.estado}
                      onChange={(e) => atualizarEmpresa('estado', e.target.value)}
                      placeholder="UF"
                      maxLength={2}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>CEP</Label>
                    <Input
                      value={empresa.cep}
                      onChange={(e) => atualizarEmpresa('cep', e.target.value)}
                      placeholder="00000-000"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={empresa.telefone}
                      onChange={(e) => atualizarEmpresa('telefone', e.target.value)}
                      placeholder="(00) 0000-0000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={empresa.email}
                      onChange={(e) => atualizarEmpresa('email', e.target.value)}
                      placeholder="contato@empresa.com.br"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Site</Label>
                    <Input
                      value={empresa.site}
                      onChange={(e) => atualizarEmpresa('site', e.target.value)}
                      placeholder="www.empresa.com.br"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modo de Operação */}
          <TabsContent value="operacao" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5" />
                  Modo de Operação
                </CardTitle>
                <CardDescription>
                  Defina se o sistema deve usar dados de demonstração ou conectar-se a uma fonte de dados real.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${modoDemo ? 'bg-warning/10' : 'bg-success/10'}`}>
                      {modoDemo ? (
                        <ToggleLeft className="h-6 w-6 text-warning" />
                      ) : (
                        <ToggleRight className="h-6 w-6 text-success" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {modoDemo ? 'Modo Demonstração' : 'Modo Produção'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {modoDemo
                          ? 'Usando dados fictícios para testes e demonstração'
                          : 'Conectado a fontes de dados reais via API'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Demo</span>
                    <Switch checked={!modoDemo} onCheckedChange={(checked) => setModoDemo(!checked)} />
                    <span className="text-sm text-muted-foreground">Produção</span>
                  </div>
                </div>

                {modoDemo && (
                  <div className="flex items-start gap-3 p-4 bg-warning/5 border border-warning/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                    <div>
                      <p className="font-medium text-warning">Modo Demonstração Ativo</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        O sistema está usando dados fictícios. Para usar dados reais, desative o modo
                        demonstração e configure a conexão com sua API.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informações do Sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Server className="h-5 w-5" />
                  Informações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Versão</p>
                    <p className="font-mono">1.0.0</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ambiente</p>
                    <Badge variant={modoDemo ? 'secondary' : 'default'}>
                      {modoDemo ? 'Demonstração' : 'Produção'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Última atualização</p>
                    <p className="font-mono text-sm">2024-12-11</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="default" className="bg-success">Online</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuração de API */}
          <TabsContent value="api" className="space-y-6">
            <ApiConfigCard />
          </TabsContent>

          {/* Mapeamento de Campos do Boleto */}
          <TabsContent value="mapeamento" className="space-y-6">
            <BoletoCampoMapeamentoConfig />
          </TabsContent>

          {/* Configurações de Segurança */}
          <TabsContent value="seguranca" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  Segurança
                </CardTitle>
                <CardDescription>
                  Configurações de segurança e auditoria do sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Registrar logs de atividade</p>
                    <p className="text-sm text-muted-foreground">
                      Manter registro de todas as operações realizadas no sistema
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Validar certificados SSL</p>
                    <p className="text-sm text-muted-foreground">
                      Verificar certificados SSL nas conexões com APIs externas
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Timeout de sessão</p>
                    <p className="text-sm text-muted-foreground">
                      Tempo em minutos até a sessão expirar
                    </p>
                  </div>
                  <Input type="number" defaultValue={30} className="w-24" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          </Protected>
        </Tabs>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSalvar} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
