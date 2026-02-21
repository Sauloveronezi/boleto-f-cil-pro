export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      canhotos: {
        Row: {
          canhoto: boolean | null
          cnpj: string | null
          created_at: string
          data: string | null
          data_emissaoFerramenta: string | null
          data_emissaoOpenAI: string | null
          data_entrega: string | null
          DELETE: string | null
          download: string | null
          hora_mensagem: string | null
          id: number
          id_vv_imagens: number | null
          idmessage: string | null
          message: string | null
          messageSecret: string | null
          messageType: string | null
          mimetype: string | null
          nome_arquivo: string | null
          notafiscal: string | null
          observacoes: string | null
          origem: string | null
          plush_name: string | null
          resp_agent: string | null
          resp_ia: string | null
          SequenciaCanhoto: string | null
          serie: string | null
          telefone: string | null
          "url arquivo": string | null
          valor: string | null
          valorinformado: string | null
        }
        Insert: {
          canhoto?: boolean | null
          cnpj?: string | null
          created_at?: string
          data?: string | null
          data_emissaoFerramenta?: string | null
          data_emissaoOpenAI?: string | null
          data_entrega?: string | null
          DELETE?: string | null
          download?: string | null
          hora_mensagem?: string | null
          id?: number
          id_vv_imagens?: number | null
          idmessage?: string | null
          message?: string | null
          messageSecret?: string | null
          messageType?: string | null
          mimetype?: string | null
          nome_arquivo?: string | null
          notafiscal?: string | null
          observacoes?: string | null
          origem?: string | null
          plush_name?: string | null
          resp_agent?: string | null
          resp_ia?: string | null
          SequenciaCanhoto?: string | null
          serie?: string | null
          telefone?: string | null
          "url arquivo"?: string | null
          valor?: string | null
          valorinformado?: string | null
        }
        Update: {
          canhoto?: boolean | null
          cnpj?: string | null
          created_at?: string
          data?: string | null
          data_emissaoFerramenta?: string | null
          data_emissaoOpenAI?: string | null
          data_entrega?: string | null
          DELETE?: string | null
          download?: string | null
          hora_mensagem?: string | null
          id?: number
          id_vv_imagens?: number | null
          idmessage?: string | null
          message?: string | null
          messageSecret?: string | null
          messageType?: string | null
          mimetype?: string | null
          nome_arquivo?: string | null
          notafiscal?: string | null
          observacoes?: string | null
          origem?: string | null
          plush_name?: string | null
          resp_agent?: string | null
          resp_ia?: string | null
          SequenciaCanhoto?: string | null
          serie?: string | null
          telefone?: string | null
          "url arquivo"?: string | null
          valor?: string | null
          valorinformado?: string | null
        }
        Relationships: []
      }
      Contato: {
        Row: {
          created_at: string
          Email: string | null
          Empresa: string | null
          id: number
          Mensagem: string | null
          NomeCompleto: string | null
          Telefone: string | null
        }
        Insert: {
          created_at?: string
          Email?: string | null
          Empresa?: string | null
          id?: number
          Mensagem?: string | null
          NomeCompleto?: string | null
          Telefone?: string | null
        }
        Update: {
          created_at?: string
          Email?: string | null
          Empresa?: string | null
          id?: number
          Mensagem?: string | null
          NomeCompleto?: string | null
          Telefone?: string | null
        }
        Relationships: []
      }
      desenhos_ederer: {
        Row: {
          aprovado_por: string | null
          codigo_desenho: string | null
          conferido_por: string | null
          cota: string | null
          cotas_lidas: string | null
          cotas_totais: string | null
          created_at: string
          data_desenho: string | null
          dataaprovado: string | null
          dataconferido: string | null
          datarevisao: string | null
          desenhado_por: string | null
          escala: string | null
          folha: string | null
          formato: string | null
          id: number
          item: string | null
          material: string | null
          max: string | null
          min: string | null
          notas: string | null
          numero_revisao: string | null
          peca: string | null
          titulo: string | null
          tolerancia_naoindicada: Json | null
          unidade: string | null
        }
        Insert: {
          aprovado_por?: string | null
          codigo_desenho?: string | null
          conferido_por?: string | null
          cota?: string | null
          cotas_lidas?: string | null
          cotas_totais?: string | null
          created_at?: string
          data_desenho?: string | null
          dataaprovado?: string | null
          dataconferido?: string | null
          datarevisao?: string | null
          desenhado_por?: string | null
          escala?: string | null
          folha?: string | null
          formato?: string | null
          id?: number
          item?: string | null
          material?: string | null
          max?: string | null
          min?: string | null
          notas?: string | null
          numero_revisao?: string | null
          peca?: string | null
          titulo?: string | null
          tolerancia_naoindicada?: Json | null
          unidade?: string | null
        }
        Update: {
          aprovado_por?: string | null
          codigo_desenho?: string | null
          conferido_por?: string | null
          cota?: string | null
          cotas_lidas?: string | null
          cotas_totais?: string | null
          created_at?: string
          data_desenho?: string | null
          dataaprovado?: string | null
          dataconferido?: string | null
          datarevisao?: string | null
          desenhado_por?: string | null
          escala?: string | null
          folha?: string | null
          formato?: string | null
          id?: number
          item?: string | null
          material?: string | null
          max?: string | null
          min?: string | null
          notas?: string | null
          numero_revisao?: string | null
          peca?: string | null
          titulo?: string | null
          tolerancia_naoindicada?: Json | null
          unidade?: string | null
        }
        Relationships: []
      }
      DespesasEderer: {
        Row: {
          cidade: string | null
          created_at: string
          data: string | null
          descricao: string | null
          documento: string | null
          id: number
          local: string | null
          observacao: string | null
          quantidade: string | null
          telefone: string | null
          uf: string | null
          valor: number | null
          valordocumento: string | null
        }
        Insert: {
          cidade?: string | null
          created_at: string
          data?: string | null
          descricao?: string | null
          documento?: string | null
          id?: number
          local?: string | null
          observacao?: string | null
          quantidade?: string | null
          telefone?: string | null
          uf?: string | null
          valor?: number | null
          valordocumento?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          data?: string | null
          descricao?: string | null
          documento?: string | null
          id?: number
          local?: string | null
          observacao?: string | null
          quantidade?: string | null
          telefone?: string | null
          uf?: string | null
          valor?: number | null
          valordocumento?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      Ederer: {
        Row: {
          anterior: number | null
          apikey: string | null
          atual: number | null
          base64: string | null
          contato: string | null
          created_at: string
          Data: string | null
          groupId: string | null
          id: number
          idkey: string | null
          intervalo: number | null
          mensagem: string | null
          messageType: string | null
          numero: string | null
          participant: string | null
          pushName: string | null
          remoteJid: string | null
          respostaIA3: string | null
          tipomensage: string | null
          url: string | null
        }
        Insert: {
          anterior?: number | null
          apikey?: string | null
          atual?: number | null
          base64?: string | null
          contato?: string | null
          created_at?: string
          Data?: string | null
          groupId?: string | null
          id?: number
          idkey?: string | null
          intervalo?: number | null
          mensagem?: string | null
          messageType?: string | null
          numero?: string | null
          participant?: string | null
          pushName?: string | null
          remoteJid?: string | null
          respostaIA3?: string | null
          tipomensage?: string | null
          url?: string | null
        }
        Update: {
          anterior?: number | null
          apikey?: string | null
          atual?: number | null
          base64?: string | null
          contato?: string | null
          created_at?: string
          Data?: string | null
          groupId?: string | null
          id?: number
          idkey?: string | null
          intervalo?: number | null
          mensagem?: string | null
          messageType?: string | null
          numero?: string | null
          participant?: string | null
          pushName?: string | null
          remoteJid?: string | null
          respostaIA3?: string | null
          tipomensage?: string | null
          url?: string | null
        }
        Relationships: []
      }
      geral: {
        Row: {
          curso: string
          id: number
        }
        Insert: {
          curso?: string
          id?: number
        }
        Update: {
          curso?: string
          id?: number
        }
        Relationships: []
      }
      Ideia: {
        Row: {
          after: string | null
          after_data: string | null
          before: string | null
          before_data: string | null
          created_at: string
          field: string | null
          id: number
          id_clickfolder: string | null
          json: Json | null
          json2: Json | null
          old_time_estimate_string: string | null
          task_id: string | null
          time_estimate_string: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          after?: string | null
          after_data?: string | null
          before?: string | null
          before_data?: string | null
          created_at: string
          field?: string | null
          id?: number
          id_clickfolder?: string | null
          json?: Json | null
          json2?: Json | null
          old_time_estimate_string?: string | null
          task_id?: string | null
          time_estimate_string?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          after?: string | null
          after_data?: string | null
          before?: string | null
          before_data?: string | null
          created_at?: string
          field?: string | null
          id?: number
          id_clickfolder?: string | null
          json?: Json | null
          json2?: Json | null
          old_time_estimate_string?: string | null
          task_id?: string | null
          time_estimate_string?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      Ideia_Geral: {
        Row: {
          created_at: string
          id: number
          json: Json | null
        }
        Insert: {
          created_at?: string
          id?: number
          json?: Json | null
        }
        Update: {
          created_at?: string
          id?: number
          json?: Json | null
        }
        Relationships: []
      }
      log_whatsapp: {
        Row: {
          created_at: string
          id: number
          json: Json | null
        }
        Insert: {
          created_at?: string
          id?: number
          json?: Json | null
        }
        Update: {
          created_at?: string
          id?: number
          json?: Json | null
        }
        Relationships: []
      }
      n8n: {
        Row: {
          created_at: string
          curso: string | null
          id: number
        }
        Insert: {
          created_at?: string
          curso?: string | null
          id?: number
        }
        Update: {
          created_at?: string
          curso?: string | null
          id?: number
        }
        Relationships: []
      }
      rl_admins: {
        Row: {
          created_at: string
          display_name: string | null
          id: number
          phone: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: number
          phone: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: number
          phone?: string
        }
        Relationships: []
      }
      rl_email_verification_codes: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      rl_participants: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string
        }
        Relationships: []
      }
      rl_raffle_draws: {
        Row: {
          created_at: string
          created_by_phone: string | null
          drawn_at: string
          id: string
          notes: string | null
          raffle_id: string
          winning_number: number
        }
        Insert: {
          created_at?: string
          created_by_phone?: string | null
          drawn_at?: string
          id?: string
          notes?: string | null
          raffle_id: string
          winning_number: number
        }
        Update: {
          created_at?: string
          created_by_phone?: string | null
          drawn_at?: string
          id?: string
          notes?: string | null
          raffle_id?: string
          winning_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "rl_raffle_draws_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "rl_raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      rl_raffles: {
        Row: {
          active: boolean
          created_at: string
          currency: string | null
          description: string | null
          ends_at: string | null
          id: string
          max_number: number
          name: string
          price_cents: number | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          max_number?: number
          name: string
          price_cents?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          max_number?: number
          name?: string
          price_cents?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rl_tickets: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          number: number
          participant_id: string | null
          raffle_id: string
          reserved_at: string | null
          status: Database["public"]["Enums"]["rl_ticket_status"]
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          number: number
          participant_id?: string | null
          raffle_id: string
          reserved_at?: string | null
          status?: Database["public"]["Enums"]["rl_ticket_status"]
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          number?: number
          participant_id?: string | null
          raffle_id?: string
          reserved_at?: string | null
          status?: Database["public"]["Enums"]["rl_ticket_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rl_tickets_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "rl_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rl_tickets_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "rl_raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      rl_verification_codes: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      rl_webhook_logs: {
        Row: {
          created_at: string
          error: string | null
          event: string | null
          id: number
          payload: Json | null
          response_status: number | null
          url: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event?: string | null
          id?: number
          payload?: Json | null
          response_status?: number | null
          url: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event?: string | null
          id?: number
          payload?: Json | null
          response_status?: number | null
          url?: string
        }
        Relationships: []
      }
      TabelaFrete: {
        Row: {
          cd_Estado: string | null
          ds_Cidade: string | null
          ds_ControleAlteracao: string | null
          ds_ControleInclusao: string | null
          ds_Grupo: string | null
          ds_NomeTarifa: string | null
          ds_TabelaPreco: string | null
          dt_ControleRegistro: string | null
          ID: number
          id_Cidade: number | null
          id_TabelaPrecoTarifa: number | null
          id_TabelaPrecoTarifa_1: number | null
          id_TabelaPrecoTrecho: number | null
          id_TarifaExtra: string | null
          kg_FracaoEntregaCritica: string | null
          kg_FracaoPedagio: string | null
          kg_MaximoColeta: string | null
          kg_MaximoEntrega: string | null
          kg_MaximoSECCAT: string | null
          pc_Administrativo: string | null
          pc_ADValorem: string | null
          pc_EntregaCritica: string | null
          pc_FreteValor: string | null
          pc_GRIS: string | null
          pc_Suframa: string | null
          pc_TRF: string | null
          pc_TRT: string | null
          qt_PrazoEntrega: string | null
          RegiaoTabela: string | null
          tp_ImpostoIncluso: string | null
          tp_Origem: string | null
          tp_RegiaoTabelaPreco: string | null
          Transportadora: string | null
          vl_Calculo: string | null
          vl_Coleta: string | null
          vl_Despacho: string | null
          vl_Emergencia: string | null
          vl_Entrega: string | null
          vl_EntregaCritica: string | null
          vl_Excedente: string | null
          vl_FaixaExcedente: string | null
          vl_FaixaFinal: string | null
          vl_FaixaInicial: string | null
          vl_FracaoEntregaCritica: string | null
          vl_ITR: string | null
          vl_KM: string | null
          vl_MaximoEntregaCritica: string | null
          vl_MinimoADValorem: string | null
          vl_MinimoEntregaCritica: string | null
          vl_MinimoFretePeso: string | null
          vl_MinimoGRIS: string | null
          vl_MinimoSuframa: string | null
          vl_MinimoTotalFrete: string | null
          vl_MinimoTRF: string | null
          vl_MinimoTRT: string | null
          vl_Pedagio: string | null
          vl_PedagioFracionado: string | null
          vl_Quilo: string | null
          vl_SECCAT: string | null
          vl_Suframa: string | null
          vl_SuframaNF: string | null
          vl_TaxasDiversas: string | null
          vl_TRT: string | null
          vl_Volume: string | null
        }
        Insert: {
          cd_Estado?: string | null
          ds_Cidade?: string | null
          ds_ControleAlteracao?: string | null
          ds_ControleInclusao?: string | null
          ds_Grupo?: string | null
          ds_NomeTarifa?: string | null
          ds_TabelaPreco?: string | null
          dt_ControleRegistro?: string | null
          ID: number
          id_Cidade?: number | null
          id_TabelaPrecoTarifa?: number | null
          id_TabelaPrecoTarifa_1?: number | null
          id_TabelaPrecoTrecho?: number | null
          id_TarifaExtra?: string | null
          kg_FracaoEntregaCritica?: string | null
          kg_FracaoPedagio?: string | null
          kg_MaximoColeta?: string | null
          kg_MaximoEntrega?: string | null
          kg_MaximoSECCAT?: string | null
          pc_Administrativo?: string | null
          pc_ADValorem?: string | null
          pc_EntregaCritica?: string | null
          pc_FreteValor?: string | null
          pc_GRIS?: string | null
          pc_Suframa?: string | null
          pc_TRF?: string | null
          pc_TRT?: string | null
          qt_PrazoEntrega?: string | null
          RegiaoTabela?: string | null
          tp_ImpostoIncluso?: string | null
          tp_Origem?: string | null
          tp_RegiaoTabelaPreco?: string | null
          Transportadora?: string | null
          vl_Calculo?: string | null
          vl_Coleta?: string | null
          vl_Despacho?: string | null
          vl_Emergencia?: string | null
          vl_Entrega?: string | null
          vl_EntregaCritica?: string | null
          vl_Excedente?: string | null
          vl_FaixaExcedente?: string | null
          vl_FaixaFinal?: string | null
          vl_FaixaInicial?: string | null
          vl_FracaoEntregaCritica?: string | null
          vl_ITR?: string | null
          vl_KM?: string | null
          vl_MaximoEntregaCritica?: string | null
          vl_MinimoADValorem?: string | null
          vl_MinimoEntregaCritica?: string | null
          vl_MinimoFretePeso?: string | null
          vl_MinimoGRIS?: string | null
          vl_MinimoSuframa?: string | null
          vl_MinimoTotalFrete?: string | null
          vl_MinimoTRF?: string | null
          vl_MinimoTRT?: string | null
          vl_Pedagio?: string | null
          vl_PedagioFracionado?: string | null
          vl_Quilo?: string | null
          vl_SECCAT?: string | null
          vl_Suframa?: string | null
          vl_SuframaNF?: string | null
          vl_TaxasDiversas?: string | null
          vl_TRT?: string | null
          vl_Volume?: string | null
        }
        Update: {
          cd_Estado?: string | null
          ds_Cidade?: string | null
          ds_ControleAlteracao?: string | null
          ds_ControleInclusao?: string | null
          ds_Grupo?: string | null
          ds_NomeTarifa?: string | null
          ds_TabelaPreco?: string | null
          dt_ControleRegistro?: string | null
          ID?: number
          id_Cidade?: number | null
          id_TabelaPrecoTarifa?: number | null
          id_TabelaPrecoTarifa_1?: number | null
          id_TabelaPrecoTrecho?: number | null
          id_TarifaExtra?: string | null
          kg_FracaoEntregaCritica?: string | null
          kg_FracaoPedagio?: string | null
          kg_MaximoColeta?: string | null
          kg_MaximoEntrega?: string | null
          kg_MaximoSECCAT?: string | null
          pc_Administrativo?: string | null
          pc_ADValorem?: string | null
          pc_EntregaCritica?: string | null
          pc_FreteValor?: string | null
          pc_GRIS?: string | null
          pc_Suframa?: string | null
          pc_TRF?: string | null
          pc_TRT?: string | null
          qt_PrazoEntrega?: string | null
          RegiaoTabela?: string | null
          tp_ImpostoIncluso?: string | null
          tp_Origem?: string | null
          tp_RegiaoTabelaPreco?: string | null
          Transportadora?: string | null
          vl_Calculo?: string | null
          vl_Coleta?: string | null
          vl_Despacho?: string | null
          vl_Emergencia?: string | null
          vl_Entrega?: string | null
          vl_EntregaCritica?: string | null
          vl_Excedente?: string | null
          vl_FaixaExcedente?: string | null
          vl_FaixaFinal?: string | null
          vl_FaixaInicial?: string | null
          vl_FracaoEntregaCritica?: string | null
          vl_ITR?: string | null
          vl_KM?: string | null
          vl_MaximoEntregaCritica?: string | null
          vl_MinimoADValorem?: string | null
          vl_MinimoEntregaCritica?: string | null
          vl_MinimoFretePeso?: string | null
          vl_MinimoGRIS?: string | null
          vl_MinimoSuframa?: string | null
          vl_MinimoTotalFrete?: string | null
          vl_MinimoTRF?: string | null
          vl_MinimoTRT?: string | null
          vl_Pedagio?: string | null
          vl_PedagioFracionado?: string | null
          vl_Quilo?: string | null
          vl_SECCAT?: string | null
          vl_Suframa?: string | null
          vl_SuframaNF?: string | null
          vl_TaxasDiversas?: string | null
          vl_TRT?: string | null
          vl_Volume?: string | null
        }
        Relationships: []
      }
      Testes: {
        Row: {
          created_at: string
          data: string | null
          data_teste: string | null
          hora: string | null
          id: number
          mensagem: string | null
          nome_arquivo: string | null
          numero_documento: string | null
          observacoes: string | null
          resultado_teste: string | null
          rotina: string | null
          tipo_documento: string | null
          tipo_teste: string | null
          usuario: string | null
        }
        Insert: {
          created_at?: string
          data?: string | null
          data_teste?: string | null
          hora?: string | null
          id?: number
          mensagem?: string | null
          nome_arquivo?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          resultado_teste?: string | null
          rotina?: string | null
          tipo_documento?: string | null
          tipo_teste?: string | null
          usuario?: string | null
        }
        Update: {
          created_at?: string
          data?: string | null
          data_teste?: string | null
          hora?: string | null
          id?: number
          mensagem?: string | null
          nome_arquivo?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          resultado_teste?: string | null
          rotina?: string | null
          tipo_documento?: string | null
          tipo_teste?: string | null
          usuario?: string | null
        }
        Relationships: []
      }
      Trechos: {
        Row: {
          CodMunFim: number | null
          CodMunIni: number | null
          contagemCTE: number | null
          ContagemNF: number | null
          ds_pessoa: string | null
          ID: number
          id_Transportadora: number | null
          id_Transportadora2: number | null
          MunFim: string | null
          MunIni: string | null
          trecho: string | null
          Trecho2: string | null
          UFFim: string | null
          UFIni: string | null
        }
        Insert: {
          CodMunFim?: number | null
          CodMunIni?: number | null
          contagemCTE?: number | null
          ContagemNF?: number | null
          ds_pessoa?: string | null
          ID: number
          id_Transportadora?: number | null
          id_Transportadora2?: number | null
          MunFim?: string | null
          MunIni?: string | null
          trecho?: string | null
          Trecho2?: string | null
          UFFim?: string | null
          UFIni?: string | null
        }
        Update: {
          CodMunFim?: number | null
          CodMunIni?: number | null
          contagemCTE?: number | null
          ContagemNF?: number | null
          ds_pessoa?: string | null
          ID?: number
          id_Transportadora?: number | null
          id_Transportadora2?: number | null
          MunFim?: string | null
          MunIni?: string | null
          trecho?: string | null
          Trecho2?: string | null
          UFFim?: string | null
          UFIni?: string | null
        }
        Relationships: []
      }
      vv_b_api_integracoes: {
        Row: {
          ativo: boolean | null
          auth_api_key_encrypted: string | null
          auth_header_name: string | null
          auth_senha_encrypted: string | null
          auth_token_encrypted: string | null
          auth_usuario: string | null
          campos_api_detectados: Json | null
          campos_chave: string[] | null
          created_at: string
          data_delete: string | null
          deleted: string | null
          endpoint_base: string | null
          headers_autenticacao: Json | null
          id: string
          json_path: string | null
          modelo_boleto_id: string | null
          modo_demo: boolean | null
          nome: string
          tipo: string
          tipo_autenticacao: string | null
          ultima_sincronizacao: string | null
          updated_at: string
          usuario_delete_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          auth_api_key_encrypted?: string | null
          auth_header_name?: string | null
          auth_senha_encrypted?: string | null
          auth_token_encrypted?: string | null
          auth_usuario?: string | null
          campos_api_detectados?: Json | null
          campos_chave?: string[] | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          endpoint_base?: string | null
          headers_autenticacao?: Json | null
          id?: string
          json_path?: string | null
          modelo_boleto_id?: string | null
          modo_demo?: boolean | null
          nome: string
          tipo?: string
          tipo_autenticacao?: string | null
          ultima_sincronizacao?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          auth_api_key_encrypted?: string | null
          auth_header_name?: string | null
          auth_senha_encrypted?: string | null
          auth_token_encrypted?: string | null
          auth_usuario?: string | null
          campos_api_detectados?: Json | null
          campos_chave?: string[] | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          endpoint_base?: string | null
          headers_autenticacao?: Json | null
          id?: string
          json_path?: string | null
          modelo_boleto_id?: string | null
          modo_demo?: boolean | null
          nome?: string
          tipo?: string
          tipo_autenticacao?: string | null
          ultima_sincronizacao?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_api_integracoes_modelo_boleto_id_fkey"
            columns: ["modelo_boleto_id"]
            isOneToOne: false
            referencedRelation: "vv_b_modelos_boleto"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_api_mapeamento_campos: {
        Row: {
          campo_api: string
          campo_destino: string
          created_at: string
          data_delete: string | null
          deleted: string | null
          id: string
          integracao_id: string | null
          obrigatorio: boolean | null
          ordem: number | null
          tipo_dado: string | null
          transformacao: string | null
          updated_at: string
          usuario_delete_id: string | null
          valor_padrao: string | null
        }
        Insert: {
          campo_api: string
          campo_destino: string
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          id?: string
          integracao_id?: string | null
          obrigatorio?: boolean | null
          ordem?: number | null
          tipo_dado?: string | null
          transformacao?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
          valor_padrao?: string | null
        }
        Update: {
          campo_api?: string
          campo_destino?: string
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          id?: string
          integracao_id?: string | null
          obrigatorio?: boolean | null
          ordem?: number | null
          tipo_dado?: string | null
          transformacao?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
          valor_padrao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_api_mapeamento_campos_integracao_id_fkey"
            columns: ["integracao_id"]
            isOneToOne: false
            referencedRelation: "vv_b_api_integracoes"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_api_sync_log: {
        Row: {
          created_at: string
          duracao_ms: number | null
          erros: Json | null
          id: string
          integracao_id: string | null
          registros_atualizados: number | null
          registros_novos: number | null
          registros_processados: number | null
          status: string
        }
        Insert: {
          created_at?: string
          duracao_ms?: number | null
          erros?: Json | null
          id?: string
          integracao_id?: string | null
          registros_atualizados?: number | null
          registros_novos?: number | null
          registros_processados?: number | null
          status: string
        }
        Update: {
          created_at?: string
          duracao_ms?: number | null
          erros?: Json | null
          id?: string
          integracao_id?: string | null
          registros_atualizados?: number | null
          registros_novos?: number | null
          registros_processados?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_api_sync_log_integracao_id_fkey"
            columns: ["integracao_id"]
            isOneToOne: false
            referencedRelation: "vv_b_api_integracoes"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_arquivos_cnab_lidos: {
        Row: {
          banco_id: string | null
          configuracao_cnab_id: string | null
          conteudo_original: string
          created_at: string | null
          dados_parseados: Json
          data_delete: string | null
          data_processamento: string | null
          deleted: string | null
          id: string
          nome_arquivo: string
          status: string | null
          tipo_arquivo: string
          tipo_cnab: string
          total_registros: number | null
          updated_at: string | null
          usuario_delete_id: string | null
          usuario_id: string | null
          valor_total: number | null
        }
        Insert: {
          banco_id?: string | null
          configuracao_cnab_id?: string | null
          conteudo_original: string
          created_at?: string | null
          dados_parseados?: Json
          data_delete?: string | null
          data_processamento?: string | null
          deleted?: string | null
          id?: string
          nome_arquivo: string
          status?: string | null
          tipo_arquivo: string
          tipo_cnab: string
          total_registros?: number | null
          updated_at?: string | null
          usuario_delete_id?: string | null
          usuario_id?: string | null
          valor_total?: number | null
        }
        Update: {
          banco_id?: string | null
          configuracao_cnab_id?: string | null
          conteudo_original?: string
          created_at?: string | null
          dados_parseados?: Json
          data_delete?: string | null
          data_processamento?: string | null
          deleted?: string | null
          id?: string
          nome_arquivo?: string
          status?: string | null
          tipo_arquivo?: string
          tipo_cnab?: string
          total_registros?: number | null
          updated_at?: string | null
          usuario_delete_id?: string | null
          usuario_id?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_arquivos_cnab_lidos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "vv_b_bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vv_b_arquivos_cnab_lidos_configuracao_cnab_id_fkey"
            columns: ["configuracao_cnab_id"]
            isOneToOne: false
            referencedRelation: "vv_b_configuracoes_cnab"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_bancos: {
        Row: {
          ativo: boolean | null
          codigo_banco: string
          created_at: string
          data_delete: string | null
          deleted: string | null
          id: string
          logo_url: string | null
          nome_banco: string
          tipo_layout_padrao: string | null
          updated_at: string
          usuario_delete_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo_banco: string
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          id?: string
          logo_url?: string | null
          nome_banco: string
          tipo_layout_padrao?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo_banco?: string
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          id?: string
          logo_url?: string | null
          nome_banco?: string
          tipo_layout_padrao?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Relationships: []
      }
      vv_b_boleto_template_fields: {
        Row: {
          align: string | null
          bbox: Json
          bg_color: string | null
          bold: boolean | null
          color: string | null
          created_at: string | null
          data_delete: string | null
          deleted: string | null
          display_order: number | null
          font_family: string | null
          font_size: number | null
          format: string | null
          id: string
          is_barcode: boolean | null
          is_digitable_line: boolean | null
          key: string
          label: string | null
          page: number | null
          source_ref: string | null
          template_id: string
          updated_at: string | null
          usuario_delete_id: string | null
          visible: boolean | null
        }
        Insert: {
          align?: string | null
          bbox: Json
          bg_color?: string | null
          bold?: boolean | null
          color?: string | null
          created_at?: string | null
          data_delete?: string | null
          deleted?: string | null
          display_order?: number | null
          font_family?: string | null
          font_size?: number | null
          format?: string | null
          id?: string
          is_barcode?: boolean | null
          is_digitable_line?: boolean | null
          key: string
          label?: string | null
          page?: number | null
          source_ref?: string | null
          template_id: string
          updated_at?: string | null
          usuario_delete_id?: string | null
          visible?: boolean | null
        }
        Update: {
          align?: string | null
          bbox?: Json
          bg_color?: string | null
          bold?: boolean | null
          color?: string | null
          created_at?: string | null
          data_delete?: string | null
          deleted?: string | null
          display_order?: number | null
          font_family?: string | null
          font_size?: number | null
          format?: string | null
          id?: string
          is_barcode?: boolean | null
          is_digitable_line?: boolean | null
          key?: string
          label?: string | null
          page?: number | null
          source_ref?: string | null
          template_id?: string
          updated_at?: string | null
          usuario_delete_id?: string | null
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_boleto_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "vv_b_boleto_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_boleto_templates: {
        Row: {
          background_pdf_url: string
          bank_code: string | null
          created_at: string | null
          data_delete: string | null
          deleted: string | null
          id: string
          is_default: boolean | null
          layout_version: string | null
          name: string
          page_height: number
          page_width: number
          requires_calculation: boolean | null
          updated_at: string | null
          usuario_delete_id: string | null
        }
        Insert: {
          background_pdf_url: string
          bank_code?: string | null
          created_at?: string | null
          data_delete?: string | null
          deleted?: string | null
          id?: string
          is_default?: boolean | null
          layout_version?: string | null
          name: string
          page_height?: number
          page_width?: number
          requires_calculation?: boolean | null
          updated_at?: string | null
          usuario_delete_id?: string | null
        }
        Update: {
          background_pdf_url?: string
          bank_code?: string | null
          created_at?: string | null
          data_delete?: string | null
          deleted?: string | null
          id?: string
          is_default?: boolean | null
          layout_version?: string | null
          name?: string
          page_height?: number
          page_width?: number
          requires_calculation?: boolean | null
          updated_at?: string | null
          usuario_delete_id?: string | null
        }
        Relationships: []
      }
      vv_b_boletos_api: {
        Row: {
          accountingdocument: string | null
          AccountingDocument: string | null
          accountingdocumenttype: string | null
          bairro: string | null
          banco: string | null
          bankaccountlongid: string | null
          BankAccountLongID: string | null
          bankcontrolkey: string | null
          bankinternalid: string | null
          BankInternalID: string | null
          billingdocument: string | null
          br_nfenumber: string | null
          br_nfnumber: string | null
          br_nfpartnercnpj: string | null
          BR_NFPartnerFunction: string | null
          br_nfsourcedocumenttype: string | null
          br_nfsubseries: string | null
          CashDiscount1Days: string | null
          CashDiscount1Percent: string | null
          CashDiscount2Days: string | null
          cashdiscountamountinfuncnlcrcy: string | null
          CashDiscountAmountInFuncnlCrcy: string | null
          cashdiscountamtincocodecrcy: string | null
          CashDiscountAmtInCoCodeCrcy: string | null
          cashdiscountamtintransaccrcy: string | null
          CashDiscountAmtInTransacCrcy: string | null
          cep: string | null
          cliente: string | null
          cliente_id: string | null
          cod_barras: number | null
          companycode: number | null
          created_at: string
          customer: string | null
          dados_extras: Json | null
          data_delete: string | null
          data_desconto: string | null
          data_emissao: string | null
          data_vencimento: string | null
          deleted: string | null
          doc_contabil: string | null
          documento: string | null
          DocumentReferenceID: string | null
          dyn_cidade: string | null
          dyn_conta: number | null
          dyn_desconto1: string | null
          dyn_nome_do_cliente: string | null
          dyn_zonatransporte: string | null
          empresa: number | null
          endereco: string | null
          FinancialAccountType: string | null
          id: string
          integracao_id: string | null
          json_original: Json | null
          nosso_numero: string | null
          numero_cobranca: string
          numero_nota: string
          pais: string | null
          payeeadditionalname: string | null
          payeeregion: string | null
          paymentamountinfunctionalcrcy: string | null
          PaymentAmountInFunctionalCrcy: string | null
          paymentcurrency: string | null
          PaymentCurrency: string | null
          PaymentDueDate: string | null
          PaymentMethod: string | null
          paymentorigin: string | null
          PaymentOrigin: string | null
          paymentreference: string | null
          paymentrundate: string | null
          paymentrunisproposal: string | null
          PaymentRunIsProposal: string | null
          paytamountincocodecurrency: string | null
          PaytAmountInCoCodeCurrency: string | null
          PostingDate: string | null
          serie: string | null
          sincronizado_em: string | null
          taxnumber1: string | null
          TaxNumber1: string | null
          uf: string | null
          updated_at: string
          usuario_delete_id: string | null
          valor: number | null
          valor_com_desconto: number | null
          valor_desconto: number | null
          yy1_custtranspzone_sdh: string | null
          yy1_custtranspzonpais_sdh: string | null
        }
        Insert: {
          accountingdocument?: string | null
          AccountingDocument?: string | null
          accountingdocumenttype?: string | null
          bairro?: string | null
          banco?: string | null
          bankaccountlongid?: string | null
          BankAccountLongID?: string | null
          bankcontrolkey?: string | null
          bankinternalid?: string | null
          BankInternalID?: string | null
          billingdocument?: string | null
          br_nfenumber?: string | null
          br_nfnumber?: string | null
          br_nfpartnercnpj?: string | null
          BR_NFPartnerFunction?: string | null
          br_nfsourcedocumenttype?: string | null
          br_nfsubseries?: string | null
          CashDiscount1Days?: string | null
          CashDiscount1Percent?: string | null
          CashDiscount2Days?: string | null
          cashdiscountamountinfuncnlcrcy?: string | null
          CashDiscountAmountInFuncnlCrcy?: string | null
          cashdiscountamtincocodecrcy?: string | null
          CashDiscountAmtInCoCodeCrcy?: string | null
          cashdiscountamtintransaccrcy?: string | null
          CashDiscountAmtInTransacCrcy?: string | null
          cep?: string | null
          cliente?: string | null
          cliente_id?: string | null
          cod_barras?: number | null
          companycode?: number | null
          created_at?: string
          customer?: string | null
          dados_extras?: Json | null
          data_delete?: string | null
          data_desconto?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          deleted?: string | null
          doc_contabil?: string | null
          documento?: string | null
          DocumentReferenceID?: string | null
          dyn_cidade?: string | null
          dyn_conta?: number | null
          dyn_desconto1?: string | null
          dyn_nome_do_cliente?: string | null
          dyn_zonatransporte?: string | null
          empresa?: number | null
          endereco?: string | null
          FinancialAccountType?: string | null
          id?: string
          integracao_id?: string | null
          json_original?: Json | null
          nosso_numero?: string | null
          numero_cobranca: string
          numero_nota: string
          pais?: string | null
          payeeadditionalname?: string | null
          payeeregion?: string | null
          paymentamountinfunctionalcrcy?: string | null
          PaymentAmountInFunctionalCrcy?: string | null
          paymentcurrency?: string | null
          PaymentCurrency?: string | null
          PaymentDueDate?: string | null
          PaymentMethod?: string | null
          paymentorigin?: string | null
          PaymentOrigin?: string | null
          paymentreference?: string | null
          paymentrundate?: string | null
          paymentrunisproposal?: string | null
          PaymentRunIsProposal?: string | null
          paytamountincocodecurrency?: string | null
          PaytAmountInCoCodeCurrency?: string | null
          PostingDate?: string | null
          serie?: string | null
          sincronizado_em?: string | null
          taxnumber1?: string | null
          TaxNumber1?: string | null
          uf?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
          valor?: number | null
          valor_com_desconto?: number | null
          valor_desconto?: number | null
          yy1_custtranspzone_sdh?: string | null
          yy1_custtranspzonpais_sdh?: string | null
        }
        Update: {
          accountingdocument?: string | null
          AccountingDocument?: string | null
          accountingdocumenttype?: string | null
          bairro?: string | null
          banco?: string | null
          bankaccountlongid?: string | null
          BankAccountLongID?: string | null
          bankcontrolkey?: string | null
          bankinternalid?: string | null
          BankInternalID?: string | null
          billingdocument?: string | null
          br_nfenumber?: string | null
          br_nfnumber?: string | null
          br_nfpartnercnpj?: string | null
          BR_NFPartnerFunction?: string | null
          br_nfsourcedocumenttype?: string | null
          br_nfsubseries?: string | null
          CashDiscount1Days?: string | null
          CashDiscount1Percent?: string | null
          CashDiscount2Days?: string | null
          cashdiscountamountinfuncnlcrcy?: string | null
          CashDiscountAmountInFuncnlCrcy?: string | null
          cashdiscountamtincocodecrcy?: string | null
          CashDiscountAmtInCoCodeCrcy?: string | null
          cashdiscountamtintransaccrcy?: string | null
          CashDiscountAmtInTransacCrcy?: string | null
          cep?: string | null
          cliente?: string | null
          cliente_id?: string | null
          cod_barras?: number | null
          companycode?: number | null
          created_at?: string
          customer?: string | null
          dados_extras?: Json | null
          data_delete?: string | null
          data_desconto?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          deleted?: string | null
          doc_contabil?: string | null
          documento?: string | null
          DocumentReferenceID?: string | null
          dyn_cidade?: string | null
          dyn_conta?: number | null
          dyn_desconto1?: string | null
          dyn_nome_do_cliente?: string | null
          dyn_zonatransporte?: string | null
          empresa?: number | null
          endereco?: string | null
          FinancialAccountType?: string | null
          id?: string
          integracao_id?: string | null
          json_original?: Json | null
          nosso_numero?: string | null
          numero_cobranca?: string
          numero_nota?: string
          pais?: string | null
          payeeadditionalname?: string | null
          payeeregion?: string | null
          paymentamountinfunctionalcrcy?: string | null
          PaymentAmountInFunctionalCrcy?: string | null
          paymentcurrency?: string | null
          PaymentCurrency?: string | null
          PaymentDueDate?: string | null
          PaymentMethod?: string | null
          paymentorigin?: string | null
          PaymentOrigin?: string | null
          paymentreference?: string | null
          paymentrundate?: string | null
          paymentrunisproposal?: string | null
          PaymentRunIsProposal?: string | null
          paytamountincocodecurrency?: string | null
          PaytAmountInCoCodeCurrency?: string | null
          PostingDate?: string | null
          serie?: string | null
          sincronizado_em?: string | null
          taxnumber1?: string | null
          TaxNumber1?: string | null
          uf?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
          valor?: number | null
          valor_com_desconto?: number | null
          valor_desconto?: number | null
          yy1_custtranspzone_sdh?: string | null
          yy1_custtranspzonpais_sdh?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_boletos_api_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vv_b_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vv_b_boletos_api_integracao_id_fkey"
            columns: ["integracao_id"]
            isOneToOne: false
            referencedRelation: "vv_b_api_integracoes"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_boletos_api_config: {
        Row: {
          campo_boleto: string | null
          chave: string
          created_at: string
          data_delete: string | null
          deleted: string | null
          id: string
          label: string
          ordem: number
          tipo: string
          updated_at: string
          usuario_delete_id: string | null
          visivel: boolean
        }
        Insert: {
          campo_boleto?: string | null
          chave: string
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          id?: string
          label: string
          ordem?: number
          tipo: string
          updated_at?: string
          usuario_delete_id?: string | null
          visivel?: boolean
        }
        Update: {
          campo_boleto?: string | null
          chave?: string
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          id?: string
          label?: string
          ordem?: number
          tipo?: string
          updated_at?: string
          usuario_delete_id?: string | null
          visivel?: boolean
        }
        Relationships: []
      }
      vv_b_boletos_api_erros: {
        Row: {
          campo_erro: string | null
          created_at: string
          data_delete: string | null
          deleted: string | null
          id: string
          integracao_id: string | null
          json_original: Json
          mensagem_erro: string
          resolvido: boolean | null
          resolvido_em: string | null
          resolvido_por: string | null
          tentativas: number | null
          tipo_erro: string
          updated_at: string
          usuario_delete_id: string | null
          valor_erro: string | null
        }
        Insert: {
          campo_erro?: string | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          id?: string
          integracao_id?: string | null
          json_original: Json
          mensagem_erro: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          tentativas?: number | null
          tipo_erro: string
          updated_at?: string
          usuario_delete_id?: string | null
          valor_erro?: string | null
        }
        Update: {
          campo_erro?: string | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          id?: string
          integracao_id?: string | null
          json_original?: Json
          mensagem_erro?: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          tentativas?: number | null
          tipo_erro?: string
          updated_at?: string
          usuario_delete_id?: string | null
          valor_erro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_boletos_api_erros_integracao_id_fkey"
            columns: ["integracao_id"]
            isOneToOne: false
            referencedRelation: "vv_b_api_integracoes"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_boletos_gerados: {
        Row: {
          banco_id: string
          codigo_barras: string | null
          created_at: string
          created_by: string | null
          data_delete: string | null
          data_geracao: string | null
          data_vencimento: string | null
          deleted: string | null
          id: string
          linha_digitavel: string | null
          modelo_boleto_id: string | null
          nosso_numero: string | null
          nota_fiscal_id: string | null
          pdf_gerado_url: string | null
          status: string | null
          updated_at: string
          usuario_delete_id: string | null
          valor: number | null
        }
        Insert: {
          banco_id: string
          codigo_barras?: string | null
          created_at?: string
          created_by?: string | null
          data_delete?: string | null
          data_geracao?: string | null
          data_vencimento?: string | null
          deleted?: string | null
          id?: string
          linha_digitavel?: string | null
          modelo_boleto_id?: string | null
          nosso_numero?: string | null
          nota_fiscal_id?: string | null
          pdf_gerado_url?: string | null
          status?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
          valor?: number | null
        }
        Update: {
          banco_id?: string
          codigo_barras?: string | null
          created_at?: string
          created_by?: string | null
          data_delete?: string | null
          data_geracao?: string | null
          data_vencimento?: string | null
          deleted?: string | null
          id?: string
          linha_digitavel?: string | null
          modelo_boleto_id?: string | null
          nosso_numero?: string | null
          nota_fiscal_id?: string | null
          pdf_gerado_url?: string | null
          status?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_boletos_gerados_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "vv_b_bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vv_b_boletos_gerados_modelo_boleto_id_fkey"
            columns: ["modelo_boleto_id"]
            isOneToOne: false
            referencedRelation: "vv_b_modelos_boleto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vv_b_boletos_gerados_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "vv_b_notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_clientes: {
        Row: {
          agente_frete: string | null
          business_partner: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          data_delete: string | null
          deleted: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          lzone: string | null
          parceiro_negocio: string | null
          razao_social: string
          telefone: string | null
          updated_at: string
          usuario_delete_id: string | null
        }
        Insert: {
          agente_frete?: string | null
          business_partner?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          lzone?: string | null
          parceiro_negocio?: string | null
          razao_social: string
          telefone?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Update: {
          agente_frete?: string | null
          business_partner?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          lzone?: string | null
          parceiro_negocio?: string | null
          razao_social?: string
          telefone?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Relationships: []
      }
      vv_b_configuracoes_banco: {
        Row: {
          agencia: string | null
          banco_id: string
          carteira: string | null
          codigo_cedente: string | null
          conta: string | null
          convenio: string | null
          created_at: string
          data_delete: string | null
          deleted: string | null
          dias_carencia: number | null
          id: string
          multa_percentual: number | null
          taxa_juros_mensal: number | null
          texto_instrucao_padrao: string | null
          updated_at: string
          usuario_delete_id: string | null
        }
        Insert: {
          agencia?: string | null
          banco_id: string
          carteira?: string | null
          codigo_cedente?: string | null
          conta?: string | null
          convenio?: string | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          dias_carencia?: number | null
          id?: string
          multa_percentual?: number | null
          taxa_juros_mensal?: number | null
          texto_instrucao_padrao?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Update: {
          agencia?: string | null
          banco_id?: string
          carteira?: string | null
          codigo_cedente?: string | null
          conta?: string | null
          convenio?: string | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          dias_carencia?: number | null
          id?: string
          multa_percentual?: number | null
          taxa_juros_mensal?: number | null
          texto_instrucao_padrao?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_configuracoes_banco_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "vv_b_bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_configuracoes_cnab: {
        Row: {
          banco_id: string | null
          campos: Json | null
          created_at: string
          data_delete: string | null
          deleted: string | null
          descricao: string | null
          id: string
          linhas: Json | null
          nome: string
          tipo_arquivo: string | null
          tipo_cnab: string
          updated_at: string
          usuario_delete_id: string | null
        }
        Insert: {
          banco_id?: string | null
          campos?: Json | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          descricao?: string | null
          id?: string
          linhas?: Json | null
          nome: string
          tipo_arquivo?: string | null
          tipo_cnab: string
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Update: {
          banco_id?: string | null
          campos?: Json | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          descricao?: string | null
          id?: string
          linhas?: Json | null
          nome?: string
          tipo_arquivo?: string | null
          tipo_cnab?: string
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_configuracoes_cnab_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "vv_b_bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_empresas: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          created_at: string
          data_delete: string | null
          deleted: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          logo_url: string | null
          nome_fantasia: string | null
          numero: string | null
          razao_social: string
          site: string | null
          telefone: string | null
          updated_at: string
          usuario_delete_id: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social: string
          site?: string | null
          telefone?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string
          site?: string | null
          telefone?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Relationships: []
      }
      vv_b_linhas_cnab: {
        Row: {
          arquivo_cnab_id: string
          campos_editados: Json | null
          campos_extraidos: Json | null
          conteudo_editado: string | null
          conteudo_original: string
          created_at: string | null
          id: string
          numero_linha: number
          status: string | null
          tipo_registro: string | null
          updated_at: string | null
        }
        Insert: {
          arquivo_cnab_id: string
          campos_editados?: Json | null
          campos_extraidos?: Json | null
          conteudo_editado?: string | null
          conteudo_original: string
          created_at?: string | null
          id?: string
          numero_linha: number
          status?: string | null
          tipo_registro?: string | null
          updated_at?: string | null
        }
        Update: {
          arquivo_cnab_id?: string
          campos_editados?: Json | null
          campos_extraidos?: Json | null
          conteudo_editado?: string | null
          conteudo_original?: string
          created_at?: string | null
          id?: string
          numero_linha?: number
          status?: string | null
          tipo_registro?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_linhas_cnab_arquivo_cnab_id_fkey"
            columns: ["arquivo_cnab_id"]
            isOneToOne: false
            referencedRelation: "vv_b_arquivos_cnab_lidos"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_modelos_boleto: {
        Row: {
          altura_pagina: number | null
          banco_id: string | null
          bancos_compativeis: string[] | null
          campos_mapeados: Json | null
          created_at: string
          data_delete: string | null
          deleted: string | null
          formato_pagina: string | null
          id: string
          largura_pagina: number | null
          nome_modelo: string
          padrao: boolean | null
          pdf_exemplo_base64: string | null
          pdf_storage_bucket: string | null
          pdf_storage_path: string | null
          template_pdf_id: string | null
          texto_instrucoes: string | null
          tipo_layout: string | null
          updated_at: string
          usuario_delete_id: string | null
        }
        Insert: {
          altura_pagina?: number | null
          banco_id?: string | null
          bancos_compativeis?: string[] | null
          campos_mapeados?: Json | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          formato_pagina?: string | null
          id?: string
          largura_pagina?: number | null
          nome_modelo: string
          padrao?: boolean | null
          pdf_exemplo_base64?: string | null
          pdf_storage_bucket?: string | null
          pdf_storage_path?: string | null
          template_pdf_id?: string | null
          texto_instrucoes?: string | null
          tipo_layout?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Update: {
          altura_pagina?: number | null
          banco_id?: string | null
          bancos_compativeis?: string[] | null
          campos_mapeados?: Json | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          formato_pagina?: string | null
          id?: string
          largura_pagina?: number | null
          nome_modelo?: string
          padrao?: boolean | null
          pdf_exemplo_base64?: string | null
          pdf_storage_bucket?: string | null
          pdf_storage_path?: string | null
          template_pdf_id?: string | null
          texto_instrucoes?: string | null
          tipo_layout?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_modelos_boleto_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "vv_b_bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vv_b_modelos_boleto_template_pdf_id_fkey"
            columns: ["template_pdf_id"]
            isOneToOne: false
            referencedRelation: "vv_b_templates_pdf"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_notas_fiscais: {
        Row: {
          cliente_id: string
          created_at: string
          data_delete: string | null
          data_emissao: string
          data_vencimento: string
          deleted: string | null
          id: string
          moeda: string | null
          numero_nota: string
          referencia_interna: string | null
          serie: string | null
          status: string | null
          updated_at: string
          usuario_delete_id: string | null
          valor_titulo: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_delete?: string | null
          data_emissao: string
          data_vencimento: string
          deleted?: string | null
          id?: string
          moeda?: string | null
          numero_nota: string
          referencia_interna?: string | null
          serie?: string | null
          status?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
          valor_titulo: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_delete?: string | null
          data_emissao?: string
          data_vencimento?: string
          deleted?: string | null
          id?: string
          moeda?: string | null
          numero_nota?: string
          referencia_interna?: string | null
          serie?: string | null
          status?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
          valor_titulo?: number
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_notas_fiscais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vv_b_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_perfis_acesso: {
        Row: {
          created_at: string | null
          data_delete: string | null
          deleted: string | null
          descricao: string | null
          id: string
          nome: string
          permissoes: Json | null
          sistema: boolean | null
          updated_at: string | null
          usuario_delete_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_delete?: string | null
          deleted?: string | null
          descricao?: string | null
          id?: string
          nome: string
          permissoes?: Json | null
          sistema?: boolean | null
          updated_at?: string | null
          usuario_delete_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_delete?: string | null
          deleted?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          permissoes?: Json | null
          sistema?: boolean | null
          updated_at?: string | null
          usuario_delete_id?: string | null
        }
        Relationships: []
      }
      vv_b_templates_pdf: {
        Row: {
          altura_pagina: number | null
          areas_texto: Json | null
          arquivo_base64: string | null
          created_at: string
          data_delete: string | null
          deleted: string | null
          id: string
          largura_pagina: number | null
          nome: string
          preview_url: string | null
          updated_at: string
          usuario_delete_id: string | null
        }
        Insert: {
          altura_pagina?: number | null
          areas_texto?: Json | null
          arquivo_base64?: string | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          id?: string
          largura_pagina?: number | null
          nome: string
          preview_url?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Update: {
          altura_pagina?: number | null
          areas_texto?: Json | null
          arquivo_base64?: string | null
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          id?: string
          largura_pagina?: number | null
          nome?: string
          preview_url?: string | null
          updated_at?: string
          usuario_delete_id?: string | null
        }
        Relationships: []
      }
      vv_b_user_roles: {
        Row: {
          created_at: string
          data_delete: string | null
          deleted: string | null
          id: string
          perfil_acesso_id: string | null
          role: Database["public"]["Enums"]["vv_b_perfil_usuario"]
          user_id: string
          usuario_delete_id: string | null
        }
        Insert: {
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          id?: string
          perfil_acesso_id?: string | null
          role: Database["public"]["Enums"]["vv_b_perfil_usuario"]
          user_id: string
          usuario_delete_id?: string | null
        }
        Update: {
          created_at?: string
          data_delete?: string | null
          deleted?: string | null
          id?: string
          perfil_acesso_id?: string | null
          role?: Database["public"]["Enums"]["vv_b_perfil_usuario"]
          user_id?: string
          usuario_delete_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_user_roles_perfil_acesso_id_fkey"
            columns: ["perfil_acesso_id"]
            isOneToOne: false
            referencedRelation: "vv_b_perfis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_b_usuarios: {
        Row: {
          aprovado_por: string | null
          ativo: boolean | null
          created_at: string | null
          data_aprovacao: string | null
          data_delete: string | null
          deleted: string | null
          email: string
          id: string
          nome: string | null
          perfil_acesso_id: string | null
          updated_at: string | null
          user_id: string
          usuario_delete_id: string | null
        }
        Insert: {
          aprovado_por?: string | null
          ativo?: boolean | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_delete?: string | null
          deleted?: string | null
          email: string
          id?: string
          nome?: string | null
          perfil_acesso_id?: string | null
          updated_at?: string | null
          user_id: string
          usuario_delete_id?: string | null
        }
        Update: {
          aprovado_por?: string | null
          ativo?: boolean | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_delete?: string | null
          deleted?: string | null
          email?: string
          id?: string
          nome?: string | null
          perfil_acesso_id?: string | null
          updated_at?: string | null
          user_id?: string
          usuario_delete_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vv_b_usuarios_perfil_acesso_id_fkey"
            columns: ["perfil_acesso_id"]
            isOneToOne: false
            referencedRelation: "vv_b_perfis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      vv_imagens: {
        Row: {
          base64: string | null
          created_at: string
          data: string | null
          hora: string | null
          id: number
          idmessage: string | null
          nome_arquivo: string | null
          observacoes: string | null
          origem: string | null
          telefone: string | null
          url_arquivo: string | null
        }
        Insert: {
          base64?: string | null
          created_at?: string
          data?: string | null
          hora?: string | null
          id?: number
          idmessage?: string | null
          nome_arquivo?: string | null
          observacoes?: string | null
          origem?: string | null
          telefone?: string | null
          url_arquivo?: string | null
        }
        Update: {
          base64?: string | null
          created_at?: string
          data?: string | null
          hora?: string | null
          id?: number
          idmessage?: string | null
          nome_arquivo?: string | null
          observacoes?: string | null
          origem?: string | null
          telefone?: string | null
          url_arquivo?: string | null
        }
        Relationships: []
      }
      VV_wahtsapp: {
        Row: {
          apikey: string | null
          Cliente: string | null
          contato: string | null
          "contextInfo.participant": string | null
          conversation: string | null
          Data: string | null
          DataEntrega: string | null
          forme: string | null
          groupId: string | null
          id: number
          id_mensagem: string | null
          idkey: string | null
          mensagem: string | null
          message: string | null
          messageSecret: string | null
          messageType: string | null
          NFE: number | null
          numero: string | null
          participant: string | null
          pushName: string | null
          remoteJid: string | null
          serie: number | null
          stanzaId: string | null
          status: string | null
          timestamp: string | null
          url: string | null
        }
        Insert: {
          apikey?: string | null
          Cliente?: string | null
          contato?: string | null
          "contextInfo.participant"?: string | null
          conversation?: string | null
          Data?: string | null
          DataEntrega?: string | null
          forme?: string | null
          groupId?: string | null
          id?: number
          id_mensagem?: string | null
          idkey?: string | null
          mensagem?: string | null
          message?: string | null
          messageSecret?: string | null
          messageType?: string | null
          NFE?: number | null
          numero?: string | null
          participant?: string | null
          pushName?: string | null
          remoteJid?: string | null
          serie?: number | null
          stanzaId?: string | null
          status?: string | null
          timestamp?: string | null
          url?: string | null
        }
        Update: {
          apikey?: string | null
          Cliente?: string | null
          contato?: string | null
          "contextInfo.participant"?: string | null
          conversation?: string | null
          Data?: string | null
          DataEntrega?: string | null
          forme?: string | null
          groupId?: string | null
          id?: number
          id_mensagem?: string | null
          idkey?: string | null
          mensagem?: string | null
          message?: string | null
          messageSecret?: string | null
          messageType?: string | null
          NFE?: number | null
          numero?: string | null
          participant?: string | null
          pushName?: string | null
          remoteJid?: string | null
          serie?: number | null
          stanzaId?: string | null
          status?: string | null
          timestamp?: string | null
          url?: string | null
        }
        Relationships: []
      }
      wahtsapp: {
        Row: {
          contato: string | null
          forme: string | null
          id: number
          id_mensagem: string | null
          mensagem: string | null
          numero: string | null
          status: string | null
          timestamp: string | null
        }
        Insert: {
          contato?: string | null
          forme?: string | null
          id?: number
          id_mensagem?: string | null
          mensagem?: string | null
          numero?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          contato?: string | null
          forme?: string | null
          id?: number
          id_mensagem?: string | null
          mensagem?: string | null
          numero?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_ocorrencia: {
        Args: {
          p_criado_por?: string
          p_data: string
          p_hora: string
          p_nota_id: string
          p_observacao?: string
          p_ocorrencia_id: string
          p_operacao_id: string
        }
        Returns: string
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      vv_b_add_dynamic_column: {
        Args: { p_column_name: string; p_column_type?: string }
        Returns: boolean
      }
      vv_b_any_admin_exists: { Args: never; Returns: boolean }
      vv_b_aprovar_usuario: {
        Args: {
          p_perfil_acesso_id: string
          p_role?: Database["public"]["Enums"]["vv_b_perfil_usuario"]
          p_usuario_id: string
        }
        Returns: boolean
      }
      vv_b_get_admin_emails: {
        Args: never
        Returns: {
          email: string
        }[]
      }
      vv_b_get_user_permissions: { Args: { _user_id: string }; Returns: Json }
      vv_b_has_permission: {
        Args: { _acao: string; _modulo: string; _user_id: string }
        Returns: boolean
      }
      vv_b_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["vv_b_perfil_usuario"]
          _user_id: string
        }
        Returns: boolean
      }
      vv_b_is_master_or_admin: { Args: { _user_id: string }; Returns: boolean }
      vv_b_list_dynamic_columns: {
        Args: never
        Returns: {
          column_name: string
          data_type: string
        }[]
      }
      vv_b_soft_delete: {
        Args: { p_id: string; p_table_name: string }
        Returns: boolean
      }
      vv_b_soft_delete_mapeamento_campo: {
        Args: { p_id: string }
        Returns: boolean
      }
      vv_b_user_is_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      perfil_usuario: "administrativo" | "transportadora"
      rl_ticket_status: "available" | "reserved" | "confirmed"
      status_geral: "ativo" | "inativo"
      vv_b_perfil_usuario: "master" | "admin" | "operador" | "visualizador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      perfil_usuario: ["administrativo", "transportadora"],
      rl_ticket_status: ["available", "reserved", "confirmed"],
      status_geral: ["ativo", "inativo"],
      vv_b_perfil_usuario: ["master", "admin", "operador", "visualizador"],
    },
  },
} as const
