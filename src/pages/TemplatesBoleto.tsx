import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useBoletoTemplates, useBoletoTemplateFields, useSeedDefaultTemplate, useSeedSantanderTemplate } from '@/hooks/useBoletoTemplates'
import { TemplateFieldEditor } from '@/components/boleto/TemplateFieldEditor'
import { useBancos } from '@/hooks/useBancos'
import { Database, Eye, EyeOff, Settings } from 'lucide-react'

export default function TemplatesBoleto() {
  const { toast } = useToast()
  const seedDefault = useSeedDefaultTemplate()
  const seedSantander = useSeedSantanderTemplate()
  const { data: templates = [], isLoading } = useBoletoTemplates()
  const { data: bancos = [] } = useBancos()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const { data: selectedFields = [] } = useBoletoTemplateFields(selectedTemplateId || undefined)

  const toggleFields = (tplId: string) => {
    setSelectedTemplateId(prev => prev === tplId ? null : tplId)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Templates de Boleto</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => seedDefault.mutate(undefined, {
                onSuccess: () => toast({ title: 'Sucesso', description: 'Template padrão Bradesco atualizado.' }),
                onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
              })}
              disabled={seedDefault.isPending}
            >
              <Database className="h-4 w-4 mr-2" />
              {seedDefault.isPending ? 'Atualizando...' : 'Template Bradesco'}
            </Button>
            <Button
              variant="outline"
              onClick={() => seedSantander.mutate(undefined, {
                onSuccess: () => toast({ title: 'Sucesso', description: 'Template Santander criado/atualizado com todos os campos.' }),
                onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
              })}
              disabled={seedSantander.isPending}
            >
              <Database className="h-4 w-4 mr-2" />
              {seedSantander.isPending ? 'Atualizando...' : 'Template Santander'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="text-muted-foreground">Carregando...</div>
          ) : templates.length === 0 ? (
            <div className="text-muted-foreground col-span-full">
              Nenhum template cadastrado. Clique em "Criar/Atualizar Template Padrão" para começar.
            </div>
          ) : templates.map(tpl => {
            const bancoNome = bancos.find(b => b.codigo_banco === tpl.bank_code)?.nome_banco
            return (
              <Card key={tpl.id} className={selectedTemplateId === tpl.id ? 'border-primary' : ''}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {tpl.is_default && '⭐ '}
                    {tpl.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="text-muted-foreground">
                    Banco: {tpl.bank_code ? `${tpl.bank_code} - ${bancoNome || ''}` : '—'}
                  </div>
                  <div className="text-muted-foreground">
                    Tamanho: {tpl.page_width} × {tpl.page_height} mm
                  </div>
                  <Button
                    variant={selectedTemplateId === tpl.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleFields(tpl.id)}
                    className="w-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {selectedTemplateId === tpl.id ? 'Fechar Campos' : 'Editar Campos'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {selectedTemplateId && (
          <TemplateFieldEditor
            fields={selectedFields}
            templateId={selectedTemplateId}
          />
        )}
      </div>
    </MainLayout>
  )
}
