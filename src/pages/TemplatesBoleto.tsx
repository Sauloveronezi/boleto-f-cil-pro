import { useEffect, useRef, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BoletoTemplate, BoletoTemplateField } from '@/types/boletoTemplate'
import { listTemplates, createTemplate, updateTemplate, saveTemplateFields } from '@/lib/templatesRepo'
import { EditorLayoutBoleto, ElementoLayout } from '@/components/modelos/EditorLayoutBoleto'
import { uploadPdfToStorage } from '@/lib/pdfStorage'
import { useBancos } from '@/hooks/useBancos'
import { Eye, Plus, Upload } from 'lucide-react'

export default function TemplatesBoleto() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [nomeTemplate, setNomeTemplate] = useState('')
  const [bankId, setBankId] = useState<string>('') 
  const [editorOpen, setEditorOpen] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<BoletoTemplate | null>(null)
  const [elements, setElements] = useState<ElementoLayout[]>([])
  const [pageSize, setPageSize] = useState<{ w: number; h: number }>({ w: 210, h: 297 })
  const [pdfSource, setPdfSource] = useState<File | string | null>(null)
  const { data: bancos = [] } = useBancos()

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['boleto-templates'],
    queryFn: listTemplates,
  })

  const createMut = useMutation({
    mutationFn: async () => {
      let backgroundPath = ''
      if (pdfFile) {
        const up = await uploadPdfToStorage(pdfFile, `tpl_${Date.now()}`)
        if (!up.success || !up.path) throw new Error(up.error || 'Upload falhou')
        backgroundPath = up.path
      }
      const tpl = await createTemplate({
        name: nomeTemplate || (pdfFile ? pdfFile.name.replace('.pdf','') : 'template'),
        bank_code: bankId || undefined,
        layout_version: 'v1',
        background_pdf_url: backgroundPath,
        page_width: pageSize.w,
        page_height: pageSize.h,
        requires_calculation: false,
      })
      setCurrentTemplate(tpl)
      return tpl
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boleto-templates'] })
      toast({ title: 'Template criado', description: 'Abra o editor para mapear campos.' })
    },
    onError: (e:any) => {
      console.error('[Templates] Create error:', e)
      toast({ title: 'Erro', description: e?.message || 'Falha ao criar template', variant: 'destructive' })
    }
  })

  const handleUploadClick = () => fileInputRef.current?.click()
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') {
      toast({ title: 'Formato inválido', description: 'Selecione um PDF.', variant: 'destructive'})
      return
    }
    setPdfFile(f)
    setNomeTemplate(f.name.replace('.pdf',''))
    setPdfSource(f)
  }

  const openEditor = (tpl?: BoletoTemplate) => {
    if (tpl) {
      setCurrentTemplate(tpl)
      setPdfSource(tpl.background_pdf_url)
      setPageSize({ w: tpl.page_width, h: tpl.page_height })
    }
    setElements([])
    setEditorOpen(true)
  }

  const handleSaveLayout = async (els: ElementoLayout[]) => {
    if (!currentTemplate) {
      toast({ title: 'Erro', description: 'Crie um template antes de salvar.', variant:'destructive' })
      return
    }
    const fields: BoletoTemplateField[] = els
      .filter(e => e.tipo !== 'linha' && e.tipo !== 'retangulo')
      .map(e => {
        const key = e.variavel || e.nome.toLowerCase().replace(/\s+/g,'_')
        const isStatic = e.tipo === 'texto'
        const sourceRef = isStatic ? `literal:${e.textoFixo || ''}` : ''
        return {
          id: e.id,
          template_id: currentTemplate.id,
          key,
          source_ref: sourceRef,
          page: 1,
          bbox: [e.x/2, e.y/2, (e.x+e.largura)/2, (e.y+e.altura)/2],
          font_family: e.fonte || 'helvetica',
          font_size: e.tamanhoFonte || 10,
          align: e.alinhamento || 'left',
          format: undefined,
          is_barcode: e.variavel === '{{codigo_barras}}',
          is_digitable_line: e.variavel === '{{linha_digitavel}}',
        }
      })
    await saveTemplateFields(currentTemplate.id, fields)
    toast({ title: 'Template salvo', description: `${fields.length} campos mapeados.` })
    setEditorOpen(false)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Templates de Boleto</h1>
          <Button onClick={handleUploadClick}>
            <Upload className="h-4 w-4 mr-2" /> Importar PDF Modelo
          </Button>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Novo Template</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Nome</Label>
              <Input value={nomeTemplate} onChange={(e)=>setNomeTemplate(e.target.value)} placeholder="Ex.: Bradesco Ficha de Caixa" />
            </div>
            <div>
              <Label>Banco</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.codigo_banco} - {b.nome_banco}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button disabled={!nomeTemplate} onClick={()=>createMut.mutate()}>
                <Plus className="h-4 w-4 mr-2" /> Criar
              </Button>
              <Button variant="outline" disabled={!currentTemplate} onClick={()=>openEditor(currentTemplate!)}>
                <Eye className="h-4 w-4 mr-2" /> Mapear
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div>Carregando...</div>
          ) : templates.length === 0 ? (
            <div>Nenhum template cadastrado.</div>
          ) : templates.map(tpl => (
            <Card key={tpl.id}>
              <CardHeader><CardTitle>{tpl.name}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div>Banco: {tpl.bank_code || '—'}</div>
                <div>Tamanho: {tpl.page_width} × {tpl.page_height} mm</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={()=>openEditor(tpl)}>Editar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <EditorLayoutBoleto
          open={editorOpen}
          onOpenChange={setEditorOpen}
          elementos={elements}
          onSave={handleSaveLayout}
          nomeModelo={currentTemplate?.name || nomeTemplate || 'Novo Template'}
          pdfSource={pdfSource || undefined}
          larguraPagina={pageSize.w}
          alturaPagina={pageSize.h}
          iniciarVazio={false}
        />
      </div>
    </MainLayout>
  )
}
