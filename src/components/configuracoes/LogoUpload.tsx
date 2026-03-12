import { useRef, useState } from 'react';
import { Upload, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LogoUploadProps {
  currentLogoPath: string | null;
  onLogoUploaded: (storagePath: string) => void;
}

export function LogoUpload({ currentLogoPath, onLogoUploaded }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load preview from storage if path exists
  useState(() => {
    if (currentLogoPath) {
      supabase.storage
        .from('boleto_templates')
        .createSignedUrl(currentLogoPath, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) setPreviewUrl(data.signedUrl);
        });
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Selecione uma imagem (PNG, JPG, SVG).', variant: 'destructive' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'A logo deve ter no máximo 2MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `logos/empresa_logo_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('boleto_templates')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: signedData } = await supabase.storage
        .from('boleto_templates')
        .createSignedUrl(path, 3600);

      setPreviewUrl(signedData?.signedUrl || null);
      onLogoUploaded(path);
      toast({ title: 'Logo enviada', description: 'A logo foi carregada com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onLogoUploaded('');
  };

  return (
    <div className="space-y-3">
      <Label>Logo da Empresa</Label>
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
          {previewUrl ? (
            <img src={previewUrl} alt="Logo" className="w-full h-full object-contain p-1" />
          ) : (
            <Building2 className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Enviando...' : 'Enviar Logo'}
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Remover
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">PNG, JPG ou SVG. Máx. 2MB.</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
