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

  const authorizationHeaderName = auth.header_name || 'Authorization';

  switch (auth.tipo) {
    case 'basic': {
      if (auth.usuario && auth.senha) {
        // Se já vier no formato "Basic xxx", respeitar
        if (/^basic\s+/i.test(auth.senha.trim())) {
          headers['Authorization'] = auth.senha.trim();
        } else {
          const credentials = btoa(`${auth.usuario}:${auth.senha}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
      }
      break;
    }

    case 'bearer':
    case 'oauth2': {
      if (auth.token) {
        const token = auth.token.trim();
        // Se o usuário colou o header completo ("Bearer xxx"), não duplicar
        headers[authorizationHeaderName] = /^bearer\s+/i.test(token) ? token : `Bearer ${token}`;
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

function extractArrayFromApiResponse(raw: any, jsonPath?: string | null): any[] {
  let candidate = raw;

  if (jsonPath) {
    const viaPath = getValueByPath(raw, jsonPath);
    if (viaPath !== undefined && viaPath !== null) {
      candidate = viaPath;
    } else {
      console.log(`[sync-api-boletos] json_path "${jsonPath}" não retornou dados; tentando detecção automática.`);
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

    // Chamar API real (SEM filtros)
    const urlObj = new URL(integracao.endpoint_base);
    urlObj.searchParams.delete('$filter');
    urlObj.searchParams.delete('filter');
    const endpointSemFiltros = urlObj.toString();

    console.log(`[sync-api-boletos] Chamando API (sem filtros): ${endpointSemFiltros}`);

    const apiResponse = await fetch(endpointSemFiltros, {
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

    const rawApiResponse = await apiResponse.json();

    const dadosApi = extractArrayFromApiResponse(rawApiResponse, integracao.json_path);

    // Garantir que temos dados
    if (!Array.isArray(dadosApi) || dadosApi.length === 0) {
      throw new Error('Resposta da API não contém lista de dados (verifique o caminho JSON ou o formato OData)');
    }

    console.log(`[sync-api-boletos] Registros recebidos da API: ${dadosApi.length}`);

    let erros: any[] = [];

    // Buscar clientes para mapear CNPJ -> id
    const { data: clientes, error: clientesError } = await supabase
      .from('vv_b_clientes')
      .select('id, cnpj')
      .or('deleted.is.null,deleted.eq.""');

    if (clientesError) {
      throw new Error(`Erro ao buscar clientes: ${clientesError.message}`);
    }

    const normalizeCnpj = (v: any) => String(v ?? '').replace(/\D/g, '');
    const cnpjToId = new Map(clientes?.map(c => [normalizeCnpj(c.cnpj), c.id]) || []);

    // Buscar mapeamentos de campos configurados
    const { data: mapeamentos } = await supabase
      .from('vv_b_api_mapeamento_campos')
      .select('*')
      .eq('integracao_id', integracao_id)
      .or('deleted.is.null,deleted.eq.""')
      .order('ordem', { ascending: true });

    let registrosNovos = 0;
    let registrosAtualizados = 0;

    for (const item of dadosApi) {
      try {
        // Inicializar com heurísticas (funciona mesmo sem mapeamento, mas o recomendado é mapear)
        let numeroNota: string | undefined = item?.numero_nota ?? item?.numeroNota ?? item?.PaymentDocument;
        let numeroCobranca: string | undefined = item?.numero_cobranca ?? item?.numeroCobranca ?? item?.PaymentRunID;
        let cnpjCliente: string | undefined = item?.cliente_cnpj ?? item?.cnpj_cliente ?? item?.TaxNumber1;
        let dataEmissao: string | undefined = item?.data_emissao ?? item?.PostingDate;
        let dataVencimento: string | undefined = item?.data_vencimento ?? item?.PaymentDueDate;
        let valor: number | undefined = item?.valor ?? item?.PaymentAmountInPaytCurrency;

        // Aplicar mapeamentos personalizados
        if (mapeamentos && mapeamentos.length > 0) {
          for (const map of mapeamentos) {
            const valorApi = getValueByPath(item, map.campo_api);
            if (valorApi !== undefined) {
              switch (map.campo_destino) {
                case 'numero_nota': numeroNota = String(valorApi); break;
                case 'numero_cobranca': numeroCobranca = String(valorApi); break;
                case 'cliente_cnpj': cnpjCliente = String(valorApi); break;
                case 'data_emissao': dataEmissao = String(valorApi); break;
                case 'data_vencimento': dataVencimento = String(valorApi); break;
                case 'valor': valor = Number(valorApi); break;
              }
            }
          }
        }

        // Log para debug
        console.log(`[sync-api-boletos] Item processado: nota=${numeroNota}, cobranca=${numeroCobranca}, cnpj=${cnpjCliente}`);

        // Validar campos essenciais antes de gravar/consultar
        if (!numeroNota || !numeroCobranca || !cnpjCliente) {
          erros.push({
            tipo: 'campos_obrigatorios_ausentes',
            numero_nota: numeroNota,
            numero_cobranca: numeroCobranca,
            cnpj: cnpjCliente,
          });
          continue;
        }

        // Buscar cliente pelo CNPJ - se não existir, criar automaticamente
        let clienteId = cnpjToId.get(normalizeCnpj(cnpjCliente)) ?? null;
        
        if (!clienteId) {
          console.log(`[sync-api-boletos] Cliente não encontrado para CNPJ: ${cnpjCliente} - criando automaticamente`);
          
          // Extrair dados do cliente da API (com fallbacks)
          const nomeCliente = item?.CustomerName ?? item?.nome_cliente ?? item?.razao_social ?? 
                              item?.BusinessPartnerFullName ?? item?.SupplierName ?? `Cliente ${cnpjCliente}`;
          
          // Criar novo cliente
          const { data: novoCliente, error: createClienteError } = await supabase
            .from('vv_b_clientes')
            .insert({
              cnpj: cnpjCliente,
              razao_social: String(nomeCliente),
              endereco: item?.endereco ?? item?.StreetName ?? null,
              cidade: item?.cidade ?? item?.CityName ?? null,
              estado: item?.estado ?? item?.Region ?? null,
              cep: item?.cep ?? item?.PostalCode ?? null,
              email: item?.email ?? item?.EmailAddress ?? null,
              telefone: item?.telefone ?? item?.PhoneNumber ?? null,
              business_partner: item?.BusinessPartner ?? item?.business_partner ?? null,
              parceiro_negocio: item?.parceiro_negocio ?? null,
            })
            .select('id')
            .single();
          
          if (createClienteError) {
            console.error(`[sync-api-boletos] Erro ao criar cliente: ${createClienteError.message}`);
            erros.push({
              tipo: 'erro_criar_cliente',
              cnpj: cnpjCliente,
              numero_nota: numeroNota,
              erro: createClienteError.message
            });
          } else if (novoCliente) {
            clienteId = novoCliente.id;
            // Atualizar o mapa local para evitar duplicatas no mesmo lote
            cnpjToId.set(normalizeCnpj(cnpjCliente), clienteId);
            console.log(`[sync-api-boletos] Cliente criado com sucesso: ${clienteId}`);
          }
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
        const camposConhecidos = ['numero_nota', 'numero_cobranca', 'cliente_cnpj', 'cnpj_cliente',
          'data_emissao', 'data_vencimento', 'valor'];
        const dadosExtras: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(item)) {
          if (!camposConhecidos.includes(key)) {
            dadosExtras[key] = value;
          }
        }

        // Sempre persistir o CNPJ original nos extras para conciliação
        dadosExtras.cliente_cnpj = cnpjCliente;

        // Upsert - inserir ou atualizar se já existe
        let existingQuery: any = supabase
          .from('vv_b_boletos_api')
          .select('id')
          .eq('integracao_id', integracao_id)
          .eq('numero_nota', numeroNota)
          .eq('numero_cobranca', numeroCobranca)
          .or('deleted.is.null,deleted.eq.""');

        existingQuery = clienteId
          ? existingQuery.eq('cliente_id', clienteId)
          : existingQuery.is('cliente_id', null);

        const { data: existing, error: checkError } = await existingQuery.maybeSingle();

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
