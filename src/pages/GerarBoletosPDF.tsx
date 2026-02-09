import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import { useBoletoTemplates, useBoletoTemplateFields, useSeedDefaultTemplate } from '@/hooks/useBoletoTemplates'
import { renderBoletoV2, downloadPdfV2, type RenderOptions } from '@/lib/templateRendererV2'
import { mapBoletoApiToDadosBoleto, getBoletoPreviewData, type ConfigBancoParaCalculo } from '@/lib/boletoDataMapper'
import { Database, Star, Eye, FileDown, LayoutTemplate } from 'lucide-react'
import type { DadosBoleto } from '@/lib/pdfModelRenderer'

export default function GerarBoletosPDF() {
  const { toast } = useToast()
  const seedDefault = useSeedDefaultTemplate()
  const [templateId, setTemplateId] = useState<string>('')
  const [mode, setMode] = useState<'single' | 'merge' | 'zip'>('single')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [gerando, setGerando] = useState(false)
  const [previewBoletoId, setPreviewBoletoId] = useState<string | null>(null)
  const [previewDados, setPreviewDados] = useState<DadosBoleto | null>(null)
  const [usarFundo, setUsarFundo] = useState(true)
  const [debugBorders, setDebugBorders] = useState(false)

  const { data: templates = [] } = useBoletoTemplates()
  const { data: fields = [] } = useBoletoTemplateFields(templateId || undefined)

  const { data: boletos = [] } = useQuery({
    queryKey: ['boletos-list', filtroCliente],
    queryFn: async () => {
      let q = supabase.from('vv_b_boletos_api').select('id,dyn_nome_do_cliente,valor,data_vencimento,numero_nota,numero_cobranca,banco').is('deleted', null)
      if (filtroCliente) q = q.ilike('dyn_nome_do_cliente', `%${filtroCliente}%`)
      const { data } = await q
      return data || []
    }
  })

  // Carregar configurações de banco para cálculo de código de barras
  const { data: configsBanco = [] } = useQuery({
    queryKey: ['configs-banco-calculo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vv_b_configuracoes_banco')
        .select('banco_id, agencia, conta, carteira')
        .is('deleted', null)
      return data || []
    }
  })

  // Carregar bancos para mapear código → banco_id
  const { data: bancosRef = [] } = useQuery({
    queryKey: ['bancos-ref'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vv_b_bancos')
        .select('id, codigo_banco')
        .is('deleted', null)
      return data || []
    }
  })

  const selectedTemplate = templates.find(t => t.id === templateId)

  const getConfigBancoParaBoleto = (bancoField: string | null): ConfigBancoParaCalculo | undefined => {
    if (!bancoField) return undefined
    const codigoBanco = bancoField.replace(/\D/g, '').substring(0, 3)
    const bancoRef = bancosRef.find(b => b.codigo_banco === codigoBanco)
    if (!bancoRef) return undefined
    const config = (configsBanco as any[]).find(c => c.banco_id === bancoRef.id)
    if (!config) return undefined
    return {
      agencia: config.agencia || '',
      conta: config.conta || '',
      carteira: config.carteira || '09',
      nomeBanco: (bancoRef as any).nome_banco || '',
    }
  }

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const carregarDadosBoleto = async (boletoId: string): Promise<DadosBoleto> => {
    const { data } = await supabase
      .from('vv_b_boletos_api')
      .select('*')
      .eq('id', boletoId)
      .single()
    const row = (data || {}) as Record<string, any>
    const configBanco = getConfigBancoParaBoleto(row.banco)
    return mapBoletoApiToDadosBoleto(row, configBanco)
  }

  const handlePreview = async (boletoId: string) => {
    try {
      const dados = await carregarDadosBoleto(boletoId)
      setPreviewBoletoId(boletoId)
      setPreviewDados(dados)
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
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
          const bytes = await renderBoletoV2(selectedTemplate, fields, dados, usarFundo, debugBorders)
          downloadPdfV2(bytes, `boleto_${id}.pdf`)
        }
        toast({ title: 'Concluído', description: `${selecionados.length} PDFs gerados` })
      } else if (mode === 'merge') {
        const merged = await PDFDocument.create()
        for (const id of selecionados) {
          const dados = await carregarDadosBoleto(id)
          const bytes = await renderBoletoV2(selectedTemplate, fields, dados, usarFundo, debugBorders)
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
          const bytes = await renderBoletoV2(selectedTemplate, fields, dados, usarFundo, debugBorders)
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

  const previewItems = previewDados ? getBoletoPreviewData(previewDados) : []

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
            {seedDefault.isPending ? 'Atualizando...' : 'Criar/Atualizar Template Padrão'}
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
                      {t.is_default && '⭐ '}{t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templateId && fields.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{fields.length} campos mapeados</p>
              )}
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
            <div className="flex items-center gap-4 col-span-full">
              <div className="flex items-center gap-2">
                <Switch id="usarFundo" checked={usarFundo} onCheckedChange={setUsarFundo} />
                <Label htmlFor="usarFundo" className="text-sm">Com fundo PDF</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="debugBorders" checked={debugBorders} onCheckedChange={setDebugBorders} />
                <Label htmlFor="debugBorders" className="text-sm">Mostrar bordas dos campos (debug)</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de boletos */}
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
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {(boletos as any[]).map(b => (
                    <div
                      key={b.id}
                      className={`border rounded p-3 flex items-center justify-between transition-colors ${selecionados.includes(b.id) ? 'bg-muted border-primary' : 'hover:bg-muted/50'}`}
                    >
                      <div className="text-sm flex-1 cursor-pointer" onClick={() => toggleSelecionado(b.id)}>
                        <div className="font-medium">{b.dyn_nome_do_cliente || '—'}</div>
                        <div className="text-muted-foreground text-xs">
                          NF: {b.numero_nota} | Cob: {b.numero_cobranca} | R$ {b.valor}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button variant="ghost" size="sm" onClick={() => handlePreview(b.id)} title="Pré-visualizar dados">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={selecionados.includes(b.id) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleSelecionado(b.id)}
                        >
                          {selecionados.includes(b.id) ? '✓' : 'Sel.'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2 flex-wrap">
                <Button onClick={handleGerar} disabled={!templateId || selecionados.length === 0 || gerando}>
                  <FileDown className="h-4 w-4 mr-2" />
                  {gerando ? 'Gerando...' : 'Gerar PDF'}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!selectedTemplate || selecionados.length === 0) return
                    setGerando(true)
                    try {
                      const dados = await carregarDadosBoleto(selecionados[0])
                      const layoutOpts: RenderOptions = {
                        usarFundo: false,
                        debugBorders: true,
                        borderColor: { r: 0, g: 0, b: 0 },
                        showFieldLabels: true,
                        labelFontSize: 6,
                      }
                      const bytes = await renderBoletoV2(selectedTemplate, fields, dados, layoutOpts)
                      downloadPdfV2(bytes, `layout_${selectedTemplate.name}.pdf`)
                    } catch (e: any) {
                      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
                    } finally {
                      setGerando(false)
                    }
                  }}
                  disabled={!templateId || selecionados.length === 0 || gerando}
                >
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Gerar Layout (sem fundo)
                </Button>
                {selecionados.length > 0 && (
                  <Button variant="outline" onClick={() => setSelecionados([])}>Limpar seleção</Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Pré-visualização
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!previewDados ? (
                <p className="text-muted-foreground text-sm">Clique no ícone <Eye className="h-4 w-4 inline" /> de um boleto para ver os dados mapeados.</p>
              ) : (
                <div className="space-y-4">
                  {/* Simulação visual do boleto */}
                  <div className="border rounded-lg p-4 bg-background text-xs font-mono space-y-3">
                    {/* Cabeçalho */}
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-bold">Banco: {previewDados.banco_codigo || '—'}</span>
                      <span className="text-[10px]">{previewDados.linha_digitavel || 'Linha digitável não disponível'}</span>
                    </div>

                    {/* Local de pagamento / Vencimento */}
                    <div className="grid grid-cols-3 gap-2 border-b pb-2">
                      <div className="col-span-2">
                        <div className="text-muted-foreground text-[9px]">Local de Pagamento</div>
                        <div>{previewDados.local_pagamento || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground text-[9px]">Vencimento</div>
                        <div className="font-bold text-sm">{previewDados.data_vencimento || '—'}</div>
                      </div>
                    </div>

                    {/* Beneficiário */}
                    <div className="grid grid-cols-3 gap-2 border-b pb-2">
                      <div className="col-span-2">
                        <div className="text-muted-foreground text-[9px]">Beneficiário</div>
                        <div>{previewDados.beneficiario_nome || '(não configurado)'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground text-[9px]">Agência/Código</div>
                        <div>{previewDados.agencia_codigo || '—'}</div>
                      </div>
                    </div>

                    {/* Linha de dados do documento */}
                    <div className="grid grid-cols-6 gap-1 border-b pb-2 text-[10px]">
                      <div>
                        <div className="text-muted-foreground text-[8px]">Data Doc.</div>
                        <div>{previewDados.data_documento || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[8px]">Nº Doc.</div>
                        <div>{previewDados.numero_documento || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[8px]">Espécie</div>
                        <div>{previewDados.especie_documento || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[8px]">Aceite</div>
                        <div>{previewDados.aceite || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[8px]">Processam.</div>
                        <div>{previewDados.data_processamento || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground text-[8px]">Nosso Número</div>
                        <div className="font-bold">{previewDados.nosso_numero || '—'}</div>
                      </div>
                    </div>

                    {/* Valor */}
                    <div className="grid grid-cols-3 gap-2 border-b pb-2">
                      <div className="col-span-2">
                        <div className="text-muted-foreground text-[9px]">Instruções</div>
                        <div className="text-[9px]">{previewDados.instrucoes || '—'}</div>
                      </div>
                      <div className="text-right space-y-1">
                        <div>
                          <div className="text-muted-foreground text-[8px]">(=) Valor Documento</div>
                          <div className="font-bold">{previewDados.valor_documento ? `R$ ${Number(previewDados.valor_documento).toFixed(2)}` : '—'}</div>
                        </div>
                        {previewDados.valor_desconto && (
                          <div>
                            <div className="text-muted-foreground text-[8px]">(-) Desconto</div>
                            <div>R$ {Number(previewDados.valor_desconto).toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pagador */}
                    <div className="border-b pb-2">
                      <div className="text-muted-foreground text-[9px]">Pagador</div>
                      <div className="font-bold">{previewDados.pagador_nome || '—'}</div>
                      <div>{previewDados.pagador_cnpj || '—'}</div>
                      <div>{previewDados.pagador_endereco || '—'}</div>
                      <div>{previewDados.pagador_cidade_uf || '—'} {previewDados.pagador_cep ? `- ${previewDados.pagador_cep}` : ''}</div>
                    </div>

                    {/* Barcode placeholder */}
                    <div className="text-center py-2 bg-muted rounded">
                      <div className="text-[9px] text-muted-foreground">
                        {previewDados.codigo_barras ? '▐▐▐▐ CÓDIGO DE BARRAS ▐▐▐▐' : 'Código de barras não disponível'}
                      </div>
                    </div>
                  </div>

                  {/* Tabela de campos mapeados */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Campos mapeados ({previewItems.length})</h4>
                    <div className="text-xs space-y-1 max-h-[200px] overflow-y-auto">
                      {previewItems.map(item => (
                        <div key={item.key} className="flex justify-between border-b border-dashed py-1">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-right max-w-[60%] truncate">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
