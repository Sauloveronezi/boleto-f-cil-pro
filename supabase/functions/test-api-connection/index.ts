import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

function extractArrayFromApiResponse(raw: any, jsonPath?: string | null): any[] {
  let candidate = raw;

  if (jsonPath) {
    const viaPath = getValueByPath(raw, jsonPath);
    if (viaPath !== undefined && viaPath !== null) {
      candidate = viaPath;
    }
  }

  const candidates = [
    candidate,
    candidate?.d?.results,
    candidate?.d?.value,
    candidate?.value,
    candidate?.results,
    raw?.d?.results,
    raw?.d?.value,
    raw?.value,
    raw?.results,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }

  if (candidate && typeof candidate === 'object') return [candidate];
  if (raw && typeof raw === 'object') return [raw];
  return [];
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
      integracao_id,
      limit = 1
    } = await req.json();

    // Buscar credenciais do banco se não fornecidas e tiver integracao_id
    let finalAuthUsuario = auth_usuario;
    let finalAuthSenha = auth_senha;
    let finalAuthToken = auth_token;
    let finalAuthApiKey = auth_api_key;
    let finalEndpoint = endpoint;
    let finalJsonPath = json_path;
    let finalTipoAuth = tipo_autenticacao;
    let finalHeaderName = auth_header_name;

    if (integracao_id) {
      const { data: integracao, error: integracaoError } = await supabase
        .from('vv_b_api_integracoes')
        .select('*')
        .eq('id', integracao_id)
        .single();

      if (!integracaoError && integracao) {
        // Usar valores do banco se não foram fornecidos no request
        if (!finalEndpoint) finalEndpoint = integracao.endpoint_base;
        if (!finalJsonPath) finalJsonPath = integracao.json_path;
        if (!finalTipoAuth || finalTipoAuth === 'none') finalTipoAuth = integracao.tipo_autenticacao;
        if (!finalHeaderName) finalHeaderName = integracao.auth_header_name;
        if (!finalAuthUsuario) finalAuthUsuario = integracao.auth_usuario;
        if (!finalAuthSenha) finalAuthSenha = integracao.auth_senha_encrypted;
        if (!finalAuthToken) finalAuthToken = integracao.auth_token_encrypted;
        if (!finalAuthApiKey) finalAuthApiKey = integracao.auth_api_key_encrypted;
        
        console.log(`[test-api-connection] Usando credenciais da integração: ${integracao.nome}`);
      }
    }

    // Validar que endpoint foi fornecido
    if (!finalEndpoint) {
      throw new Error('Endpoint da API não configurado. Configure o endpoint antes de testar.');
    }

    console.log(`[test-api-connection] Testando conexão. Endpoint: ${finalEndpoint}`);

    let apiResponse: any;
    let campos_detectados: string[] = [];
    let sample_data: any = null;

    // Construir headers de autenticação
    const authHeaders = buildAuthHeaders({
      tipo: finalTipoAuth || 'none',
      usuario: finalAuthUsuario,
      senha: finalAuthSenha,
      token: finalAuthToken,
      api_key: finalAuthApiKey,
      header_name: finalHeaderName
    });

    // Não adicionar filtros - usar endpoint limpo
    // Apenas adicionar $top para limitar quantidade (sem $filter)
    let urlToCall = finalEndpoint;
    
    // Remover parâmetros de filtro existentes se houver
    const urlObj = new URL(finalEndpoint);
    urlObj.searchParams.delete('$filter');
    urlObj.searchParams.delete('filter');
    
    // Adicionar apenas limite de registros
    if (limit && !urlObj.searchParams.has('$top') && !urlObj.searchParams.has('limit')) {
      urlObj.searchParams.set('$top', String(limit));
    }
    
    urlToCall = urlObj.toString();

    console.log(`[test-api-connection] Chamando API (sem filtros): ${urlToCall}`);
    console.log(`[test-api-connection] Tipo auth: ${finalTipoAuth}, tem token: ${!!finalAuthToken}, tem senha: ${!!finalAuthSenha}`);

    const response = await fetch(urlToCall, {
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

    // Extrair dados (sem filtros) e tentar detectar automaticamente formatos comuns (OData)
    let dados = extractArrayFromApiResponse(apiResponse, finalJsonPath);

    // Garantir que temos dados
    if (!Array.isArray(dados) || dados.length === 0) {
      throw new Error('Resposta da API não contém dados válidos (verifique o caminho JSON ou o formato OData)');
    }

    // Limitar quantidade de registros (amostra)
    const samples = dados.slice(0, limit);

    if (samples.length > 0) {
      // Extrair campos do primeiro registro
      campos_detectados = extractFields(samples[0]);
      sample_data = samples[0];
    }

    // Salvar campos detectados (e credenciais informadas) na integração se houver integracao_id
    if (integracao_id) {
      const updatePayload: any = {
        campos_api_detectados: campos_detectados,
      };

      // Persistir credenciais APENAS se vieram no request (não sobrescrever com vazio)
      if (endpoint) updatePayload.endpoint_base = endpoint;
      if (json_path) updatePayload.json_path = json_path;
      if (tipo_autenticacao) updatePayload.tipo_autenticacao = tipo_autenticacao;
      if (auth_header_name) updatePayload.auth_header_name = auth_header_name;
      if (auth_usuario) updatePayload.auth_usuario = auth_usuario;
      if (auth_senha) updatePayload.auth_senha_encrypted = auth_senha;
      if (auth_token) updatePayload.auth_token_encrypted = auth_token;
      if (auth_api_key) updatePayload.auth_api_key_encrypted = auth_api_key;

      if (campos_detectados.length > 0 || Object.keys(updatePayload).length > 0) {
        await supabase
          .from('vv_b_api_integracoes')
          .update(updatePayload)
          .eq('id', integracao_id);
      }
    }

    console.log(`[test-api-connection] Conexão bem-sucedida. ${campos_detectados.length} campos detectados.`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Conexão bem-sucedida!',
      campos_detectados,
      sample_data,
      samples,
      samples_count: samples.length,
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
