import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { usePerfisAcesso, PerfilAcesso, Permissoes, MODULOS, ACOES, defaultPermissoes } from '@/hooks/usePerfisAcesso';
import { usePermissoes } from '@/hooks/usePermissoes';
import { Plus, Pencil, Trash2, Loader2, Lock } from 'lucide-react';

export default function PerfisAcesso() {
  const { perfis, isLoading, criarPerfil, atualizarPerfil, excluirPerfil } = usePerfisAcesso();
  const { hasPermission, isLoading: isLoadingPermissoes } = usePermissoes();
  
  const canCreate = hasPermission('perfis', 'criar');
  const canEdit = hasPermission('perfis', 'editar');
  const canDelete = hasPermission('perfis', 'excluir');
  const canView = hasPermission('perfis', 'visualizar');

  if (isLoadingPermissoes) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!canView) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
          <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para visualizar perfis de acesso.
          </p>
        </div>
      </MainLayout>
    );
  }
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerfil, setSelectedPerfil] = useState<PerfilAcesso | null>(null);
  const [dialogMode, setDialogMode] = useState<'criar' | 'editar' | 'excluir'>('criar');
  const [formData, setFormData] = useState<{
    nome: string;
    descricao: string;
    permissoes: Permissoes;
  }>({
    nome: '',
    descricao: '',
    permissoes: defaultPermissoes
  });

  const handleNovo = () => {
    setSelectedPerfil(null);
    setFormData({
      nome: '',
      descricao: '',
      permissoes: defaultPermissoes
    });
    setDialogMode('criar');
    setDialogOpen(true);
  };

  const handleEditar = (perfil: PerfilAcesso) => {
    setSelectedPerfil(perfil);
    setFormData({
      nome: perfil.nome,
      descricao: perfil.descricao || '',
      permissoes: perfil.permissoes
    });
    setDialogMode('editar');
    setDialogOpen(true);
  };

  const handleExcluir = (perfil: PerfilAcesso) => {
    setSelectedPerfil(perfil);
    setDialogMode('excluir');
    setDialogOpen(true);
  };

  const handlePermissaoChange = (modulo: keyof Permissoes, acao: keyof Permissoes[keyof Permissoes], checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [modulo]: {
          ...prev.permissoes[modulo],
          [acao]: checked
        }
      }
    }));
  };

  const handleConfirmar = async () => {
    if (dialogMode === 'criar') {
      await criarPerfil.mutateAsync({
        nome: formData.nome,
        descricao: formData.descricao || null,
        permissoes: formData.permissoes
      });
    } else if (dialogMode === 'editar' && selectedPerfil) {
      await atualizarPerfil.mutateAsync({
        id: selectedPerfil.id,
        nome: formData.nome,
        descricao: formData.descricao || null,
        permissoes: formData.permissoes
      });
    } else if (dialogMode === 'excluir' && selectedPerfil) {
      await excluirPerfil.mutateAsync(selectedPerfil.id);
    }

    setDialogOpen(false);
    setSelectedPerfil(null);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Perfis de Acesso</h1>
            <p className="text-muted-foreground">
              Configure os perfis e permissões do sistema
            </p>
          </div>
          {canCreate && (
            <Button onClick={handleNovo} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Perfil
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Perfis Cadastrados</CardTitle>
            <CardDescription>
              Perfis do sistema são protegidos e não podem ser excluídos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perfis.map((perfil) => (
                  <TableRow key={perfil.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {perfil.sistema && <Lock className="h-4 w-4 text-muted-foreground" />}
                        {perfil.nome}
                      </div>
                    </TableCell>
                    <TableCell>{perfil.descricao || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={perfil.sistema ? 'secondary' : 'outline'}>
                        {perfil.sistema ? 'Sistema' : 'Personalizado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditar(perfil)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && !perfil.sistema && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleExcluir(perfil)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {dialogMode === 'criar' && 'Novo Perfil de Acesso'}
                {dialogMode === 'editar' && 'Editar Perfil de Acesso'}
                {dialogMode === 'excluir' && 'Excluir Perfil de Acesso'}
              </DialogTitle>
              <DialogDescription>
                {dialogMode === 'excluir' 
                  ? `Tem certeza que deseja excluir o perfil "${selectedPerfil?.nome}"?`
                  : 'Configure as permissões para cada módulo do sistema'
                }
              </DialogDescription>
            </DialogHeader>

            {dialogMode !== 'excluir' && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Perfil</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Gerente de Vendas"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descrição do perfil..."
                      rows={1}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Matriz de Permissões</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[200px]">Módulo</TableHead>
                          {ACOES.map((acao) => (
                            <TableHead key={acao.key} className="text-center w-[100px]">
                              {acao.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {MODULOS.map((modulo) => (
                          <TableRow key={modulo.key}>
                            <TableCell className="font-medium">{modulo.label}</TableCell>
                            {ACOES.map((acao) => (
                              <TableCell key={acao.key} className="text-center">
                                <Checkbox
                                  checked={formData.permissoes[modulo.key]?.[acao.key] ?? false}
                                  onCheckedChange={(checked) => 
                                    handlePermissaoChange(modulo.key, acao.key, checked as boolean)
                                  }
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmar}
                variant={dialogMode === 'excluir' ? 'destructive' : 'default'}
                disabled={
                  (dialogMode !== 'excluir' && !formData.nome.trim()) ||
                  criarPerfil.isPending ||
                  atualizarPerfil.isPending ||
                  excluirPerfil.isPending
                }
              >
                {(criarPerfil.isPending || atualizarPerfil.isPending || excluirPerfil.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {dialogMode === 'criar' && 'Criar Perfil'}
                {dialogMode === 'editar' && 'Salvar'}
                {dialogMode === 'excluir' && 'Excluir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
