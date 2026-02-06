import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'
import { listTemplates } from '@/lib/templatesRepo'
import { BoletoTemplate } from '@/types/boletoTemplate'
import { supabase } from '@/integrations/supabase/client'
import { renderBoletoPDF } from '@/lib/templateRenderer'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import { useSeedDefaultTemplate } from '@/hooks/useBoletoTemplates'
import { Database } from 'lucide-react'

export default function GerarBoletosPDF() {
  const { toast } = useToast()
  const seedDefault = useSeedDefaultTemplate()
  const [templateId, setTemplateId] = useState<string>('')
  const [mode, setMode] = useState<'single'|'merge'|'zip'>('single')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [selecionados, setSelecionados] = useState<string[]>([])

  const { data: templates = [] } = useQuery({
    queryKey: ['boleto-templates'],
    queryFn: listTemplates,
  })

  const { data: boletos = [] } = useQuery({
    queryKey: ['boletos-list', filtroCliente],
    queryFn: async () => {
      let q = supabase.from('vv_b_boletos_api').select('id,dyn_nome_do_cliente,valor,data_vencimento').is('deleted', null)
      if (filtroCliente) q = q.ilike('dyn_nome_do_cliente', `%${filtroCliente}%`)
      const { data } = await q
      return data || []
    }
  })

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  const handleGerar = async () => {
    if (!templateId || selecionados.length === 0) {
      toast({ title: 'Atenção', description: 'Selecione um template e ao menos um boleto.', variant: 'destructive' })
      return
    }
    try {
      if (mode === 'single') {
        for (const id of selecionados) {
        const bytes = await renderBoletoPDF(templateId, id)
          const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `boleto_${id}.pdf`
          a.click()
          URL.revokeObjectURL(url)
        }
        toast({ title: 'Concluído', description: `${selecionados.length} PDFs gerados` })
      } else if (mode === 'merge') {
        const merged = await PDFDocument.create()
        for (const id of selecionados) {
          const bytes = await renderBoletoPDF(templateId, id)
          const src = await PDFDocument.load(bytes)
          const pages = await merged.copyPages(src, src.getPageIndices())
          pages.forEach(p => merged.addPage(p))
        }
        const out = await merged.save()
        const blob = new Blob([new Uint8Array(out)], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `boletos_merged_${Date.now()}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'Concluído', description: `PDF único com ${selecionados.length} páginas` })
      } else {
        try {
          const zip = new JSZip()
          for (const id of selecionados) {
            const bytes = await renderBoletoPDF(templateId, id)
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
        } catch {
          toast({ title: 'Aviso', description: 'ZIP não disponível; gerando arquivos individuais.', variant: 'destructive' })
          for (const id of selecionados) {
          const bytes = await renderBoletoPDF(templateId, id)
            const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `boleto_${id}.pdf`
            a.click()
            URL.revokeObjectURL(url)
          }
        }
      }
    } catch (e:any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templates.map((t:BoletoTemplate)=>(
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Modo</label>
              <Select value={mode} onValueChange={(v)=>setMode(v as any)}>
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
              <Input value={filtroCliente} onChange={(e)=>setFiltroCliente(e.target.value)} placeholder="Nome do cliente" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Boletos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {(boletos as any[]).map(b => (
                <div key={b.id} className={`border rounded p-2 flex items-center justify-between ${selecionados.includes(b.id) ? 'bg-muted' : ''}`}>
                  <div className="text-sm">
                    <div>{b.dyn_nome_do_cliente}</div>
                    <div className="text-muted-foreground text-xs">{b.id}</div>
                  </div>
                  <Button variant={selecionados.includes(b.id) ? 'default' : 'outline'} size="sm" onClick={()=>toggleSelecionado(b.id)}>
                    {selecionados.includes(b.id) ? 'Selecionado' : 'Selecionar'}
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button onClick={handleGerar} disabled={!templateId || selecionados.length===0}>Gerar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
