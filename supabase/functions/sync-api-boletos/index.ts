import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para construir headers de autenticação
function buildAuthHeaders(auth: {
  tipo: string;
  usuario?: string | null;
  senha?: string | null;
  token?: string | null;
  api_key?: string | null;
  header_name?: string | null;
}): Record<string, string> {
  const headers: Record<string, string> = {};

  const headerName = auth.header_name || 'Authorization';

  switch (auth.tipo) {
    case 'basic': {
      if (auth.usuario && auth.senha) {
        const credentials = btoa(`${auth.usuario}:${auth.senha}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }
      break;
    }

    case 'bearer':
    case 'oauth2': {
      if (auth.token) {
        headers[headerName] = `Bearer ${auth.token}`;
      }
      break;
    }

    case 'api_key': {
      if (auth.api_key) {
        const apiKeyHeaderName = auth.header_name || 'X-API-Key';
        headers[apiKeyHeaderName] = auth.api_key;
      }
      break;
    }

    case 'custom':
    case 'none':
    default:
      break;
  }

  return headers;
}

// Função para obter valor em caminho JSON
function getValueByPath(obj: any, path: string): any {
  if (!path) return obj;
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { integracao_id } = await req.json();

    if (!integracao_id) {
      throw new Error('ID da integração não fornecido');
    }

    // Buscar configuração da integração
    const { data: integracao, error: integracaoError } = await supabase
      .from('vv_b_api_integracoes')
      .select('*')
      .eq('id', integracao_id)
      .single();

    if (integracaoError || !integracao) {
      throw new Error(`Integração não encontrada: ${integracaoError?.message || 'ID inválido'}`);
    }

    if (!integracao.endpoint_base) {
      throw new Error('Endpoint da API não configurado na integração');
    }

    console.log(`[sync-api-boletos] Iniciando sincronização. Endpoint: ${integracao.endpoint_base}`);

    // Construir headers de autenticação (e mesclar com headers personalizados)
    const tipoAuth = integracao.tipo_autenticacao || 'none';
    const authHeaders = buildAuthHeaders({
      tipo: tipoAuth,
      usuario: integracao.auth_usuario,
      senha: integracao.auth_senha_encrypted, // atualmente armazenado em texto
      token: integracao.auth_token_encrypted, // atualmente armazenado em texto
      api_key: integracao.auth_api_key_encrypted, // atualmente armazenado em texto
      header_name: integracao.auth_header_name
    });

    // Headers personalizados (tipo custom)
    const customHeaders: Record<string, string> =
      integracao.headers_autenticacao && typeof integracao.headers_autenticacao === 'object'
        ? (integracao.headers_autenticacao as Record<string, string>)
        : {};

    // Validação mínima para evitar 401 por credencial ausente
    if (tipoAuth === 'basic' && (!integracao.auth_usuario || !integracao.auth_senha_encrypted)) {
      throw new Error('Credenciais Basic Auth não configuradas (usuário e senha).');
    }
    if ((tipoAuth === 'bearer' || tipoAuth === 'oauth2') && !integracao.auth_token_encrypted) {
      throw new Error('Token Bearer/OAuth2 não configurado.');
    }
    if (tipoAuth === 'api_key' && !integracao.auth_api_key_encrypted) {
      throw new Error('API Key não configurada.');
    }

    console.log(`[sync-api-boletos] Auth: ${tipoAuth}, custom_headers: ${Object.keys(customHeaders).length}, auth_headers: ${Object.keys(authHeaders).join(',')}`);

    // Chamar API real
    console.log(`[sync-api-boletos] Chamando API: ${integracao.endpoint_base}`);

    const apiResponse = await fetch(integracao.endpoint_base, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...customHeaders,
        ...authHeaders,
      }
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`Erro na API: ${apiResponse.status} ${apiResponse.statusText} - ${errorText.substring(0, 200)}`);
    }

    let dadosApi = await apiResponse.json();

    // Extrair dados usando json_path se configurado
    if (integracao.json_path) {
      dadosApi = getValueByPath(dadosApi, integracao.json_path);
    }

    // Garantir que temos um array
    if (!Array.isArray(dadosApi)) {
      if (dadosApi && typeof dadosApi === 'object') {
        dadosApi = [dadosApi];
      } else {
        throw new Error('Resposta da API não contém dados válidos');
      }
    }

    let erros: any[] = [];

    // Buscar clientes para mapear CNPJ -> id
    const { data: clientes, error: clientesError } = await supabase
      .from('vv_b_clientes')
      .select('id, cnpj')
      .is('deleted', null);

    if (clientesError) {
      throw new Error(`Erro ao buscar clientes: ${clientesError.message}`);
    }

    const cnpjToId = new Map(clientes?.map(c => [c.cnpj, c.id]) || []);

    // Buscar mapeamentos de campos configurados
    const { data: mapeamentos } = await supabase
      .from('vv_b_api_mapeamento_campos')
      .select('*')
      .eq('integracao_id', integracao_id)
      .is('deleted', null)
      .order('ordem', { ascending: true });

    let registrosNovos = 0;
    let registrosAtualizados = 0;

    for (const item of dadosApi) {
      try {
        // Aplicar mapeamentos configurados
        let numeroNota = item.numero_nota;
        let numeroCobranca = item.numero_cobranca;
        let cnpjCliente = item.cnpj_cliente;
        let dataEmissao = item.data_emissao;
        let dataVencimento = item.data_vencimento;
        let valor = item.valor;

        // Aplicar mapeamentos personalizados
        if (mapeamentos && mapeamentos.length > 0) {
          for (const map of mapeamentos) {
            const valorApi = getValueByPath(item, map.campo_api);
            if (valorApi !== undefined) {
              switch (map.campo_destino) {
                case 'numero_nota': numeroNota = valorApi; break;
                case 'numero_cobranca': numeroCobranca = valorApi; break;
                case 'cnpj_cliente': cnpjCliente = valorApi; break;
                case 'data_emissao': dataEmissao = valorApi; break;
                case 'data_vencimento': dataVencimento = valorApi; break;
                case 'valor': valor = valorApi; break;
              }
            }
          }
        }

        // Buscar cliente pelo CNPJ
        const clienteId = cnpjToId.get(cnpjCliente);
        
        if (!clienteId) {
          console.log(`[sync-api-boletos] Cliente não encontrado para CNPJ: ${cnpjCliente}`);
          erros.push({
            tipo: 'cliente_nao_encontrado',
            cnpj: cnpjCliente,
            numero_nota: numeroNota
          });
          continue;
        }

        // Separar campos estruturados dos extras
        const dadosEstruturados = {
          integracao_id,
          numero_nota: numeroNota,
          cliente_id: clienteId,
          numero_cobranca: numeroCobranca,
          data_emissao: dataEmissao,
          data_vencimento: dataVencimento,
          valor: valor,
          sincronizado_em: new Date().toISOString()
        };

        // Campos extras (todos que não são estruturados)
        const camposConhecidos = ['numero_nota', 'numero_cobranca', 'cnpj_cliente', 
          'data_emissao', 'data_vencimento', 'valor'];
        const dadosExtras: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(item)) {
          if (!camposConhecidos.includes(key)) {
            dadosExtras[key] = value;
          }
        }

        // Upsert - inserir ou atualizar se já existe
        const { data: existing, error: checkError } = await supabase
          .from('vv_b_boletos_api')
          .select('id')
          .eq('numero_nota', numeroNota)
          .eq('cliente_id', clienteId)
          .eq('numero_cobranca', numeroCobranca)
          .is('deleted', null)
          .maybeSingle();

        if (checkError) {
          console.error('[sync-api-boletos] Erro ao verificar existência:', checkError);
          throw checkError;
        }

        if (existing) {
          // Atualizar registro existente
          const { error: updateError } = await supabase
            .from('vv_b_boletos_api')
            .update({
              ...dadosEstruturados,
              dados_extras: dadosExtras
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
          registrosAtualizados++;
        } else {
          // Inserir novo registro
          const { error: insertError } = await supabase
            .from('vv_b_boletos_api')
            .insert({
              ...dadosEstruturados,
              dados_extras: dadosExtras
            });

          if (insertError) throw insertError;
          registrosNovos++;
        }

      } catch (itemError: any) {
        console.error('[sync-api-boletos] Erro no item:', itemError);
        erros.push({
          tipo: 'processamento',
          item: item.numero_nota,
          erro: itemError.message
        });
      }
    }

    const duracao = Date.now() - startTime;
    const status = erros.length === 0 ? 'sucesso' : (registrosNovos + registrosAtualizados > 0 ? 'parcial' : 'erro');

    // Registrar log de sincronização
    await supabase.from('vv_b_api_sync_log').insert({
      integracao_id,
      status,
      registros_processados: dadosApi.length,
      registros_novos: registrosNovos,
      registros_atualizados: registrosAtualizados,
      erros,
      duracao_ms: duracao
    });

    // Atualizar última sincronização na integração
    await supabase
      .from('vv_b_api_integracoes')
      .update({ ultima_sincronizacao: new Date().toISOString() })
      .eq('id', integracao_id);

    console.log(`[sync-api-boletos] Sincronização concluída. Status: ${status}, Novos: ${registrosNovos}, Atualizados: ${registrosAtualizados}`);

    return new Response(JSON.stringify({
      success: true,
      status,
      registros_processados: dadosApi.length,
      registros_novos: registrosNovos,
      registros_atualizados: registrosAtualizados,
      erros: erros.length > 0 ? erros : undefined,
      duracao_ms: duracao
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[sync-api-boletos] Erro:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
