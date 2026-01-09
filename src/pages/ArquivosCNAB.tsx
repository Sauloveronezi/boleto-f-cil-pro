import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, Eye, Edit, Download, Trash2, Upload, RefreshCw, Search, Filter, FileOutput } from 'lucide-react';
import { usePermissoes } from '@/hooks/usePermissoes';
import { useArquivosCNAB, useLinhasCNAB, useDeleteArquivoCNAB, useUpdateLinhaCNAB, useUpdateArquivoCNAB, LinhaCNAB } from '@/hooks/useArquivosCNAB';
import { useBancos } from '@/hooks/useBancos';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { gerarArquivoCNAB, downloadArquivoCNAB, validarArquivoCNAB } from '@/lib/cnabGenerator';

const CORES_TIPOS = {
  header_arquivo: 'bg-blue-200 text-blue-800',
  header_lote: 'bg-cyan-200 text-cyan-800',
  detalhe: 'bg-green-200 text-green-800',
  detalhe_segmento_p: 'bg-emerald-200 text-emerald-800',
  detalhe_segmento_q: 'bg-teal-200 text-teal-800',
  detalhe_segmento_r: 'bg-lime-200 text-lime-800',
  trailer_lote: 'bg-orange-200 text-orange-800',
  trailer_arquivo: 'bg-red-200 text-red-800',
};

