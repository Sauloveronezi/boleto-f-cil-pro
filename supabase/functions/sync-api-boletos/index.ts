import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tamanho do batch para processamento
const BATCH_SIZE = 100;
// Tamanho da página para paginação da API
const API_PAGE_SIZE = 5000;
// Máximo de páginas para evitar loop infinito
const MAX_PAGES = 200;

// Helper: leitura case-insensitive de chaves de um objeto
function getCI(obj: any, key: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const lower = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lower) return obj[k];
  }
  return undefined;
}

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

// Normalizar data para formato YYYY-MM-DD (para chave de dedup)
function normalizeDateForKey(value: any): string {
  if (!value) return '';
  const parsed = parseODataDate(value);
  return parsed || String(value).trim();
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

    // Chamar API com paginação automática
    const urlObj = new URL(integracao.endpoint_base);
    urlObj.searchParams.delete('$filter');
    urlObj.searchParams.delete('filter');
    const userDefinedTop = urlObj.searchParams.get('$top');
    const endpointBase = urlObj.toString();

    const allHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders,
      ...authHeaders,
    };

    // Loop de paginação
    const dadosApi: any[] = [];
    let nextUrl: string | null = endpointBase;
    let pageCount = 0;

    if (!userDefinedTop) {
      const firstUrl = new URL(endpointBase);
      firstUrl.searchParams.set('$top', String(API_PAGE_SIZE));
      firstUrl.searchParams.set('$skip', '0');
      firstUrl.searchParams.set('$inlinecount', 'allpages');
      nextUrl = firstUrl.toString();
    }

    while (nextUrl && pageCount < MAX_PAGES) {
      pageCount++;
      console.log(`[sync-api-boletos] Página ${pageCount}: ${nextUrl}`);

      const apiResponse = await fetch(nextUrl, {
        method: 'GET',
        headers: allHeaders,
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Erro na API (página ${pageCount}): ${apiResponse.status} - ${errorText.substring(0, 200)}`);
      }

      const rawApiResponse = await apiResponse.json();

      const inlineCount = rawApiResponse?.d?.__count || rawApiResponse?.['@odata.count'] || rawApiResponse?.['odata.count'];
      if (inlineCount && pageCount === 1) {
        console.log(`[sync-api-boletos] Total de registros na API (inlinecount): ${inlineCount}`);
      }

      const pageData = extractArrayFromApiResponse(rawApiResponse, integracao.json_path);

      if (Array.isArray(pageData) && pageData.length > 0) {
        dadosApi.push(...pageData);
        console.log(`[sync-api-boletos] Página ${pageCount}: ${pageData.length} registros (total acumulado: ${dadosApi.length}${inlineCount ? ` de ${inlineCount}` : ''})`);
      }

      const odataNext = rawApiResponse?.d?.__next 
        || rawApiResponse?.['odata.nextLink'] 
        || rawApiResponse?.['@odata.nextLink']
        || null;

      if (odataNext) {
        nextUrl = odataNext;
      } else if (!userDefinedTop && Array.isArray(pageData) && pageData.length >= API_PAGE_SIZE) {
        const skipUrl = new URL(endpointBase);
        skipUrl.searchParams.set('$top', String(API_PAGE_SIZE));
        skipUrl.searchParams.set('$skip', String(dadosApi.length));
        nextUrl = skipUrl.toString();
      } else {
        nextUrl = null;
      }
    }

    if (pageCount >= MAX_PAGES) {
      console.warn(`[sync-api-boletos] Limite de ${MAX_PAGES} páginas atingido. Total: ${dadosApi.length} registros.`);
    }

    if (dadosApi.length === 0) {
      throw new Error('Resposta da API não contém lista de dados');
    }

    console.log(`[sync-api-boletos] Total de registros recebidos: ${dadosApi.length} em ${pageCount} página(s)`);

    // Buscar lista de colunas existentes na tabela vv_b_boletos_api (para validação)
    const { data: colunasExistentes } = await supabase.rpc('vv_b_get_table_columns', { p_table_name: 'vv_b_boletos_api' }).catch(() => ({ data: null }));
    // Fallback: usar set hardcoded das colunas conhecidas
    const colunasConhecidas = new Set<string>(colunasExistentes?.map((c: any) => c.column_name) || [
      'id','integracao_id','numero_nota','cliente_id','numero_cobranca','data_emissao','data_vencimento',
      'valor','dados_extras','sincronizado_em','created_at','updated_at','deleted','usuario_delete_id',
      'data_delete','json_original','cliente','valor_desconto','data_desconto','empresa','banco',
      'dyn_conta','dyn_nome_do_cliente','dyn_cidade','dyn_zonatransporte','dyn_desconto1','customer',
      'documento','endereco','bairro','uf','pais','cep','serie','bankcontrolkey',
      'PaytAmountInCoCodeCurrency','PaymentAmountInFunctionalCrcy','FinancialAccountType','PaymentMethod',
      'DocumentReferenceID','BR_NFPartnerFunction','CashDiscountAmtInTransacCrcy','CashDiscountAmtInCoCodeCrcy',
      'CashDiscountAmountInFuncnlCrcy','CashDiscount1Days','CashDiscount2Days','CashDiscount1Percent',
      'PostingDate','PaymentDueDate','paymentrundate','paymentamountinfunctionalcrcy',
      'paytamountincocodecurrency','br_nfenumber','PaymentRunIsProposal','paymentrunisproposal',
      'BankInternalID','BankAccountLongID','PaymentCurrency','PaymentOrigin','taxnumber1',
      'AccountingDocument','billingdocument','companycode','payeeadditionalname','payeeregion',
      'accountingdocumenttype','paymentreference','br_nfnumber','br_nfsubseries',
      'yy1_custtranspzone_sdh','yy1_custtranspzonpais_sdh','br_nfsourcedocumenttype','br_nfpartnercnpj',
      'nosso_numero','cod_barras','valor_com_desconto','doc_contabil','carteira','BR_NFSubSeries',
      'AmountInFunctionalCurrency','amountinfunctionalcurrency','cashdiscount2days',
      'CashDiscount1DueDate','cod_barras_calculado','linha_digitavel_calculada','ID','PaymentDocument'
    ]);

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

    // Buscar bancos e configurações para resolver carteira
    const { data: bancosDb } = await supabase
      .from('vv_b_bancos')
      .select('id, codigo_banco, nome_banco')
      .is('deleted', null);

    const { data: configsBanco } = await supabase
      .from('vv_b_configuracoes_banco')
      .select('*')
      .is('deleted', null);

    const bancoIdPorCodigo = new Map<string, string>();
    for (const b of (bancosDb || [])) {
      bancoIdPorCodigo.set(b.codigo_banco.trim(), b.id);
    }

    const configsPorBancoId = new Map<string, any[]>();
    for (const cfg of (configsBanco || [])) {
      const arr = configsPorBancoId.get(cfg.banco_id) || [];
      arr.push(cfg);
      configsPorBancoId.set(cfg.banco_id, arr);
    }

    function resolverCarteira(codigoBanco: string | undefined | null): string | null {
      if (!codigoBanco) return null;
      const codigoLimpo = String(codigoBanco).trim().padStart(3, '0');
      const bancoId = bancoIdPorCodigo.get(codigoLimpo);
      if (!bancoId) return null;
      const configs = configsPorBancoId.get(bancoId);
      if (!configs || configs.length === 0) return null;
      return configs[0].carteira || null;
    }

    let registrosNovos = 0;
    let registrosAtualizados = 0;
    const erros: any[] = [];
    const clientesParaCriar: Map<string, any> = new Map();
    const registrosComErro: any[] = [];
    const avisosColunas: string[] = []; // avisos de colunas desconhecidas

    // Primeiro passo: preparar todos os dados
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
        
        const dadosExtras: Record<string, any> = {};
        const colunasDinamicas: Record<string, any> = {};

        // Aplicar mapeamentos personalizados
        if (mapeamentos && mapeamentos.length > 0) {
          for (const map of mapeamentos) {
            const valorApi = getValueByPath(item, map.campo_api);
            if (valorApi !== undefined) {
              if (map.campo_destino.startsWith('dados_extras.')) {
                const nomeCampo = map.campo_destino.replace('dados_extras.', '');
                switch (map.tipo_dado) {
                  case 'number': dadosExtras[nomeCampo] = Number(valorApi); break;
                  case 'date': dadosExtras[nomeCampo] = parseODataDate(valorApi); break;
                  case 'boolean': dadosExtras[nomeCampo] = Boolean(valorApi); break;
                  default: dadosExtras[nomeCampo] = String(valorApi); break;
                }
              } 
              else if (map.campo_destino.startsWith('dyn_')) {
                switch (map.tipo_dado) {
                  case 'number': colunasDinamicas[map.campo_destino] = Number(valorApi); break;
                  case 'date': colunasDinamicas[map.campo_destino] = parseODataDate(valorApi); break;
                  case 'boolean': colunasDinamicas[map.campo_destino] = Boolean(valorApi); break;
                  default: colunasDinamicas[map.campo_destino] = String(valorApi); break;
                }
              } 
              else {
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
                  default: {
                    let valorConvertido: any = valorApi;
                    switch (map.tipo_dado) {
                      case 'number':
                        valorConvertido = isNaN(Number(valorApi)) ? null : Number(valorApi);
                        break;
                      case 'date':
                        valorConvertido = parseODataDate(valorApi);
                        break;
                      case 'boolean':
                        valorConvertido = Boolean(valorApi);
                        break;
                      default: {
                        const strVal = String(valorApi);
                        if (strVal.match(/^\/Date\(\d+\)\/?$/)) {
                          valorConvertido = parseODataDate(strVal);
                        } else {
                          valorConvertido = strVal;
                        }
                        break;
                      }
                    }
                    colunasDinamicas[map.campo_destino] = valorConvertido;
                    break;
                  }
                }
              }
            }
          }
        }

        // Validar campos obrigatórios MÍNIMOS
        const camposFaltando: string[] = [];
        if (!numeroNota) camposFaltando.push('numero_nota');
        if (!numeroCobranca) camposFaltando.push('numero_cobranca');

        const ignorarValidacao = integracao.ignorar_validacao === true || integracao.ignorar_validacao === 'true';

        if (camposFaltando.length > 0) {
          if (ignorarValidacao) {
             if (!numeroNota) numeroNota = `MISSING_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
             if (!numeroCobranca) numeroCobranca = `MISSING_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          } else {
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
        }

        const cnpjNormalizado = cnpjCliente ? normalizeCnpj(cnpjCliente) : null;
        let clienteId = cnpjNormalizado ? (cnpjToId.get(cnpjNormalizado) ?? null) : null;

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

        Object.assign(dadosExtras, colunasDinamicas);

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
          colunasDinamicas,
          jsonOriginal: item
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

    // Preparar registros finais com dedup
    const registrosPorChave = new Map<string, any>();
    const registrosDuplicados: { chave: string; numero_nota: string; numero_cobranca: string; documento: string; paymentrundate: string }[] = [];

    for (const reg of registrosPreparados) {
      const clienteId = reg.cnpjNormalizado ? (cnpjToId.get(reg.cnpjNormalizado) ?? null) : null;
      
      // Extrair documento com fallback case-insensitive do item original
      const documentoVal = String(
        reg.colunasDinamicas?.PaymentDocument 
        || reg.colunasDinamicas?.documento 
        || getCI(reg.jsonOriginal, 'PaymentDocument')
        || getCI(reg.jsonOriginal, 'documento')
        || ''
      ).trim();

      // Extrair paymentrundate com fallback case-insensitive
      const paymentrundateRaw = 
        reg.colunasDinamicas?.paymentrundate 
        || getCI(reg.jsonOriginal, 'PaymentRunDate')
        || getCI(reg.jsonOriginal, 'paymentrundate')
        || '';
      const paymentrundateVal = normalizeDateForKey(paymentrundateRaw);

      const chaveUnica = `${String(reg.numeroNota).trim()}|${String(reg.numeroCobranca).trim()}|${documentoVal}|${paymentrundateVal}`;

      // Construir registro base
      const registroBase: Record<string, any> = {
        integracao_id,
        numero_nota: reg.numeroNota,
        cliente_id: clienteId,
        numero_cobranca: reg.numeroCobranca,
        documento: documentoVal || '',
        paymentrundate: paymentrundateVal || '',
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
        sincronizado_em: new Date().toISOString(),
        carteira: resolverCarteira(reg.banco) || resolverCarteira(reg.colunasDinamicas?.BankInternalID) || null,
      };

      // Adicionar colunas dinâmicas - com validação de existência
      const camposReservados = new Set(['cliente_id', 'integracao_id', 'numero_nota', 'numero_cobranca', 'documento', 'paymentrundate', 'id']);
      if (reg.colunasDinamicas && typeof reg.colunasDinamicas === 'object') {
        for (const [coluna, valor] of Object.entries(reg.colunasDinamicas)) {
          if (camposReservados.has(coluna)) continue;
          // Validar se a coluna existe na tabela
          if (colunasConhecidas.has(coluna)) {
            registroBase[coluna] = valor;
          } else {
            // Coluna não existe: salvar em dados_extras ao invés de falhar
            if (!registroBase.dados_extras) registroBase.dados_extras = {};
            registroBase.dados_extras[coluna] = valor;
            if (!avisosColunas.includes(coluna)) {
              avisosColunas.push(coluna);
              console.warn(`[sync-api-boletos] Coluna '${coluna}' não existe na tabela, salvo em dados_extras`);
            }
          }
        }
      }

      // Se já existe, sobrescreve (mantém o último) e registra como duplicado
      if (registrosPorChave.has(chaveUnica)) {
        console.log(`[sync-api-boletos] Deduplicando registro: ${chaveUnica}`);
        registrosDuplicados.push({
          chave: chaveUnica,
          numero_nota: reg.numeroNota,
          numero_cobranca: reg.numeroCobranca,
          documento: documentoVal,
          paymentrundate: paymentrundateVal,
        });
      }
      registrosPorChave.set(chaveUnica, registroBase);
    }

    // Registrar duplicados da API na tabela de erros para auditoria
    if (registrosDuplicados.length > 0) {
      console.log(`[sync-api-boletos] Salvando ${registrosDuplicados.length} duplicados da API na tabela de erros`);
      const errosDuplicados = registrosDuplicados.map(d => ({
        integracao_id,
        json_original: {}, // O JSON original já está no registro que foi mantido
        tipo_erro: 'duplicado_api',
        mensagem_erro: `Registro duplicado na API de origem. Chave: ${d.chave}`,
        campo_erro: 'numero_nota,numero_cobranca,documento,paymentrundate',
        valor_erro: d.chave,
      }));
      
      const { error: erroDupInsert } = await supabase
        .from('vv_b_boletos_api_erros')
        .insert(errosDuplicados);

      if (erroDupInsert) {
        console.error('[sync-api-boletos] Erro ao salvar duplicados:', erroDupInsert.message);
      }
    }

    // Converter Map para array (registros únicos)
    const registrosParaUpsert = Array.from(registrosPorChave.values());

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
            onConflict: 'numero_nota,numero_cobranca,documento,paymentrundate',
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

    console.log(`[sync-api-boletos] Concluído. Status: ${status}, Recebidos: ${dadosApi.length}, Gravados: ${registrosAtualizados}, Duplicados: ${registrosDuplicados.length}, Erros: ${registrosComErro.length}, Duração: ${duracao}ms`);

    return new Response(JSON.stringify({
      success: true,
      status,
      registros_recebidos: dadosApi.length,
      registros_processados: dadosApi.length,
      registros_atualizados: registrosAtualizados,
      registros_com_erro: registrosComErro.length,
      registros_duplicados: registrosDuplicados.length,
      duplicados: registrosDuplicados.length > 0 ? registrosDuplicados : undefined,
      avisos_colunas: avisosColunas.length > 0 ? avisosColunas : undefined,
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
