import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dados mock para modo demonstração
const MOCK_API_RESPONSE = {
  d: {
    results: [
      {
        PaymentRunID: "PR-001",
        PaymentRunIsProposal: false,
        PayingCompanyCode: "1000",
        Supplier: "SUP-123",
        Customer: "CUST-456",
        PaymentRecipient: "REC-789",
        PaymentDocument: "DOC-2024-001",
        Bank: "341",
        BankInternalID: "ITAU",
        BankAccount: "12345-6",
        BankAccountLongID: "0001123456",
        BankControlKey: "001",
        PaymentDueDate: "2024-12-15",
        PaymentAmountInPaytCurrency: 15750.50,
        PaytAmountInCoCodeCurrency: 15750.50,
        numero_nota: "000123",
        numero_cobranca: "COB-001",
        cnpj_cliente: "12.345.678/0001-90"
      }
    ]
  }
};

// Função para extrair campos de um objeto recursivamente
function extractFields(obj: any, prefix: string = ''): string[] {
  const fields: string[] = [];
  
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      fields.push(fieldPath);
      
      // Se for objeto, extrair campos aninhados
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        fields.push(...extractFields(value, fieldPath));
      }
    }
  }
  
  return fields;
}

// Função para obter valor em caminho JSON
function getValueByPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}

// Função para construir headers de autenticação
function buildAuthHeaders(auth: {
  tipo: string;
  usuario?: string;
  senha?: string;
  token?: string;
  api_key?: string;
  header_name?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {};
  
  switch (auth.tipo) {
    case 'basic':
      if (auth.usuario && auth.senha) {
        const credentials = btoa(`${auth.usuario}:${auth.senha}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }
      break;
    case 'bearer':
      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }
      break;
    case 'api_key':
      if (auth.api_key) {
        const headerName = auth.header_name || 'X-API-Key';
        headers[headerName] = auth.api_key;
      }
      break;
    case 'oauth2':
      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }
      break;
  }
  
  return headers;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      endpoint,
      json_path,
      tipo_autenticacao,
      auth_usuario,
      auth_senha,
      auth_token,
      auth_api_key,
      auth_header_name,
      modo_demo = true,
      integracao_id,
      limit = 1
    } = await req.json();

    console.log(`[test-api-connection] Testando conexão. Modo demo: ${modo_demo}`);

    let apiResponse: any;
    let campos_detectados: string[] = [];
    let sample_data: any = null;

    if (modo_demo) {
      console.log('[test-api-connection] Usando dados mock');
      apiResponse = MOCK_API_RESPONSE;
    } else {
      if (!endpoint) {
        throw new Error('Endpoint da API não configurado');
      }

      console.log(`[test-api-connection] Chamando API: ${endpoint}`);
      
      // Construir headers de autenticação
      const authHeaders = buildAuthHeaders({
        tipo: tipo_autenticacao,
        usuario: auth_usuario,
        senha: auth_senha,
        token: auth_token,
        api_key: auth_api_key,
        header_name: auth_header_name
      });

      // Adicionar parâmetro de limite se a API suportar
      let urlWithLimit = endpoint;
      if (limit && !endpoint.includes('$top=') && !endpoint.includes('limit=')) {
        const separator = endpoint.includes('?') ? '&' : '?';
        urlWithLimit = `${endpoint}${separator}$top=${limit}`;
      }

      const response = await fetch(urlWithLimit, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
      }

      apiResponse = await response.json();
    }

    // Extrair dados usando json_path
    let dados = apiResponse;
    if (json_path) {
      dados = getValueByPath(apiResponse, json_path);
    }

    // Garantir que temos um array
    if (!Array.isArray(dados)) {
      if (dados && typeof dados === 'object') {
        dados = [dados];
      } else {
        throw new Error('Resposta da API não contém dados válidos no caminho especificado');
      }
    }

    // Limitar quantidade de registros
    dados = dados.slice(0, limit);

    if (dados.length > 0) {
      // Extrair campos do primeiro registro
      campos_detectados = extractFields(dados[0]);
      sample_data = dados[0];
    }

    // Salvar campos detectados na integração se houver integracao_id
    if (integracao_id && campos_detectados.length > 0) {
      await supabase
        .from('vv_b_api_integracoes')
        .update({ campos_api_detectados: campos_detectados })
        .eq('id', integracao_id);
    }

    console.log(`[test-api-connection] Conexão bem-sucedida. ${campos_detectados.length} campos detectados.`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Conexão bem-sucedida!',
      campos_detectados,
      sample_data,
      total_registros: dados.length,
      raw_response_keys: Object.keys(apiResponse)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[test-api-connection] Erro:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
