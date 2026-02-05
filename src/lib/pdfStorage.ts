import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'boleto_templates';

// Fallback apenas para o modelo padrão do sistema (evita falha quando o objeto ainda não foi anexado ao Storage)
const DEFAULT_FEBRABAN_STORAGE_PATH = 'modelos/modelo_padrao_febraban/boleto_padrao.pdf';
const DEFAULT_FALLBACK_PUBLIC_PDF_URL = '/templates/boleto_padrao_bradesco.pdf';

export interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Upload de PDF para o Supabase Storage
 */
export async function uploadPdfToStorage(
  file: File,
  modeloId: string
): Promise<UploadResult> {
  try {
    const timestamp = Date.now();
    const path = `modelos/${modeloId}/${timestamp}.pdf`;

    console.log('[pdfStorage] Uploading PDF:', {
      modeloId,
      fileSize: file.size,
      path,
    });

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[pdfStorage] Upload error:', uploadError);
      return {
        success: false,
        error: uploadError.message,
      };
    }

    console.log('[pdfStorage] Upload successful:', path);

    return {
      success: true,
      path,
    };
  } catch (err: any) {
    console.error('[pdfStorage] Upload exception:', err);
    return {
      success: false,
      error: err.message || 'Erro desconhecido',
    };
  }
}

/**
 * Upload de PDF a partir de base64
 */
export async function uploadBase64ToStorage(
  base64Data: string,
  modeloId: string
): Promise<UploadResult> {
  try {
    // Remove data URL prefix se existir
    const base64Content = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    // Converte base64 para Blob
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });

    const timestamp = Date.now();
    const path = `modelos/${modeloId}/${timestamp}.pdf`;

    console.log('[pdfStorage] Uploading base64 PDF:', {
      modeloId,
      blobSize: blob.size,
      path,
    });

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf',
      });

    if (uploadError) {
      console.error('[pdfStorage] Base64 upload error:', uploadError);
      return {
        success: false,
        error: uploadError.message,
      };
    }

    console.log('[pdfStorage] Base64 upload successful:', path);

    return {
      success: true,
      path,
    };
  } catch (err: any) {
    console.error('[pdfStorage] Base64 upload exception:', err);
    return {
      success: false,
      error: err.message || 'Erro desconhecido',
    };
  }
}

/**
 * Obter URL assinada do PDF (bucket é privado)
 */
export async function getPdfUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) {
    console.warn('[pdfStorage] Empty storage path provided');
    return null;
  }

  try {
    console.log('[pdfStorage] Getting signed URL for:', storagePath);
    
    // Bucket é privado, usar sempre URL assinada
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, 3600); // 1 hora

    if (error) {
      console.error('[pdfStorage] Error getting signed URL:', error);

      const isNotFound =
        (error as any)?.statusCode === '404' ||
        (error as any)?.status === 404 ||
        /object not found|not found/i.test(error?.message || '');

      if (isNotFound && storagePath === DEFAULT_FEBRABAN_STORAGE_PATH) {
        console.warn(
          `[pdfStorage] PDF padrão não encontrado no storage (${storagePath}). Usando fallback público: ${DEFAULT_FALLBACK_PUBLIC_PDF_URL}`
        );
        return DEFAULT_FALLBACK_PUBLIC_PDF_URL;
      }

      return null;
    }

    if (data?.signedUrl) {
      console.log('[pdfStorage] Signed URL obtained successfully');
      return data.signedUrl;
    }

    console.warn('[pdfStorage] No signed URL returned');
    return null;
  } catch (err) {
    console.error('[pdfStorage] Error getting PDF URL:', err);
    return null;
  }
}

/**
 * Deletar PDF antigo do storage
 */
export async function deletePdfFromStorage(storagePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      console.error('[pdfStorage] Delete error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[pdfStorage] Delete exception:', err);
    return false;
  }
}
