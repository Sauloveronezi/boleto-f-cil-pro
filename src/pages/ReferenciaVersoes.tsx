import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { changelogData, APP_VERSION } from '@/data/changelog';
import { GitCommit, Tag, Calendar } from 'lucide-react';

export default function ReferenciaVersoes() {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feat': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'fix': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'refactor': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'docs': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'feat': return 'Novo Recurso';
      case 'fix': return 'Correção';
      case 'refactor': return 'Refatoração';
      case 'docs': return 'Documentação';
      case 'chore': return 'Tarefas';
      case 'style': return 'Estilo';
      default: return type;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Referência de Versões
            <Badge variant="outline" className="text-sm font-normal">v{APP_VERSION}</Badge>
          </h1>
          <p className="text-muted-foreground">
            Histórico de atualizações e melhorias do sistema BoletoERP.
          </p>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)] pr-4">
          <div className="space-y-8">
            {changelogData.map((release, index) => (
              <div key={release.version} className="relative pl-8 border-l border-border pb-8 last:pb-0 last:border-0">
                <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Tag className="h-5 w-5 text-primary" />
                      v{release.version}
                    </h2>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {release.date}
                    </span>
                    {index === 0 && (
                      <Badge className="bg-primary text-primary-foreground">Atual</Badge>
                    )}
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium">Alterações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {release.changes.map((change, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <Badge variant="outline" className={`mt-0.5 shrink-0 ${getTypeColor(change.type)}`}>
                            {getTypeLabel(change.type)}
                          </Badge>
                          <span className="text-sm text-foreground/90 leading-relaxed">
                            {change.description}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  );
}