export default function ArquivosCNAB() {
  const { hasPermission, isLoading: isLoadingPermissoes } = usePermissoes();
  const { data: arquivos = [], isLoading: isLoadingArquivos, refetch } = useArquivosCNAB();
  const { data: bancos = [] } = useBancos();
  const deletarArquivo = useDeleteArquivoCNAB();
  const atualizarLinha = useUpdateLinhaCNAB();
  const atualizarArquivo = useUpdateArquivoCNAB();
  const { toast } = useToast();

  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroBanco, setFiltroBanco] = useState<string>('todos');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [arquivoSelecionado, setArquivoSelecionado] = useState<string | null>(null);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [linhaEditando, setLinhaEditando] = useState<LinhaCNAB | null>(null);
  const [conteudoEditado, setConteudoEditado] = useState('');

  const { data: linhasArquivo = [], isLoading: isLoadingLinhas } = useLinhasCNAB(arquivoSelecionado);

  // Filtrar arquivos
  const arquivosFiltrados = useMemo(() => {
    return arquivos.filter(arq => {
      if (filtroTipo !== 'todos' && arq.tipo_arquivo !== filtroTipo) return false;
      if (filtroBanco !== 'todos' && arq.banco_id !== filtroBanco) return false;
      if (buscaTexto && !arq.nome_arquivo.toLowerCase().includes(buscaTexto.toLowerCase())) return false;
      return true;
    });
  }, [arquivos, filtroTipo, filtroBanco, buscaTexto]);

  const handleVisualizarArquivo = (arquivoId: string) => {
    setArquivoSelecionado(arquivoId);
    setModalVisualizarAberto(true);
  };

  const handleEditarArquivo = (arquivoId: string) => {
    setArquivoSelecionado(arquivoId);
    setModalEditarAberto(true);
  };

  const handleEditarLinha = (linha: LinhaCNAB) => {
    setLinhaEditando(linha);
    setConteudoEditado(linha.conteudo_editado || linha.conteudo_original);
  };

  const handleSalvarEdicaoLinha = async () => {
    if (!linhaEditando) return;

    try {
      await atualizarLinha.mutateAsync({
        id: linhaEditando.id,
        conteudo_editado: conteudoEditado,
        status: 'editado',
      });
      setLinhaEditando(null);
      toast({ title: 'Linha atualizada com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao salvar linha', variant: 'destructive' });
    }
  };

  const handleGerarNovoCNAB = async (arquivoId: string, tipoArquivo: 'remessa' | 'retorno', tipoCNAB: 'CNAB_240' | 'CNAB_400') => {
    const linhasParaGerar = linhasArquivo as unknown as import('@/hooks/useArquivosCNAB').LinhaCNAB[];
    
    const conteudo = gerarArquivoCNAB(linhasParaGerar, tipoArquivo, tipoCNAB);
    const validacao = validarArquivoCNAB(conteudo, tipoCNAB);
    
    if (!validacao.valido) {
      toast({
        title: 'Arquivo gerado com avisos',
        description: `${validacao.erros.length} problemas encontrados`,
        variant: 'destructive',
      });
    }
    
    const arquivo = arquivos.find(a => a.id === arquivoId);
    const nomeArquivo = `NOVO_${arquivo?.nome_arquivo || 'arquivo'}`;
    
    downloadArquivoCNAB(conteudo, nomeArquivo, tipoArquivo);
    
    await atualizarArquivo.mutateAsync({ id: arquivoId, status: 'exportado' });
    toast({ title: 'Arquivo CNAB gerado com sucesso!' });
  };

  const handleExcluirArquivo = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;
    
    try {
      await deletarArquivo.mutateAsync(id);
    } catch (error) {
      toast({ title: 'Erro ao excluir arquivo', variant: 'destructive' });
    }
  };

  if (isLoadingPermissoes) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!hasPermission('configuracoes', 'visualizar')) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
          <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">Você não tem permissão para visualizar arquivos CNAB.</p>
        </div>
      </MainLayout>
    );
  }

  const arquivoAtual = arquivos.find(a => a.id === arquivoSelecionado);

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Arquivos CNAB</h1>
            <p className="text-muted-foreground">Gerencie arquivos CNAB lidos, edite e gere novos arquivos</p>
          </div>
          <Button onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome do arquivo..."
                    value={buscaTexto}
                    onChange={(e) => setBuscaTexto(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="remessa">Remessa</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Banco</Label>
                <Select value={filtroBanco} onValueChange={setFiltroBanco}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {bancos.map(banco => (
                      <SelectItem key={banco.id} value={banco.id}>
                        {banco.nome_banco}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => {
                  setFiltroTipo('todos');
                  setFiltroBanco('todos');
                  setBuscaTexto('');
                }}>
                  <Filter className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de arquivos */}
        <Card>
          <CardHeader>
            <CardTitle>Arquivos Processados</CardTitle>
            <CardDescription>
              {arquivosFiltrados.length} arquivo(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingArquivos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : arquivosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p>Nenhum arquivo CNAB encontrado</p>
                <p className="text-sm">Importe arquivos na tela de "Importar Layout"</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>CNAB</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arquivosFiltrados.map((arquivo) => (
                    <TableRow key={arquivo.id}>
                      <TableCell className="font-medium">{arquivo.nome_arquivo}</TableCell>
                      <TableCell>
                        <Badge variant={arquivo.tipo_arquivo === 'remessa' ? 'default' : 'secondary'}>
                          {arquivo.tipo_arquivo}
                        </Badge>
                      </TableCell>
                      <TableCell>{arquivo.tipo_cnab}</TableCell>
                      <TableCell>{arquivo.banco?.nome_banco || '-'}</TableCell>
                      <TableCell>{arquivo.total_registros}</TableCell>
                      <TableCell>
                        <Badge variant={
                          arquivo.status === 'exportado' ? 'default' :
                          arquivo.status === 'editado' ? 'secondary' : 'outline'
                        }>
                          {arquivo.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(arquivo.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleVisualizarArquivo(arquivo.id)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditarArquivo(arquivo.id)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGerarNovoCNAB(arquivo.id, arquivo.tipo_arquivo, arquivo.tipo_cnab)}
                            title="Gerar novo CNAB"
                          >
                            <FileOutput className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExcluirArquivo(arquivo.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal Visualizar */}
        <Dialog open={modalVisualizarAberto} onOpenChange={setModalVisualizarAberto}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Visualizar Arquivo: {arquivoAtual?.nome_arquivo}</DialogTitle>
              <DialogDescription>
                {arquivoAtual?.tipo_arquivo.toUpperCase()} - {arquivoAtual?.tipo_cnab} - {arquivoAtual?.total_registros} registros
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[500px] border rounded-md p-4">
              {isLoadingLinhas ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-1 font-mono text-sm">
                  {linhasArquivo.map((linha) => (
                    <div key={linha.id} className="flex gap-2 hover:bg-muted/50 px-2 py-1 rounded">
                      <span className="text-muted-foreground w-8 text-right">{linha.numero_linha}</span>
                      <Badge className={CORES_TIPOS[linha.tipo_registro as keyof typeof CORES_TIPOS] || 'bg-gray-200'}>
                        {linha.tipo_registro || 'desconhecido'}
                      </Badge>
                      <span className="truncate flex-1">{linha.conteudo_editado || linha.conteudo_original}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Modal Editar */}
        <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
          <DialogContent className="max-w-5xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Editar Arquivo: {arquivoAtual?.nome_arquivo}</DialogTitle>
              <DialogDescription>
                Clique em uma linha para editar. Alterações são salvas automaticamente.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[500px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-32">Tipo</TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-20">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhasArquivo.map((linha) => (
                    <TableRow key={linha.id} className={linha.status === 'editado' ? 'bg-yellow-50 dark:bg-yellow-950' : ''}>
                      <TableCell>{linha.numero_linha}</TableCell>
                      <TableCell>
                        <Badge className={CORES_TIPOS[linha.tipo_registro as keyof typeof CORES_TIPOS] || 'bg-gray-200'} variant="outline">
                          {linha.tipo_registro || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[600px] truncate">
                        {linhaEditando?.id === linha.id ? (
                          <Input
                            value={conteudoEditado}
                            onChange={(e) => setConteudoEditado(e.target.value)}
                            className="font-mono text-xs"
                          />
                        ) : (
                          linha.conteudo_editado || linha.conteudo_original
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={linha.status === 'editado' ? 'secondary' : 'outline'}>
                          {linha.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {linhaEditando?.id === linha.id ? (
                          <Button size="sm" onClick={handleSalvarEdicaoLinha}>
                            Salvar
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleEditarLinha(linha)}>
                            Editar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalEditarAberto(false)}>
                Fechar
              </Button>
              {arquivoAtual && (
                <Button onClick={() => handleGerarNovoCNAB(arquivoAtual.id, arquivoAtual.tipo_arquivo, arquivoAtual.tipo_cnab)}>
                  <Download className="mr-2 h-4 w-4" />
                  Gerar Novo CNAB
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
