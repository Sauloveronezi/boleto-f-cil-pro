import { ElementoLayout } from '@/components/modelos/EditorLayoutBoleto'

export function gerarDocumentacaoLayout(nome: string, elementos: ElementoLayout[]): string {
  const campos = elementos.filter(e => e.tipo === 'campo')
  const textos = elementos.filter(e => e.tipo === 'texto')
  const linhas = elementos.filter(e => e.tipo === 'linha' || e.tipo === 'retangulo')
  const uniqVars = Array.from(new Set(campos.map(c => c.variavel).filter(Boolean)))
  let doc = `# Documentação do Layout: ${nome}\n\n`
  doc += `Gerado em ${new Date().toLocaleString()}\n\n`
  doc += `## Resumo\n`
  doc += `- Campos: ${campos.length}\n`
  doc += `- Textos: ${textos.length}\n`
  doc += `- Elementos gráficos: ${linhas.length}\n\n`
  doc += `## Variáveis\n`
  uniqVars.forEach(v => { doc += `- ${v}\n` })
  doc += `\n## Mapeamento\n`
  campos.forEach(c => {
    doc += `- ${c.nome} (${c.variavel}): x=${c.x}, y=${c.y}, w=${c.largura}, h=${c.altura}\n`
  })
  return doc
}

export function downloadDocumentacao(nome: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nome.replace(/\s+/g, '_').toLowerCase()}_doc.md`
  a.click()
  URL.revokeObjectURL(url)
}
