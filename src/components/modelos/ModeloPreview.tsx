import { useEffect, useState } from 'react'
import { renderPDFToImage } from '@/lib/pdfAnalyzer'
import { ElementoLayout } from './EditorLayoutBoleto'
import { getPdfUrl } from '@/lib/pdfStorage'

const ESCALA = 2

export function ModeloPreview({ modelo, editable = false, onSave }: { modelo: any; editable?: boolean; onSave?: (elements: ElementoLayout[]) => void }) {
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [elements, setElements] = useState<ElementoLayout[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number; ex: number; ey: number; ew: number; eh: number } | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        if (modelo?.pdf_storage_path) {
          const url = await getPdfUrl(modelo.pdf_storage_path)
          if (!mounted) return
          if (url) {
            const img = await renderPDFToImage(url, 2)
            if (!mounted) return
            setBgUrl(img.dataUrl)
          } else {
            setBgUrl(null)
          }
        } else {
          setBgUrl(null)
        }
      } catch {
        if (mounted) setBgUrl(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [modelo?.pdf_storage_path])

  const elementosBase: ElementoLayout[] = (modelo?.campos_mapeados || []).map((c: any, i: number) => ({
    id: String(c.id) || `field_${i}`,
    tipo: (c.tipo as 'campo'|'texto'|'linha'|'retangulo') || 'campo',
    nome: c.nome || '',
    variavel: c.variavel || '',
    textoFixo: c.textoFixo || '',
    x: c.posicao_x ?? c.x ?? 0,
    y: c.posicao_y ?? c.y ?? 0,
    largura: c.largura || 120,
    altura: c.altura || 20,
    tamanhoFonte: c.tamanhoFonte || 10,
    alinhamento: (c.alinhamento as 'left'|'center'|'right') || 'left',
    corTexto: c.corTexto || '#000000',
    corFundo: c.corFundo || 'transparent',
    visivel: c.visivel !== false
  }))
  useEffect(() => {
    setElements(elementosBase)
  }, [modelo?.campos_mapeados])

  const w = (modelo?.largura_pagina || 210) * ESCALA
  const h = (modelo?.altura_pagina || 297) * ESCALA

  const addElement = (tipo: 'texto'|'linha'|'retangulo'|'campo') => {
    const id = `el_${Date.now()}_${Math.random().toString(36).slice(2,9)}`
    const novo: ElementoLayout = {
      id, tipo, nome: tipo,
      x: 20, y: 20, largura: tipo==='linha' ? 200 : 120, altura: tipo==='linha' ? 2 : 20,
      textoFixo: tipo==='texto' ? 'Texto' : undefined,
      variavel: tipo==='campo' ? '{{novo_campo}}' : undefined,
      tamanhoFonte: 10, alinhamento: 'left', corTexto: '#000', corFundo: tipo==='linha' ? '#000' : 'transparent', visivel: true
    }
    setElements(prev => [...prev, novo])
    setSelectedId(id)
  }

  const handleMouseDown = (e: React.MouseEvent, el: ElementoLayout, handle?: string) => {
    if (!editable) return
    e.preventDefault()
    setSelectedId(el.id)
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
    const mx = (e.clientX - rect.left) / ESCALA
    const my = (e.clientY - rect.top) / ESCALA
    setDragStart({ x: mx, y: my, ex: el.x, ey: el.y, ew: el.largura, eh: el.altura })
    if (handle) setIsResizing(handle)
    else setIsDragging(true)
  }
  const handleMouseUp = () => {
    setIsDragging(false); setIsResizing(null); setDragStart(null)
  }
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editable || (!isDragging && !isResizing) || !dragStart || !selectedId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / ESCALA
    const my = (e.clientY - rect.top) / ESCALA
    setElements(prev => prev.map(el => {
      if (el.id !== selectedId) return el
      if (isDragging) {
        const nx = Math.max(0, Math.min(w/ESCALA - dragStart.ew, dragStart.ex + (mx - dragStart.x)))
        const ny = Math.max(0, Math.min(h/ESCALA - dragStart.eh, dragStart.ey + (my - dragStart.y)))
        return { ...el, x: Math.round(nx), y: Math.round(ny) }
      } else if (isResizing) {
        let nx = el.x, ny = el.y, nw = el.largura, nh = el.altura
        if (isResizing.includes('e')) nw = Math.max(20, mx - dragStart.ex)
        if (isResizing.includes('s')) nh = Math.max(10, my - dragStart.ey)
        if (isResizing.includes('w')) {
          const newW = Math.max(20, dragStart.ex + dragStart.ew - mx)
          nx = dragStart.ex + dragStart.ew - newW
          nw = newW
        }
        if (isResizing.includes('n')) {
          const newH = Math.max(10, dragStart.ey + dragStart.eh - my)
          ny = dragStart.ey + dragStart.eh - newH
          nh = newH
        }
        return { ...el, x: Math.round(nx), y: Math.round(ny), largura: Math.round(nw), altura: Math.round(nh) }
      }
      return el
    }))
  }
  const saveElements = () => {
    onSave?.(elements)
  }
  const removeSelected = () => {
    if (!selectedId) return
    setElements(prev => prev.filter(e => e.id !== selectedId))
    setSelectedId(null)
  }
  const setAlign = (align: 'left'|'center'|'right') => {
    if (!selectedId) return
    setElements(prev => prev.map(e => e.id===selectedId ? { ...e, alinhamento: align } : e))
  }
  const setText = (text: string) => {
    if (!selectedId) return
    setElements(prev => prev.map(e => e.id===selectedId ? { ...e, textoFixo: text } : e))
  }

  return (
    <div className="relative bg-white" style={{ width: w, height: h }} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      {bgUrl && !loading && (
        <img src={bgUrl} alt="Fundo PDF" className="absolute inset-0 w-full h-full object-contain" style={{ opacity: 0.5 }} />
      )}
      {elements.filter(e => e.visivel).map(e => {
        const style: React.CSSProperties = {
          position: 'absolute',
          left: e.x * ESCALA,
          top: e.y * ESCALA,
          width: e.largura * ESCALA,
          height: e.altura * ESCALA,
          border: e.tipo === 'retangulo' ? '1px solid #000' : undefined,
          fontSize: (e.tamanhoFonte || 10) * ESCALA * 0.5,
          textAlign: e.alinhamento || 'left',
          color: e.corTexto || '#000',
          backgroundColor: e.corFundo || 'transparent',
          overflow: 'hidden'
        }
        const content = e.tipo === 'texto' ? (e.textoFixo || '') : (e.variavel || e.nome)
        if (e.tipo === 'linha') {
          return <div key={e.id} style={{ ...style, backgroundColor: e.corFundo || '#000' }} onMouseDown={(ev)=>handleMouseDown(ev, e)} />
        }
        return (
          <div key={e.id} style={{...style, outline: selectedId===e.id ? '2px solid var(--primary)' : undefined}} className="px-1 flex items-center text-xs" onMouseDown={(ev)=>handleMouseDown(ev, e)}>
            {content}
            {editable && selectedId===e.id && (
              <>
                <div style={{ position:'absolute', top:-4, left:'50%', width:8, height:8, background:'var(--primary)', transform:'translateX(-50%)', cursor:'ns-resize' }} onMouseDown={(ev)=>handleMouseDown(ev, e, 'n')} />
                <div style={{ position:'absolute', bottom:-4, left:'50%', width:8, height:8, background:'var(--primary)', transform:'translateX(-50%)', cursor:'ns-resize' }} onMouseDown={(ev)=>handleMouseDown(ev, e, 's')} />
                <div style={{ position:'absolute', top:'50%', left:-4, width:8, height:8, background:'var(--primary)', transform:'translateY(-50%)', cursor:'ew-resize' }} onMouseDown={(ev)=>handleMouseDown(ev, e, 'w')} />
                <div style={{ position:'absolute', top:'50%', right:-4, width:8, height:8, background:'var(--primary)', transform:'translateY(-50%)', cursor:'ew-resize' }} onMouseDown={(ev)=>handleMouseDown(ev, e, 'e')} />
              </>
            )}
          </div>
        )
      })}
      {editable && (
        <div className="absolute top-2 left-2 bg-white/80 border rounded p-2 flex gap-2">
          <button className="px-2 py-1 border rounded" onClick={()=>addElement('texto')}>Texto</button>
          <button className="px-2 py-1 border rounded" onClick={()=>addElement('campo')}>Campo</button>
          <button className="px-2 py-1 border rounded" onClick={()=>addElement('linha')}>Linha</button>
          <button className="px-2 py-1 border rounded" onClick={()=>addElement('retangulo')}>Retângulo</button>
          <button className="px-2 py-1 border rounded" onClick={removeSelected} disabled={!selectedId}>Remover</button>
          <button className="px-2 py-1 border rounded" onClick={()=>setAlign('left')} disabled={!selectedId}>Esq</button>
          <button className="px-2 py-1 border rounded" onClick={()=>setAlign('center')} disabled={!selectedId}>Centro</button>
          <button className="px-2 py-1 border rounded" onClick={()=>setAlign('right')} disabled={!selectedId}>Dir</button>
          <button className="px-2 py-1 border rounded bg-primary text-primary-foreground" onClick={saveElements}>Salvar</button>
        </div>
      )}
    </div>
  )
}
