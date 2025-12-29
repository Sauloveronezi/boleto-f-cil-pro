import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'boleto_templates';

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
 * Obter URL pública ou assinada do PDF
 */
export async function getPdfUrl(storagePath: string): Promise<string | null> {
  try {
    // Tenta URL pública primeiro
    const { data: publicUrl } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    if (publicUrl?.publicUrl) {
      return publicUrl.publicUrl;
    }

    // Se não funcionar, tenta URL assinada
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, 3600); // 1 hora

    if (error) {
      console.error('[pdfStorage] Error getting signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
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
