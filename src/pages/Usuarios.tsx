import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useUsuarios, Usuario } from '@/hooks/useUsuarios';
import { usePerfisAcesso } from '@/hooks/usePerfisAcesso';
import { usePermissoes, UserRole } from '@/hooks/usePermissoes';
import { Check, X, UserCog, Trash2, Loader2, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Usuarios() {
  const { usuarios, isLoading, aprovarUsuario, desativarUsuario, excluirUsuario, atualizarPerfil } = useUsuarios();
  const { perfis } = usePerfisAcesso();
  const { hasPermission, isMaster } = usePermissoes();
  
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'aprovar' | 'editar' | 'excluir'>('aprovar');
  const [selectedPerfilId, setSelectedPerfilId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('operador');

  const canEdit = hasPermission('usuarios', 'editar');
  const canDelete = hasPermission('usuarios', 'excluir');

  const handleAprovar = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setDialogMode('aprovar');
    setSelectedPerfilId('');
    setSelectedRole('operador');
    setDialogOpen(true);
  };

  const handleEditar = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setDialogMode('editar');
    setSelectedPerfilId(usuario.perfil_acesso_id || '');
    setDialogOpen(true);
  };

  const handleExcluir = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setDialogMode('excluir');
    setDialogOpen(true);
  };

  const handleConfirmar = async () => {
    if (!selectedUsuario) return;

    if (dialogMode === 'aprovar') {
      await aprovarUsuario.mutateAsync({
        usuarioId: selectedUsuario.id,
        perfilAcessoId: selectedPerfilId,
        role: selectedRole
      });
    } else if (dialogMode === 'editar') {
      await atualizarPerfil.mutateAsync({
        usuarioId: selectedUsuario.id,
        perfilAcessoId: selectedPerfilId
      });
    } else if (dialogMode === 'excluir') {
      await excluirUsuario.mutateAsync(selectedUsuario.id);
    }

    setDialogOpen(false);
    setSelectedUsuario(null);
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'master':
        return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'admin':
        return <ShieldCheck className="h-4 w-4 text-primary" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
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

  const usuariosPendentes = usuarios.filter(u => !u.ativo);
  const usuariosAtivos = usuarios.filter(u => u.ativo);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">
            Aprove, edite ou exclua usuários do sistema
          </p>
        </div>

        {usuariosPendentes.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <UserCog className="h-5 w-5" />
                Usuários Pendentes de Aprovação ({usuariosPendentes.length})
              </CardTitle>
              <CardDescription>
                Estes usuários se cadastraram e aguardam liberação de acesso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosPendentes.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.nome || '-'}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>
                        {format(new Date(usuario.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit && (
                          <Button
                            size="sm"
                            onClick={() => handleAprovar(usuario)}
                            className="gap-1"
                          >
                            <Check className="h-4 w-4" />
                            Aprovar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Usuários Ativos ({usuariosAtivos.length})</CardTitle>
            <CardDescription>
              Lista de todos os usuários com acesso ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aprovado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosAtivos.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(usuario.perfil_acesso?.nome?.toLowerCase())}
                        {usuario.nome || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {usuario.perfil_acesso?.nome || 'Sem perfil'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={usuario.ativo ? 'default' : 'secondary'}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usuario.data_aprovacao 
                        ? format(new Date(usuario.data_aprovacao), "dd/MM/yyyy", { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditar(usuario)}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && usuario.ativo && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => desativarUsuario.mutate(usuario.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleExcluir(usuario)}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogMode === 'aprovar' && 'Aprovar Usuário'}
                {dialogMode === 'editar' && 'Editar Usuário'}
                {dialogMode === 'excluir' && 'Excluir Usuário'}
              </DialogTitle>
              <DialogDescription>
                {dialogMode === 'aprovar' && `Defina o perfil de acesso para ${selectedUsuario?.email}`}
                {dialogMode === 'editar' && `Altere o perfil de acesso de ${selectedUsuario?.email}`}
                {dialogMode === 'excluir' && `Tem certeza que deseja excluir ${selectedUsuario?.email}?`}
              </DialogDescription>
            </DialogHeader>

            {(dialogMode === 'aprovar' || dialogMode === 'editar') && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Perfil de Acesso</Label>
                  <Select value={selectedPerfilId} onValueChange={setSelectedPerfilId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {perfis.map((perfil) => (
                        <SelectItem key={perfil.id} value={perfil.id}>
                          {perfil.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {dialogMode === 'aprovar' && (
                  <div className="space-y-2">
                    <Label>Role do Sistema</Label>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isMaster && <SelectItem value="master">Master</SelectItem>}
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="operador">Operador</SelectItem>
                        <SelectItem value="visualizador">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                  (dialogMode !== 'excluir' && !selectedPerfilId) ||
                  aprovarUsuario.isPending ||
                  atualizarPerfil.isPending ||
                  excluirUsuario.isPending
                }
              >
                {(aprovarUsuario.isPending || atualizarPerfil.isPending || excluirUsuario.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {dialogMode === 'aprovar' && 'Aprovar'}
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
