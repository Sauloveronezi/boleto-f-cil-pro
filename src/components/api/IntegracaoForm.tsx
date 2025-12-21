import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Edit2, TestTube, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface Integracao {
  id: string;
  nome: string;
  tipo: string;
  endpoint_base: string | null;
  modo_demo: boolean;
  campos_chave: string[];
  headers_autenticacao: Record<string, string>;
  ativo: boolean;
  json_path: string | null;
  modelo_boleto_id: string | null;
  tipo_autenticacao?: string;
  auth_usuario?: string;
  auth_senha_encrypted?: string;
  auth_token_encrypted?: string;
  auth_api_key_encrypted?: string;
  auth_header_name?: string;
  campos_api_detectados?: string[];
}

interface IntegracaoFormProps {
  integracao?: Integracao | null;
  onSave: () => void;
  onCamposDetectados?: (campos: string[]) => void;
}

const TIPOS_API = [
  { value: 'SAP', label: 'SAP' },
  { value: 'ERP', label: 'ERP Genérico' },
  { value: 'REST', label: 'API REST' },
  { value: 'SOAP', label: 'API SOAP' },
  { value: 'CUSTOM', label: 'Personalizado' },
];

const TIPOS_AUTENTICACAO = [
  { value: 'none', label: 'Sem Autenticação' },
  { value: 'basic', label: 'Basic Auth (Usuário/Senha)' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api_key', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'custom', label: 'Headers Personalizados' },
];

export function IntegracaoForm({ integracao, onSave, onCamposDetectados }: IntegracaoFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    campos?: string[];
    sample?: any;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'SAP',
    endpoint_base: '',
    json_path: 'd.results',
    campos_chave: 'numero_nota, cliente_id, numero_cobranca',
    modo_demo: true,
    ativo: true,
    tipo_autenticacao: 'none',
    auth_usuario: '',
    auth_senha: '',
    auth_token: '',
    auth_api_key: '',
    auth_header_name: 'Authorization',
    custom_headers: '',
  });

  useEffect(() => {
    if (integracao) {
      setFormData({
        nome: integracao.nome,
        tipo: integracao.tipo,
        endpoint_base: integracao.endpoint_base || '',
        json_path: integracao.json_path || 'd.results',
        campos_chave: integracao.campos_chave?.join(', ') || '',
        modo_demo: integracao.modo_demo,
        ativo: integracao.ativo,
        tipo_autenticacao: integracao.tipo_autenticacao || 'none',
        auth_usuario: integracao.auth_usuario || '',
        auth_senha: '', // Não preenchemos a senha por segurança
        auth_token: '', // Não preenchemos o token por segurança
        auth_api_key: '', // Não preenchemos a api key por segurança
        auth_header_name: integracao.auth_header_name || 'Authorization',
        custom_headers: integracao.headers_autenticacao ? JSON.stringify(integracao.headers_autenticacao, null, 2) : '',
      });
    }
  }, [integracao]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-api-connection', {
        body: {
          endpoint: formData.endpoint_base,
          json_path: formData.json_path,
          tipo_autenticacao: formData.tipo_autenticacao,
          auth_usuario: formData.auth_usuario,
          auth_senha: formData.auth_senha,
          auth_token: formData.auth_token,
          auth_api_key: formData.auth_api_key,
          auth_header_name: formData.auth_header_name,
          modo_demo: formData.modo_demo,
          integracao_id: integracao?.id,
          limit: 1
        }
      });

      if (error) throw error;

      if (data.success) {
        setTestResult({
          success: true,
          message: data.message,
          campos: data.campos_detectados,
          sample: data.sample_data
        });
        
        // Notificar componente pai sobre campos detectados
        if (onCamposDetectados && data.campos_detectados) {
          onCamposDetectados(data.campos_detectados);
        }

        toast({
          title: 'Conexão bem-sucedida!',
          description: `${data.campos_detectados?.length || 0} campos detectados.`,
        });
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message
      });
      toast({
        title: 'Erro na conexão',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome) {
      toast({
        title: 'Erro',
        description: 'Nome da integração é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Preparar headers customizados
      let headers_autenticacao = {};
      if (formData.tipo_autenticacao === 'custom' && formData.custom_headers) {
        try {
          headers_autenticacao = JSON.parse(formData.custom_headers);
        } catch {
          toast({
            title: 'Erro',
            description: 'Headers personalizados devem ser um JSON válido.',
            variant: 'destructive',
          });
          return;
        }
      }

      const payload: any = {
        nome: formData.nome,
        tipo: formData.tipo,
        endpoint_base: formData.endpoint_base || null,
        json_path: formData.json_path,
        campos_chave: formData.campos_chave.split(',').map(c => c.trim()).filter(Boolean),
        modo_demo: formData.modo_demo,
        ativo: formData.ativo,
        tipo_autenticacao: formData.tipo_autenticacao,
        auth_usuario: formData.auth_usuario || null,
        auth_header_name: formData.auth_header_name,
        headers_autenticacao,
      };

      // Adicionar campos de senha/token apenas se foram preenchidos (para não sobrescrever)
      if (formData.auth_senha) {
        payload.auth_senha_encrypted = formData.auth_senha; // Em produção, criptografar
      }
      if (formData.auth_token) {
        payload.auth_token_encrypted = formData.auth_token; // Em produção, criptografar
      }
      if (formData.auth_api_key) {
        payload.auth_api_key_encrypted = formData.auth_api_key; // Em produção, criptografar
      }

      if (integracao) {
        const { error } = await supabase
          .from('vv_b_api_integracoes')
          .update(payload)
          .eq('id', integracao.id);

        if (error) throw error;
        toast({ title: 'Integração atualizada com sucesso' });
      } else {
        const { error } = await supabase
          .from('vv_b_api_integracoes')
          .insert(payload);

        if (error) throw error;
        toast({ title: 'Integração criada com sucesso' });
      }

      queryClient.invalidateQueries({ queryKey: ['api-integracoes'] });
      setIsOpen(false);
      onSave();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!integracao) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const usuarioId = userData.user?.id ?? null;

      const { error } = await supabase
        .from('vv_b_api_integracoes')
        .update({ deleted: '*', data_delete: new Date().toISOString(), usuario_delete_id: usuarioId })
        .eq('id', integracao.id);

      if (error) throw error;

      toast({ title: 'Integração removida' });
      queryClient.invalidateQueries({ queryKey: ['api-integracoes'] });
      setIsOpen(false);
      onSave();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderAuthFields = () => {
    switch (formData.tipo_autenticacao) {
      case 'basic':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Usuário</Label>
              <Input
                value={formData.auth_usuario}
                onChange={(e) => setFormData({ ...formData, auth_usuario: e.target.value })}
                placeholder="usuario@empresa.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Senha</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.auth_senha}
                  onChange={(e) => setFormData({ ...formData, auth_senha: e.target.value })}
                  placeholder={integracao?.auth_senha_encrypted ? '••••••• (já configurada)' : 'Digite a senha'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'bearer':
        return (
          <div>
            <Label>Bearer Token</Label>
            <div className="relative mt-1">
              <Input
                type={showToken ? 'text' : 'password'}
                value={formData.auth_token}
                onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                placeholder={integracao?.auth_token_encrypted ? '••••••• (já configurado)' : 'Digite o token'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        );

      case 'api_key':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do Header</Label>
              <Input
                value={formData.auth_header_name}
                onChange={(e) => setFormData({ ...formData, auth_header_name: e.target.value })}
                placeholder="X-API-Key"
                className="mt-1"
              />
            </div>
            <div>
              <Label>API Key</Label>
              <div className="relative mt-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.auth_api_key}
                  onChange={(e) => setFormData({ ...formData, auth_api_key: e.target.value })}
                  placeholder={integracao?.auth_api_key_encrypted ? '••••••• (já configurada)' : 'Digite a API Key'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'oauth2':
        return (
          <div className="space-y-4">
            <div>
              <Label>Access Token</Label>
              <div className="relative mt-1">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={formData.auth_token}
                  onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                  placeholder={integracao?.auth_token_encrypted ? '••••••• (já configurado)' : 'Cole o access token'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Para OAuth2, configure o token de acesso obtido do provedor.
              </p>
            </div>
          </div>
        );

      case 'custom':
        return (
          <div>
            <Label>Headers Personalizados (JSON)</Label>
            <Textarea
              value={formData.custom_headers}
              onChange={(e) => setFormData({ ...formData, custom_headers: e.target.value })}
              placeholder='{"X-Custom-Header": "valor", "Authorization": "Custom token"}'
              className="mt-1 font-mono text-sm"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Digite os headers em formato JSON.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {integracao ? (
          <Button variant="ghost" size="sm">
            <Edit2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Integração
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {integracao ? 'Editar Integração' : 'Nova Integração'}
          </DialogTitle>
          <DialogDescription>
            Configure a conexão com a API externa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome da Integração *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: SAP Produção"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipo de API</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData({ ...formData, tipo: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_API.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Endpoint Base</Label>
            <Input
              value={formData.endpoint_base}
              onChange={(e) => setFormData({ ...formData, endpoint_base: e.target.value })}
              placeholder="https://api.exemplo.com/boletos"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Caminho JSON da Resposta</Label>
            <Input
              value={formData.json_path}
              onChange={(e) => setFormData({ ...formData, json_path: e.target.value })}
              placeholder="d.results"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Caminho para o array de dados na resposta (ex: d.results, data.items, results)
            </p>
          </div>

          <Separator />

          {/* Configuração de Autenticação */}
          <Accordion type="single" collapsible defaultValue="auth">
            <AccordionItem value="auth">
              <AccordionTrigger className="text-base font-medium">
                Configuração de Autenticação
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <Label>Tipo de Autenticação</Label>
                  <Select
                    value={formData.tipo_autenticacao}
                    onValueChange={(v) => setFormData({ ...formData, tipo_autenticacao: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_AUTENTICACAO.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {renderAuthFields()}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="advanced">
              <AccordionTrigger className="text-base font-medium">
                Configurações Avançadas
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <Label>Campos Chave (para duplicatas)</Label>
                  <Input
                    value={formData.campos_chave}
                    onChange={(e) => setFormData({ ...formData, campos_chave: e.target.value })}
                    placeholder="numero_nota, cliente_id, numero_cobranca"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Campos separados por vírgula que compõem a chave única
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Modo Demonstração</Label>
                    <p className="text-xs text-muted-foreground">
                      Usar dados fictícios para testes
                    </p>
                  </div>
                  <Switch
                    checked={formData.modo_demo}
                    onCheckedChange={(v) => setFormData({ ...formData, modo_demo: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Integração Ativa</Label>
                    <p className="text-xs text-muted-foreground">
                      Habilitar esta integração
                    </p>
                  </div>
                  <Switch
                    checked={formData.ativo}
                    onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator />

          {/* Teste de Conexão */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Testar Conexão</Label>
                <p className="text-xs text-muted-foreground">
                  Teste a conexão e detecte os campos disponíveis
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
                className="gap-2"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                {testing ? 'Testando...' : 'Testar Conexão'}
              </Button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <span className={`font-medium ${testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {testResult.message}
                  </span>
                </div>

                {testResult.campos && testResult.campos.length > 0 && (
                  <div className="mt-3">
                    <Label className="text-sm">Campos Detectados ({testResult.campos.length})</Label>
                    <div className="flex flex-wrap gap-1 mt-2 max-h-32 overflow-y-auto">
                      {testResult.campos.map((campo) => (
                        <Badge key={campo} variant="secondary" className="text-xs font-mono">
                          {campo}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {testResult.sample && (
                  <div className="mt-3">
                    <Label className="text-sm">Exemplo de Dados</Label>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(testResult.sample, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {integracao && (
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
