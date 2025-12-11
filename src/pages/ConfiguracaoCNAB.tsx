import { useState } from 'react';
import { FileText, Plus, Save, Trash2, HelpCircle, Settings2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { bancosMock } from '@/data/mockData';
import type { ConfiguracaoCNAB, CampoCNAB } from '@/types/boleto';

const CAMPOS_DESTINO = [
  { value: 'cnpj', label: 'CNPJ/CPF' },
  { value: 'razao_social', label: 'Razão Social' },
  { value: 'valor', label: 'Valor do Título' },
  { value: 'vencimento', label: 'Data de Vencimento' },
  { value: 'nosso_numero', label: 'Nosso Número' },
  { value: 'numero_nota', label: 'Número da Nota' },
  { value: 'endereco', label: 'Endereço' },
  { value: 'cidade', label: 'Cidade' },
  { value: 'estado', label: 'Estado (UF)' },
  { value: 'cep', label: 'CEP' },
];

const FORMATOS = [
  { value: 'texto', label: 'Texto' },
  { value: 'numero', label: 'Número inteiro' },
  { value: 'valor_centavos', label: 'Valor em centavos (dividir por 100)' },
  { value: 'data_ddmmaa', label: 'Data DDMMAA' },
  { value: 'data_ddmmaaaa', label: 'Data DDMMAAAA' },
];

// Dados mock de configurações salvas
const configuracoesMock: ConfiguracaoCNAB[] = [
  {
    id: '1',
    banco_id: '2', // Bradesco
    tipo_cnab: 'CNAB_400',
    nome: 'Bradesco Padrão 400',
    descricao: 'Layout padrão do Bradesco para CNAB 400',
    campos: [
      { id: '1', nome: 'CNPJ Sacado', campo_destino: 'cnpj', posicao_inicio: 4, posicao_fim: 17, tipo_registro: '1', formato: 'texto' },
      { id: '2', nome: 'Razão Social', campo_destino: 'razao_social', posicao_inicio: 235, posicao_fim: 274, tipo_registro: '1', formato: 'texto' },
      { id: '3', nome: 'Valor', campo_destino: 'valor', posicao_inicio: 127, posicao_fim: 139, tipo_registro: '1', formato: 'valor_centavos' },
      { id: '4', nome: 'Vencimento', campo_destino: 'vencimento', posicao_inicio: 121, posicao_fim: 126, tipo_registro: '1', formato: 'data_ddmmaa' },
      { id: '5', nome: 'Nosso Número', campo_destino: 'nosso_numero', posicao_inicio: 63, posicao_fim: 73, tipo_registro: '1', formato: 'texto' },
    ],
    criado_em: '2024-01-15',
    atualizado_em: '2024-12-10'
  }
];

export default function ConfiguracaoCNAB() {
  const { toast } = useToast();
  
  // Carregar padrões salvos do localStorage + mock
  const carregarPadroes = (): ConfiguracaoCNAB[] => {
    const salvos = JSON.parse(localStorage.getItem('padroesCNAB') || '[]');
    return [...configuracoesMock, ...salvos];
  };
  
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoCNAB[]>(carregarPadroes);
  const [configSelecionada, setConfigSelecionada] = useState<ConfiguracaoCNAB | null>(null);
  const [novaConfig, setNovaConfig] = useState(false);
  
  // Form state
  const [bancoId, setBancoId] = useState('');
  const [tipoCnab, setTipoCnab] = useState<'CNAB_240' | 'CNAB_400'>('CNAB_400');
  const [nomeConfig, setNomeConfig] = useState('');
  const [descricao, setDescricao] = useState('');
  const [campos, setCampos] = useState<CampoCNAB[]>([]);

  const handleNovaConfig = () => {
    setNovaConfig(true);
    setConfigSelecionada(null);
    setBancoId('');
    setTipoCnab('CNAB_400');
    setNomeConfig('');
    setDescricao('');
    setCampos([]);
  };

  const handleEditarConfig = (config: ConfiguracaoCNAB) => {
    setNovaConfig(false);
    setConfigSelecionada(config);
    setBancoId(config.banco_id);
    setTipoCnab(config.tipo_cnab);
    setNomeConfig(config.nome);
    setDescricao(config.descricao || '');
    setCampos([...config.campos]);
  };

  const handleAdicionarCampo = () => {
    const novoCampo: CampoCNAB = {
      id: Math.random().toString(36).substr(2, 9),
      nome: '',
      campo_destino: 'cnpj',
      posicao_inicio: 1,
      posicao_fim: 14,
      tipo_registro: '1',
      formato: 'texto'
    };
    setCampos([...campos, novoCampo]);
  };

  const handleAtualizarCampo = (id: string, field: keyof CampoCNAB, value: any) => {
    setCampos(campos.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleRemoverCampo = (id: string) => {
    setCampos(campos.filter(c => c.id !== id));
  };

  const handleSalvar = () => {
    if (!bancoId || !nomeConfig || campos.length === 0) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o banco, nome e adicione pelo menos um campo.',
        variant: 'destructive'
      });
      return;
    }

    const config: ConfiguracaoCNAB = {
      id: configSelecionada?.id || Math.random().toString(36).substr(2, 9),
      banco_id: bancoId,
      tipo_cnab: tipoCnab,
      nome: nomeConfig,
      descricao,
      campos,
      criado_em: configSelecionada?.criado_em || new Date().toISOString().split('T')[0],
      atualizado_em: new Date().toISOString().split('T')[0]
    };

    if (configSelecionada) {
      const novasConfigs = configuracoes.map(c => c.id === config.id ? config : c);
      setConfiguracoes(novasConfigs);
      // Atualizar localStorage (excluindo mocks)
      const salvos = novasConfigs.filter(c => !configuracoesMock.find(m => m.id === c.id));
      localStorage.setItem('padroesCNAB', JSON.stringify(salvos));
    } else {
      const novasConfigs = [...configuracoes, config];
      setConfiguracoes(novasConfigs);
      // Salvar no localStorage (excluindo mocks)
      const salvos = novasConfigs.filter(c => !configuracoesMock.find(m => m.id === c.id));
      localStorage.setItem('padroesCNAB', JSON.stringify(salvos));
    }

    toast({
      title: 'Configuração salva',
      description: `Padrão "${nomeConfig}" salvo com sucesso.`,
    });

    setNovaConfig(false);
    setConfigSelecionada(null);
  };

  const handleExcluir = (id: string) => {
    setConfiguracoes(configuracoes.filter(c => c.id !== id));
    if (configSelecionada?.id === id) {
      setConfigSelecionada(null);
      setNovaConfig(false);
    }
    toast({
      title: 'Configuração excluída',
      description: 'O padrão CNAB foi removido.',
    });
  };

  const getBancoNome = (bancoId: string) => {
    const banco = bancosMock.find(b => b.id === bancoId);
    return banco?.nome_banco || 'Banco não encontrado';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuração de Padrões CNAB</h1>
            <p className="text-muted-foreground">
              Configure os layouts de leitura de arquivos CNAB por banco
            </p>
          </div>
          <Button onClick={handleNovaConfig} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Padrão
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de configurações */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Padrões Salvos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {configuracoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum padrão configurado
                </p>
              ) : (
                configuracoes.map(config => (
                  <div
                    key={config.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      configSelecionada?.id === config.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleEditarConfig(config)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{config.nome}</p>
                        <p className="text-xs text-muted-foreground">{getBancoNome(config.banco_id)}</p>
                      </div>
                      <Badge variant="outline">{config.tipo_cnab.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {config.campos.length} campo(s) mapeado(s)
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Editor de configuração */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {novaConfig ? 'Novo Padrão CNAB' : configSelecionada ? 'Editar Padrão' : 'Selecione um padrão'}
              </CardTitle>
              <CardDescription>
                {novaConfig || configSelecionada 
                  ? 'Configure as posições dos campos no arquivo CNAB' 
                  : 'Clique em um padrão à esquerda para editar ou crie um novo'}
              </CardDescription>
            </CardHeader>
            {(novaConfig || configSelecionada) && (
              <CardContent className="space-y-6">
                {/* Dados básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      Banco
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent>Selecione o banco para este padrão</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Select value={bancoId} onValueChange={setBancoId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {bancosMock.filter(b => b.ativo).map(banco => (
                          <SelectItem key={banco.id} value={banco.id}>
                            {banco.codigo_banco} - {banco.nome_banco}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo CNAB</Label>
                    <Select value={tipoCnab} onValueChange={(v) => setTipoCnab(v as 'CNAB_240' | 'CNAB_400')}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNAB_240">CNAB 240</SelectItem>
                        <SelectItem value="CNAB_400">CNAB 400</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Padrão</Label>
                    <Input
                      value={nomeConfig}
                      onChange={e => setNomeConfig(e.target.value)}
                      placeholder="Ex: Bradesco Padrão 400"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Descrição (opcional)</Label>
                    <Input
                      value={descricao}
                      onChange={e => setDescricao(e.target.value)}
                      placeholder="Descrição do layout"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Separator />

                {/* Campos mapeados */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">Mapeamento de Campos</Label>
                    <Button variant="outline" size="sm" onClick={handleAdicionarCampo} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar Campo
                    </Button>
                  </div>

                  {campos.length === 0 ? (
                    <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground mt-2">
                        Adicione campos para mapear as posições do arquivo CNAB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campos.map((campo, index) => (
                        <div key={campo.id} className="p-3 bg-muted/30 rounded-lg border space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">Campo {index + 1}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoverCampo(campo.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs">Nome</Label>
                              <Input
                                value={campo.nome}
                                onChange={e => handleAtualizarCampo(campo.id, 'nome', e.target.value)}
                                placeholder="Nome do campo"
                                className="mt-1 h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Campo Destino</Label>
                              <Select
                                value={campo.campo_destino}
                                onValueChange={v => handleAtualizarCampo(campo.id, 'campo_destino', v)}
                              >
                                <SelectTrigger className="mt-1 h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CAMPOS_DESTINO.map(cd => (
                                    <SelectItem key={cd.value} value={cd.value}>{cd.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Posição Início</Label>
                              <Input
                                type="number"
                                value={campo.posicao_inicio}
                                onChange={e => handleAtualizarCampo(campo.id, 'posicao_inicio', parseInt(e.target.value) || 1)}
                                className="mt-1 h-9"
                                min={1}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Posição Fim</Label>
                              <Input
                                type="number"
                                value={campo.posicao_fim}
                                onChange={e => handleAtualizarCampo(campo.id, 'posicao_fim', parseInt(e.target.value) || 1)}
                                className="mt-1 h-9"
                                min={1}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Tipo de Registro (opcional)</Label>
                              <Input
                                value={campo.tipo_registro || ''}
                                onChange={e => handleAtualizarCampo(campo.id, 'tipo_registro', e.target.value)}
                                placeholder="Ex: 1, 3, P"
                                className="mt-1 h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Formato</Label>
                              <Select
                                value={campo.formato || 'texto'}
                                onValueChange={v => handleAtualizarCampo(campo.id, 'formato', v)}
                              >
                                <SelectTrigger className="mt-1 h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FORMATOS.map(f => (
                                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Ações */}
                <div className="flex items-center justify-between">
                  {configSelecionada && (
                    <Button
                      variant="destructive"
                      onClick={() => handleExcluir(configSelecionada.id)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir Padrão
                    </Button>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <Button variant="outline" onClick={() => { setNovaConfig(false); setConfigSelecionada(null); }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSalvar} className="gap-2">
                      <Save className="h-4 w-4" />
                      Salvar Padrão
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
