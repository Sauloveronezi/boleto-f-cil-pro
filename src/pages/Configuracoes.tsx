import { useState } from 'react';
import { Settings, Server, Shield, Database, Globe, ToggleLeft, ToggleRight, Save, AlertTriangle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Configuracoes() {
  const { toast } = useToast();
  const [modoDemo, setModoDemo] = useState(true);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiToken, setApiToken] = useState('');

  const handleSalvar = () => {
    toast({
      title: 'Configurações salvas',
      description: 'As configurações do sistema foram atualizadas com sucesso.',
    });
  };

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

        {/* Modo de Operação */}
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

        {/* Configuração de API */}
        <Card className={modoDemo ? 'opacity-60' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5" />
              Conexão com API / CDS
              {modoDemo && (
                <Badge variant="outline" className="ml-2">
                  Desativado no modo demo
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Configure a conexão com a API de dados (ex.: SAP S/4HANA, CDS Views).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  Endpoint da API
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          URL base da API que fornece os dados de clientes e notas fiscais.
                          Ex.: https://api.suaempresa.com/v1
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="https://api.suaempresa.com/v1"
                  disabled={modoDemo}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  Token de Autenticação
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Token de autenticação para acesso à API. Mantenha este token seguro.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="••••••••••••••••"
                  disabled={modoDemo}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button variant="outline" disabled={modoDemo} size="sm">
                Testar Conexão
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Segurança */}
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
