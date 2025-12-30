import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tamanho do batch para processamento
const BATCH_SIZE = 100;

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
    default:
      break;
  }
  return headers;
}

// Função para converter data OData para ISO
function parseODataDate(value: any): string | null {
  if (!value) return null;
  const strValue = String(value);
  
  const odataMatch = strValue.match(/\/Date\((-?\d+)([+-]\d{4})?\)\//);
  if (odataMatch) {
    const timestamp = parseInt(odataMatch[1], 10);
    return new Date(timestamp).toISOString().split('T')[0];
  }
  
  if (/^\d{4}-\d{2}-\d{2}/.test(strValue)) {
    return strValue.split('T')[0];
  }
  
  const parsed = new Date(strValue);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return null;
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

const normalizeCnpj = (v: any) => String(v ?? '').replace(/\D/g, '');

serve(async (req) => {
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

    // Construir headers de autenticação
    const tipoAuth = integracao.tipo_autenticacao || 'none';
    const authHeaders = buildAuthHeaders({
      tipo: tipoAuth,
      usuario: integracao.auth_usuario,
      senha: integracao.auth_senha_encrypted,
      token: integracao.auth_token_encrypted,
      api_key: integracao.auth_api_key_encrypted,
      header_name: integracao.auth_header_name
    });

    const customHeaders: Record<string, string> =
      integracao.headers_autenticacao && typeof integracao.headers_autenticacao === 'object'
        ? (integracao.headers_autenticacao as Record<string, string>)
        : {};

    // Validação de credenciais
    if (tipoAuth === 'basic' && (!integracao.auth_usuario || !integracao.auth_senha_encrypted)) {
      throw new Error('Credenciais Basic Auth não configuradas.');
    }
    if ((tipoAuth === 'bearer' || tipoAuth === 'oauth2') && !integracao.auth_token_encrypted) {
      throw new Error('Token Bearer/OAuth2 não configurado.');
    }
    if (tipoAuth === 'api_key' && !integracao.auth_api_key_encrypted) {
      throw new Error('API Key não configurada.');
    }

    // Chamar API
    const urlObj = new URL(integracao.endpoint_base);
    urlObj.searchParams.delete('$filter');
    urlObj.searchParams.delete('filter');
    const endpointSemFiltros = urlObj.toString();

    console.log(`[sync-api-boletos] Chamando API: ${endpointSemFiltros}`);

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
      throw new Error(`Erro na API: ${apiResponse.status} - ${errorText.substring(0, 200)}`);
    }

    const rawApiResponse = await apiResponse.json();
    const dadosApi = extractArrayFromApiResponse(rawApiResponse, integracao.json_path);

    if (!Array.isArray(dadosApi) || dadosApi.length === 0) {
      throw new Error('Resposta da API não contém lista de dados');
    }

    console.log(`[sync-api-boletos] Registros recebidos: ${dadosApi.length}`);

    // Buscar clientes para mapear CNPJ -> id
    const { data: clientes } = await supabase
      .from('vv_b_clientes')
      .select('id, cnpj')
      .or('deleted.is.null,deleted.eq.""');

    const cnpjToId = new Map(clientes?.map(c => [normalizeCnpj(c.cnpj), c.id]) || []);

    // Buscar mapeamentos de campos
    const { data: mapeamentos } = await supabase
      .from('vv_b_api_mapeamento_campos')
      .select('*')
      .eq('integracao_id', integracao_id)
      .or('deleted.is.null,deleted.eq.""')
      .order('ordem', { ascending: true });

    let registrosNovos = 0;
    let registrosAtualizados = 0;
    const erros: any[] = [];
    const clientesParaCriar: Map<string, any> = new Map();
    const registrosComErro: any[] = []; // Para registrar na tabela de erros

    // Primeiro passo: preparar todos os dados e identificar clientes a criar
    const registrosPreparados: any[] = [];

    for (const item of dadosApi) {
      try {
        let numeroNota: string | undefined = item?.numero_nota ?? item?.numeroNota ?? item?.PaymentDocument;
        let numeroCobranca: string | undefined = item?.numero_cobranca ?? item?.numeroCobranca ?? item?.PaymentRunID;
        let cnpjCliente: string | undefined = item?.cliente_cnpj ?? item?.cnpj_cliente ?? item?.TaxNumber1;
        let dataEmissao: string | undefined = item?.data_emissao ?? item?.PostingDate;
        let dataVencimento: string | undefined = item?.data_vencimento ?? item?.PaymentDueDate;
        let valor: number | undefined = item?.valor ?? item?.PaymentAmountInPaytCurrency;
        let dataDesconto: string | undefined = item?.data_desconto;
        let valorDesconto: number | undefined = item?.valor_desconto;
        let banco: string | undefined = item?.banco;
        let empresa: number | undefined = item?.empresa;
        let cliente: string | undefined = item?.cliente ?? item?.CustomerName;
        
        // Campos dinâmicos para dados_extras (campos que começam com dados_extras.)
        const dadosExtras: Record<string, any> = {};
        
        // Colunas dinâmicas reais (prefixo dyn_)
        const colunasDinamicas: Record<string, any> = {};

        // Aplicar mapeamentos personalizados
        if (mapeamentos && mapeamentos.length > 0) {
          for (const map of mapeamentos) {
            const valorApi = getValueByPath(item, map.campo_api);
            if (valorApi !== undefined) {
              // Verificar se é campo dinâmico antigo (dados_extras.*)
              if (map.campo_destino.startsWith('dados_extras.')) {
                const nomeCampo = map.campo_destino.replace('dados_extras.', '');
                // Aplicar conversão de tipo
                switch (map.tipo_dado) {
                  case 'number': dadosExtras[nomeCampo] = Number(valorApi); break;
                  case 'date': dadosExtras[nomeCampo] = parseODataDate(valorApi); break;
                  case 'boolean': dadosExtras[nomeCampo] = Boolean(valorApi); break;
                  default: dadosExtras[nomeCampo] = String(valorApi); break;
                }
              } 
              // Coluna dinâmica real (prefixo dyn_)
              else if (map.campo_destino.startsWith('dyn_')) {
                switch (map.tipo_dado) {
                  case 'number': colunasDinamicas[map.campo_destino] = Number(valorApi); break;
                  case 'date': colunasDinamicas[map.campo_destino] = parseODataDate(valorApi); break;
                  case 'boolean': colunasDinamicas[map.campo_destino] = Boolean(valorApi); break;
                  default: colunasDinamicas[map.campo_destino] = String(valorApi); break;
                }
              } 
              else {
                // Campos fixos da tabela
                switch (map.campo_destino) {
                  case 'numero_nota': numeroNota = String(valorApi); break;
                  case 'numero_cobranca': numeroCobranca = String(valorApi); break;
                  case 'cliente_cnpj': cnpjCliente = String(valorApi); break;
                  case 'data_emissao': dataEmissao = String(valorApi); break;
                  case 'data_vencimento': dataVencimento = String(valorApi); break;
                  case 'valor': valor = Number(valorApi); break;
                  case 'data_desconto': dataDesconto = String(valorApi); break;
                  case 'valor_desconto': valorDesconto = Number(valorApi); break;
                  case 'banco': banco = String(valorApi); break;
                  case 'empresa': empresa = Number(valorApi); break;
                  case 'cliente': cliente = String(valorApi); break;
                }
              }
            }
          }
        }

        // Validar campos obrigatórios MÍNIMOS (apenas numero_nota e numero_cobranca)
        const camposFaltando: string[] = [];
        if (!numeroNota) camposFaltando.push('numero_nota');
        if (!numeroCobranca) camposFaltando.push('numero_cobranca');

        if (camposFaltando.length > 0) {
          registrosComErro.push({
            integracao_id,
            json_original: item,
            tipo_erro: 'validacao',
            mensagem_erro: `Campos obrigatórios faltando: ${camposFaltando.join(', ')}`,
            campo_erro: camposFaltando.join(', '),
            valor_erro: null
          });
          continue;
        }

        // CNPJ é opcional - se vier, tentaremos vincular ao cliente
        const cnpjNormalizado = cnpjCliente ? normalizeCnpj(cnpjCliente) : null;
        let clienteId = cnpjNormalizado ? (cnpjToId.get(cnpjNormalizado) ?? null) : null;

        // Marcar cliente para criação apenas se tiver CNPJ e não existir
        if (cnpjNormalizado && !clienteId && !clientesParaCriar.has(cnpjNormalizado)) {
          clientesParaCriar.set(cnpjNormalizado, {
            cnpj: cnpjCliente,
            razao_social: item?.CustomerName ?? item?.nome_cliente ?? item?.razao_social ?? 
                          item?.BusinessPartnerFullName ?? `Cliente ${cnpjCliente}`,
            endereco: item?.endereco ?? item?.StreetName ?? null,
            cidade: item?.cidade ?? item?.CityName ?? null,
            estado: item?.estado ?? item?.Region ?? null,
            cep: item?.cep ?? item?.PostalCode ?? null,
            email: item?.email ?? item?.EmailAddress ?? null,
            telefone: item?.telefone ?? item?.PhoneNumber ?? null,
            business_partner: item?.BusinessPartner ?? null,
          });
        }

        registrosPreparados.push({
          cnpjNormalizado,
          numeroNota,
          numeroCobranca,
          dataEmissao: parseODataDate(dataEmissao),
          dataVencimento: parseODataDate(dataVencimento),
          valor,
          dataDesconto: parseODataDate(dataDesconto),
          valorDesconto,
          banco,
          empresa,
          cliente,
          dadosExtras: Object.keys(dadosExtras).length > 0 ? dadosExtras : null,
          colunasDinamicas, // Colunas reais criadas dinamicamente
          jsonOriginal: item // Guardar JSON original
        });

      } catch (err: any) {
        erros.push({ tipo: 'preparacao', erro: err.message });
        registrosComErro.push({
          integracao_id,
          json_original: item,
          tipo_erro: 'excecao',
          mensagem_erro: err.message,
          campo_erro: null,
          valor_erro: null
        });
      }
    }

    console.log(`[sync-api-boletos] Registros válidos: ${registrosPreparados.length}, Clientes novos: ${clientesParaCriar.size}`);

    // Criar clientes em batch
    if (clientesParaCriar.size > 0) {
      const clientesArray = Array.from(clientesParaCriar.values());
      const batchesClientes = [];
      
      for (let i = 0; i < clientesArray.length; i += BATCH_SIZE) {
        batchesClientes.push(clientesArray.slice(i, i + BATCH_SIZE));
      }

      for (const batch of batchesClientes) {
        const { data: novosClientes, error: createError } = await supabase
          .from('vv_b_clientes')
          .upsert(batch, { 
            onConflict: 'cnpj',
            ignoreDuplicates: true 
          })
          .select('id, cnpj');

        if (!createError && novosClientes) {
          for (const c of novosClientes) {
            cnpjToId.set(normalizeCnpj(c.cnpj), c.id);
          }
        }
      }

      // Buscar novamente todos os clientes para garantir mapeamento correto
      const { data: todosClientes } = await supabase
        .from('vv_b_clientes')
        .select('id, cnpj')
        .or('deleted.is.null,deleted.eq.""');

      if (todosClientes) {
        for (const c of todosClientes) {
          cnpjToId.set(normalizeCnpj(c.cnpj), c.id);
        }
      }
    }

    // Preparar registros finais com cliente_id
    const registrosParaUpsert: any[] = [];
    const chavesDuplicadas = new Set<string>();

    for (const reg of registrosPreparados) {
      // Tentar buscar cliente_id se tiver CNPJ, mas NÃO é obrigatório
      const clienteId = reg.cnpjNormalizado ? (cnpjToId.get(reg.cnpjNormalizado) ?? null) : null;
      
      // Criar chave única para evitar duplicatas no batch (sem depender de cliente_id)
      const chaveUnica = `${reg.numeroNota}|${reg.numeroCobranca}`;
      
      if (chavesDuplicadas.has(chaveUnica)) {
        registrosComErro.push({
          integracao_id,
          json_original: reg.jsonOriginal,
          tipo_erro: 'duplicado',
          mensagem_erro: `Registro duplicado no mesmo lote: ${chaveUnica}`,
          campo_erro: 'chave_unica',
          valor_erro: chaveUnica
        });
        continue;
      }
      chavesDuplicadas.add(chaveUnica);

      // Construir registro base
      const registroBase: Record<string, any> = {
        integracao_id,
        numero_nota: reg.numeroNota,
        cliente_id: clienteId,
        numero_cobranca: reg.numeroCobranca,
        data_emissao: reg.dataEmissao,
        data_vencimento: reg.dataVencimento,
        valor: reg.valor,
        data_desconto: reg.dataDesconto,
        valor_desconto: reg.valorDesconto,
        banco: reg.banco,
        empresa: reg.empresa,
        cliente: reg.cliente,
        dados_extras: reg.dadosExtras,
        json_original: reg.jsonOriginal,
        sincronizado_em: new Date().toISOString()
      };
      
      // Adicionar colunas dinâmicas (prefixo dyn_)
      if (reg.colunasDinamicas && typeof reg.colunasDinamicas === 'object') {
        for (const [coluna, valor] of Object.entries(reg.colunasDinamicas)) {
          registroBase[coluna] = valor;
        }
      }

      registrosParaUpsert.push(registroBase);
    }

    console.log(`[sync-api-boletos] Registros únicos para upsert: ${registrosParaUpsert.length}`);

    // Processar em batches usando upsert nativo
    const batches = [];
    for (let i = 0; i < registrosParaUpsert.length; i += BATCH_SIZE) {
      batches.push(registrosParaUpsert.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        const { data, error: upsertError } = await supabase
          .from('vv_b_boletos_api')
          .upsert(batch, {
            onConflict: 'numero_nota,numero_cobranca',
            ignoreDuplicates: false
          })
          .select('id');

        if (upsertError) {
          console.error(`[sync-api-boletos] Erro no batch ${i + 1}:`, upsertError.message);
          erros.push({ tipo: 'batch', batch: i + 1, erro: upsertError.message });
        } else {
          registrosAtualizados += data?.length || batch.length;
        }
      } catch (batchErr: any) {
        console.error(`[sync-api-boletos] Exceção no batch ${i + 1}:`, batchErr.message);
        erros.push({ tipo: 'batch_exception', batch: i + 1, erro: batchErr.message });
      }

      // Log de progresso a cada 10 batches
      if ((i + 1) % 10 === 0) {
        console.log(`[sync-api-boletos] Progresso: ${i + 1}/${batches.length} batches processados`);
      }
    }

    // Salvar registros com erro na tabela de erros
    if (registrosComErro.length > 0) {
      console.log(`[sync-api-boletos] Salvando ${registrosComErro.length} registros com erro`);
      
      const batchesErros = [];
      for (let i = 0; i < registrosComErro.length; i += BATCH_SIZE) {
        batchesErros.push(registrosComErro.slice(i, i + BATCH_SIZE));
      }

      for (const batch of batchesErros) {
        const { error: erroInsert } = await supabase
          .from('vv_b_boletos_api_erros')
          .insert(batch);

        if (erroInsert) {
          console.error('[sync-api-boletos] Erro ao salvar registros com erro:', erroInsert.message);
        }
      }
    }

    const duracao = Date.now() - startTime;
    const totalErros = erros.length + registrosComErro.length;
    const status = totalErros === 0 ? 'sucesso' : (registrosAtualizados > 0 ? 'parcial' : 'erro');

    // Registrar log de sincronização
    await supabase.from('vv_b_api_sync_log').insert({
      integracao_id,
      status,
      registros_processados: dadosApi.length,
      registros_novos: registrosNovos,
      registros_atualizados: registrosAtualizados,
      erros: erros.length > 0 ? erros : null,
      duracao_ms: duracao
    });

    // Atualizar última sincronização
    await supabase
      .from('vv_b_api_integracoes')
      .update({ ultima_sincronizacao: new Date().toISOString() })
      .eq('id', integracao_id);

    console.log(`[sync-api-boletos] Concluído. Status: ${status}, Processados: ${registrosAtualizados}, Erros: ${registrosComErro.length}, Duração: ${duracao}ms`);

    return new Response(JSON.stringify({
      success: true,
      status,
      registros_processados: dadosApi.length,
      registros_atualizados: registrosAtualizados,
      registros_com_erro: registrosComErro.length,
      erros: erros.length > 0 ? erros.slice(0, 10) : undefined,
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
