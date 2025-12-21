import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dados mock para modo demonstração
const MOCK_BOLETOS_API = [
  {
    numero_nota: "000123",
    numero_cobranca: "COB-001",
    cnpj_cliente: "12.345.678/0001-90",
    data_emissao: "2024-11-15",
    data_vencimento: "2024-12-15",
    valor: 15750.50,
    status_sap: "ativo",
    centro_custo: "CC-001",
    empresa_sap: "1000",
    divisao: "DIV-A",
    moeda: "BRL"
  },
  {
    numero_nota: "000124",
    numero_cobranca: "COB-002",
    cnpj_cliente: "12.345.678/0001-90",
    data_emissao: "2024-11-18",
    data_vencimento: "2024-12-18",
    valor: 8320.00,
    status_sap: "ativo",
    centro_custo: "CC-002",
    empresa_sap: "1000",
    divisao: "DIV-A",
    moeda: "BRL"
  },
  {
    numero_nota: "000125",
    numero_cobranca: "COB-003",
    cnpj_cliente: "23.456.789/0001-01",
    data_emissao: "2024-11-10",
    data_vencimento: "2024-12-10",
    valor: 22450.75,
    status_sap: "ativo",
    centro_custo: "CC-001",
    empresa_sap: "1000",
    divisao: "DIV-B",
    moeda: "BRL"
  },
  {
    numero_nota: "000126",
    numero_cobranca: "COB-004",
    cnpj_cliente: "23.456.789/0001-01",
    data_emissao: "2024-10-20",
    data_vencimento: "2024-11-20",
    valor: 5680.00,
    status_sap: "vencido",
    centro_custo: "CC-003",
    empresa_sap: "1000",
    divisao: "DIV-B",
    moeda: "BRL"
  },
  {
    numero_nota: "000127",
    numero_cobranca: "COB-005",
    cnpj_cliente: "34.567.890/0001-12",
    data_emissao: "2024-11-20",
    data_vencimento: "2024-12-20",
    valor: 31200.00,
    status_sap: "ativo",
    centro_custo: "CC-002",
    empresa_sap: "2000",
    divisao: "DIV-A",
    moeda: "BRL"
  },
  {
    numero_nota: "000128",
    numero_cobranca: "COB-006",
    cnpj_cliente: "45.678.901/0001-23",
    data_emissao: "2024-11-22",
    data_vencimento: "2024-12-22",
    valor: 12890.25,
    status_sap: "ativo",
    centro_custo: "CC-001",
    empresa_sap: "2000",
    divisao: "DIV-C",
    moeda: "BRL"
  },
  {
    numero_nota: "000129",
    numero_cobranca: "COB-007",
    cnpj_cliente: "56.789.012/0001-34",
    data_emissao: "2024-11-05",
    data_vencimento: "2024-12-05",
    valor: 7540.00,
    status_sap: "ativo",
    centro_custo: "CC-004",
    empresa_sap: "1000",
    divisao: "DIV-A",
    moeda: "BRL"
  },
  {
    numero_nota: "000130",
    numero_cobranca: "COB-008",
    cnpj_cliente: "67.890.123/0001-45",
    data_emissao: "2024-10-15",
    data_vencimento: "2024-11-15",
    valor: 18900.00,
    status_sap: "liquidado",
    centro_custo: "CC-002",
    empresa_sap: "2000",
    divisao: "DIV-B",
    moeda: "BRL"
  }
];

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

    const { integracao_id, modo_demo = true, endpoint, headers_auth } = await req.json();

    console.log(`[sync-api-boletos] Iniciando sincronização. Modo demo: ${modo_demo}`);

    let dadosApi: any[] = [];
    let erros: any[] = [];

    if (modo_demo) {
      // Usar dados mock
      console.log('[sync-api-boletos] Usando dados mock para demonstração');
      dadosApi = MOCK_BOLETOS_API;
    } else {
      // Chamar API real
      if (!endpoint) {
        throw new Error('Endpoint da API não configurado');
      }

      console.log(`[sync-api-boletos] Chamando API: ${endpoint}`);
      
      const apiResponse = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers_auth
        }
      });

      if (!apiResponse.ok) {
        throw new Error(`Erro na API: ${apiResponse.status} ${apiResponse.statusText}`);
      }

      dadosApi = await apiResponse.json();
      
      if (!Array.isArray(dadosApi)) {
        throw new Error('Resposta da API não é um array JSON');
      }
    }

    // Buscar clientes para mapear CNPJ -> id
    const { data: clientes, error: clientesError } = await supabase
      .from('vv_b_clientes')
      .select('id, cnpj')
      .is('deleted', null);

    if (clientesError) {
      throw new Error(`Erro ao buscar clientes: ${clientesError.message}`);
    }

    const cnpjToId = new Map(clientes?.map(c => [c.cnpj, c.id]) || []);

    let registrosNovos = 0;
    let registrosAtualizados = 0;

    for (const item of dadosApi) {
      try {
        // Buscar cliente pelo CNPJ
        const clienteId = cnpjToId.get(item.cnpj_cliente);
        
        if (!clienteId) {
          console.log(`[sync-api-boletos] Cliente não encontrado para CNPJ: ${item.cnpj_cliente}`);
          erros.push({
            tipo: 'cliente_nao_encontrado',
            cnpj: item.cnpj_cliente,
            numero_nota: item.numero_nota
          });
          continue;
        }

        // Separar campos estruturados dos extras
        const dadosEstruturados = {
          integracao_id,
          numero_nota: item.numero_nota,
          cliente_id: clienteId,
          numero_cobranca: item.numero_cobranca,
          data_emissao: item.data_emissao,
          data_vencimento: item.data_vencimento,
          valor: item.valor,
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
          .eq('numero_nota', item.numero_nota)
          .eq('cliente_id', clienteId)
          .eq('numero_cobranca', item.numero_cobranca)
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
    if (integracao_id) {
      await supabase
        .from('vv_b_api_integracoes')
        .update({ ultima_sincronizacao: new Date().toISOString() })
        .eq('id', integracao_id);
    }

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
