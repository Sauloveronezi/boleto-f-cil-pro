export type BoletoTemplateField = {
  id: string
  template_id: string
  key: string
  source_ref?: string
  page: number
  bbox: [number, number, number, number]
  font_family?: string
  font_size?: number
  align?: 'left' | 'center' | 'right'
  format?: string
  is_barcode?: boolean
  is_digitable_line?: boolean
  created_at?: string
  updated_at?: string
}

export type BoletoTemplate = {
  id: string
  name: string
  bank_code?: string
  layout_version?: string
  background_pdf_url: string
  page_width: number
  page_height: number
  requires_calculation?: boolean
  created_at?: string
  updated_at?: string
  fields?: BoletoTemplateField[]
}

export type BoletoRenderMode = 'single' | 'merge' | 'zip'
