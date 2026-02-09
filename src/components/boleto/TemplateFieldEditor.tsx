import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Save, Trash2, Eye, EyeOff } from 'lucide-react'
import type { BoletoTemplateFieldRow } from '@/hooks/useBoletoTemplates'
import { useUpdateTemplateField, useDeleteTemplateField } from '@/hooks/useBoletoTemplates'

const FORMAT_OPTIONS = [
  { value: '', label: '(nenhum)' },
  { value: 'date_ddmmyyyy', label: 'Data DD/MM/AAAA' },
  { value: 'currency_ptbr', label: 'Moeda R$ (pt-BR)' },
  { value: 'mask_cnpj', label: 'CNPJ/CPF' },
  { value: 'upper', label: 'MAIÚSCULAS' },
  { value: 'numeric_only', label: 'Somente números' },
]

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Esquerda' },
  { value: 'center', label: 'Centro' },
  { value: 'right', label: 'Direita' },
]

interface Props {
  fields: BoletoTemplateFieldRow[]
  templateId: string
}

export function TemplateFieldEditor({ fields, templateId }: Props) {
  const { toast } = useToast()
  const updateField = useUpdateTemplateField()
  const deleteField = useDeleteTemplateField()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<BoletoTemplateFieldRow>>({})

  const startEdit = (field: BoletoTemplateFieldRow) => {
    setEditingId(field.id)
    setEditValues({
      format: field.format || '',
      font_size: field.font_size,
      align: field.align,
      font_family: field.font_family,
      bold: field.bold,
      visible: field.visible,
      bbox: field.bbox,
      source_ref: field.source_ref,
    })
  }

  const handleSave = async () => {
    if (!editingId) return
    try {
      const updates: any = { ...editValues }
      if (updates.format === '') updates.format = null
      await updateField.mutateAsync({ fieldId: editingId, updates })
      toast({ title: 'Campo atualizado' })
      setEditingId(null)
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (fieldId: string) => {
    if (!confirm('Excluir este campo?')) return
    try {
      await deleteField.mutateAsync(fieldId)
      toast({ title: 'Campo excluído' })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const isEditing = (id: string) => editingId === id

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Campos do Template ({fields.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2 font-medium">Campo (key)</th>
                <th className="text-left p-2 font-medium">Source Ref</th>
                <th className="text-left p-2 font-medium">Formato</th>
                <th className="text-center p-2 font-medium">Fonte</th>
                <th className="text-center p-2 font-medium">Tam.</th>
                <th className="text-center p-2 font-medium">Alinhamento</th>
                <th className="text-center p-2 font-medium">Bold</th>
                <th className="text-center p-2 font-medium">Visível</th>
                <th className="text-left p-2 font-medium">BBox (mm)</th>
                <th className="text-center p-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fields.map(field => (
                <tr key={field.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-2 font-mono text-[11px]">{field.key}</td>

                  {/* Source Ref */}
                  <td className="p-2">
                    {isEditing(field.id) ? (
                      <Input
                        className="h-7 text-xs w-32"
                        value={editValues.source_ref || ''}
                        onChange={e => setEditValues(v => ({ ...v, source_ref: e.target.value }))}
                      />
                    ) : (
                      <span className="text-muted-foreground truncate max-w-[120px] block">{field.source_ref || '—'}</span>
                    )}
                  </td>

                  {/* Formato */}
                  <td className="p-2">
                    {isEditing(field.id) ? (
                      <Select value={editValues.format || '_none'} onValueChange={v => setEditValues(prev => ({ ...prev, format: v === '_none' ? '' : v }))}>
                        <SelectTrigger className="h-7 text-xs w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMAT_OPTIONS.map(o => (
                            <SelectItem key={o.value || '_none'} value={o.value || '_none'}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground">
                        {FORMAT_OPTIONS.find(o => o.value === (field.format || ''))?.label || field.format || '—'}
                      </span>
                    )}
                  </td>

                  {/* Font family */}
                  <td className="p-2 text-center">
                    {isEditing(field.id) ? (
                      <Select value={editValues.font_family || 'helvetica'} onValueChange={v => setEditValues(prev => ({ ...prev, font_family: v }))}>
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="helvetica">Helvetica</SelectItem>
                          <SelectItem value="times">Times</SelectItem>
                          <SelectItem value="courier">Courier</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span>{field.font_family || 'helvetica'}</span>
                    )}
                  </td>

                  {/* Font size */}
                  <td className="p-2 text-center">
                    {isEditing(field.id) ? (
                      <Input
                        type="number"
                        className="h-7 text-xs w-14 text-center"
                        value={editValues.font_size || 10}
                        onChange={e => setEditValues(v => ({ ...v, font_size: Number(e.target.value) }))}
                      />
                    ) : (
                      <span>{field.font_size}</span>
                    )}
                  </td>

                  {/* Align */}
                  <td className="p-2 text-center">
                    {isEditing(field.id) ? (
                      <Select value={editValues.align || 'left'} onValueChange={v => setEditValues(prev => ({ ...prev, align: v }))}>
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALIGN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span>{field.align}</span>
                    )}
                  </td>

                  {/* Bold */}
                  <td className="p-2 text-center">
                    {isEditing(field.id) ? (
                      <Switch
                        checked={!!editValues.bold}
                        onCheckedChange={v => setEditValues(prev => ({ ...prev, bold: v }))}
                      />
                    ) : (
                      <span>{field.bold ? '✓' : '—'}</span>
                    )}
                  </td>

                  {/* Visible */}
                  <td className="p-2 text-center">
                    {isEditing(field.id) ? (
                      <Switch
                        checked={editValues.visible !== false}
                        onCheckedChange={v => setEditValues(prev => ({ ...prev, visible: v }))}
                      />
                    ) : (
                      field.visible !== false ? <Eye className="h-3 w-3 mx-auto text-muted-foreground" /> : <EyeOff className="h-3 w-3 mx-auto text-muted-foreground" />
                    )}
                  </td>

                  {/* BBox */}
                  <td className="p-2">
                    {isEditing(field.id) ? (
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map(i => (
                          <Input
                            key={i}
                            type="number"
                            step="0.5"
                            className="h-7 text-xs w-14 text-center"
                            value={editValues.bbox?.[i] ?? field.bbox[i]}
                            onChange={e => {
                              const newBbox = [...(editValues.bbox || field.bbox)] as [number, number, number, number]
                              newBbox[i] = Number(e.target.value)
                              setEditValues(prev => ({ ...prev, bbox: newBbox }))
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        [{field.bbox.map(v => v.toFixed(1)).join(', ')}]
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-2 text-center">
                    {isEditing(field.id) ? (
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="default" className="h-7 px-2" onClick={handleSave} disabled={updateField.isPending}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>✕</Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => startEdit(field)}>Editar</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => handleDelete(field.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
