import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmpresaDados {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  logoUrl: string | null;
}

export function useEmpresaDados() {
  return useQuery({
    queryKey: ['empresa-dados'],
    queryFn: async (): Promise<EmpresaDados | null> => {
      const { data, error } = await supabase
        .from('vv_b_empresas')
        .select('id, razao_social, nome_fantasia, cnpj, logo_url')
        .is('deleted', null)
        .limit(1)
        .single();

      if (error) return null;

      let logoUrl: string | null = null;
      if (data.logo_url) {
        // Generate signed URL for the logo
        const { data: signedData } = await supabase.storage
          .from('boleto_templates')
          .createSignedUrl(data.logo_url, 3600);
        logoUrl = signedData?.signedUrl || null;
      }

      return {
        id: data.id,
        razaoSocial: data.razao_social,
        nomeFantasia: data.nome_fantasia || '',
        cnpj: data.cnpj,
        logoUrl,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
