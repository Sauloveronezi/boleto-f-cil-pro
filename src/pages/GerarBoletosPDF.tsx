import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import { useBoletoTemplates, useBoletoTemplateFields, useSeedDefaultTemplate } from '@/hooks/useBoletoTemplates'
import { renderBoletoV2, downloadPdfV2 } from '@/lib/templateRendererV2'
import { Database, Star } from 'lucide-react'

export default function GerarBoletosPDF() {
  const { toast } = useToast()
  const seedDefault = useSeedDefaultTemplate()
  const [templateId, setTemplateId] = useState<string>('')
  const [mode, setMode] = useState<'single' | 'merge' | 'zip'>('single')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [gerando, setGerando] = useState(false)

  const { data: templates = [] } = useBoletoTemplates()
  const { data: fields = [] } = useBoletoTemplateFields(templateId || undefined)

  const { data: boletos = [] } = useQuery({
    queryKey: ['boletos-list', filtroCliente],
    queryFn: async () => {
      let q = supabase.from('vv_b_boletos_api').select('id,dyn_nome_do_cliente,valor,data_vencimento,numero_nota,numero_cobranca').is('deleted', null)
      if (filtroCliente) q = q.ilike('dyn_nome_do_cliente', `%${filtroCliente}%`)
      const { data } = await q
      return data || []
    }
  })

  const selectedTemplate = templates.find(t => t.id === templateId)

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const carregarDadosBoleto = async (boletoId: string) => {
    const { data } = await supabase
      .from('vv_b_boletos_api')
      .select('*')
      .eq('id', boletoId)
      .single()
    return data || {}
  }

  const handleGerar = async () => {
    if (!selectedTemplate || selecionados.length === 0 || fields.length === 0) {
      toast({ title: 'Atenção', description: 'Selecione um template com campos mapeados e ao menos um boleto.', variant: 'destructive' })
      return
    }

    setGerando(true)
    try {
      if (mode === 'single') {
        for (const id of selecionados) {
          const dados = await carregarDadosBoleto(id)
          const bytes = await renderBoletoV2(selectedTemplate, fields, dados)
          downloadPdfV2(bytes, `boleto_${id}.pdf`)
        }
        toast({ title: 'Concluído', description: `${selecionados.length} PDFs gerados` })
      } else if (mode === 'merge') {
        const merged = await PDFDocument.create()
        for (const id of selecionados) {
          const dados = await carregarDadosBoleto(id)
          const bytes = await renderBoletoV2(selectedTemplate, fields, dados)
          const src = await PDFDocument.load(bytes)
          const pages = await merged.copyPages(src, src.getPageIndices())
          pages.forEach(p => merged.addPage(p))
        }
        const out = await merged.save()
        downloadPdfV2(out, `boletos_merged_${Date.now()}.pdf`)
        toast({ title: 'Concluído', description: `PDF único com ${selecionados.length} páginas` })
      } else {
        const zip = new JSZip()
        for (const id of selecionados) {
          const dados = await carregarDadosBoleto(id)
          const bytes = await renderBoletoV2(selectedTemplate, fields, dados)
          zip.file(`boleto_${id}.pdf`, bytes)
        }
        const out = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(out)
        const a = document.createElement('a')
        a.href = url
        a.download = `boletos_${Date.now()}.zip`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'Concluído', description: `ZIP com ${selecionados.length} PDFs` })
      }
    } catch (e: any) {
      console.error('[GerarBoletosPDF] Erro:', e)
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setGerando(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gerar Boletos (PDF)</h1>
          <Button
            variant="outline"
            onClick={() => seedDefault.mutate(undefined, {
              onSuccess: () => toast({ title: 'Sucesso', description: 'Template padrão Bradesco criado/verificado.' }),
              onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
            })}
            disabled={seedDefault.isPending}
          >
            <Database className="h-4 w-4 mr-2" />
            {seedDefault.isPending ? 'Criando...' : 'Criar Template Padrão'}
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Seleção</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm">Template</label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.is_default && <Star className="h-3 w-3 inline mr-1 text-yellow-500" />}
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Modo</label>
              <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">1 PDF por boleto</SelectItem>
                  <SelectItem value="merge">Arquivo único</SelectItem>
                  <SelectItem value="zip">ZIP com todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Filtro cliente</label>
              <Input value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} placeholder="Nome do cliente" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Boletos ({boletos.length})</span>
              {selecionados.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {selecionados.length} selecionado(s)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {boletos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum boleto encontrado.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {(boletos as any[]).map(b => (
                  <div key={b.id} className={`border rounded p-2 flex items-center justify-between cursor-pointer transition-colors ${selecionados.includes(b.id) ? 'bg-muted border-primary' : 'hover:bg-muted/50'}`} onClick={() => toggleSelecionado(b.id)}>
                    <div className="text-sm">
                      <div className="font-medium">{b.dyn_nome_do_cliente || '—'}</div>
                      <div className="text-muted-foreground text-xs">NF: {b.numero_nota} | R$ {b.valor}</div>
                    </div>
                    <Button variant={selecionados.includes(b.id) ? 'default' : 'outline'} size="sm" onClick={(e) => { e.stopPropagation(); toggleSelecionado(b.id) }}>
                      {selecionados.includes(b.id) ? '✓' : 'Sel.'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button onClick={handleGerar} disabled={!templateId || selecionados.length === 0 || gerando}>
                {gerando ? 'Gerando...' : 'Gerar'}
              </Button>
              {selecionados.length > 0 && (
                <Button variant="outline" onClick={() => setSelecionados([])}>Limpar seleção</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
