// Tipos completos para CNAB 240 e 400
export type TipoLinhaCNAB240 = 
  | 'header_arquivo'      // 0
  | 'header_lote'         // 1
  | 'detalhe_segmento_p'  // 3 + P
  | 'detalhe_segmento_q'  // 3 + Q
  | 'detalhe_segmento_r'  // 3 + R
  | 'detalhe_segmento_s'  // 3 + S
  | 'detalhe_segmento_t'  // 3 + T
  | 'detalhe_segmento_u'  // 3 + U
  | 'trailer_lote'        // 5
  | 'trailer_arquivo';    // 9

export type TipoLinhaCNAB400 = 
  | 'header'              // 0
  | 'detalhe'             // 1
  | 'detalhe_multa'       // 2 (opcional)
  | 'trailer';            // 9

export type TipoLinhaCNAB = TipoLinhaCNAB240 | TipoLinhaCNAB400;

// Campo CNAB completo do manual do banco
export interface CampoCNABCompleto {
  id: string;
  nome: string;
  descricao?: string;
  posicaoInicio: number;
  posicaoFim: number;
  tamanho: number;
  tipo: 'numerico' | 'alfanumerico' | 'data' | 'valor';
  decimais?: number;
  tipoLinha: TipoLinhaCNAB;
  identificadorLinha: string; // Ex: "0", "1", "3P", "3Q", "9"
  obrigatorio: boolean;
  conteudoPadrao?: string;
  destinoBoleto?: string; // Campo mapeado para o boleto
  utilizadoNoBoleto: boolean; // Se é usado no boleto
  cor?: string;
  valorExtraido?: string;
  erro?: string;
}

// Configuração CNAB completa para um banco
export interface ConfiguracaoCNABCompleta {
  id: string;
  nome: string;
  descricao?: string;
  banco_id: string;
  tipo_cnab: 'CNAB_240' | 'CNAB_400';
  versao?: string;
  
  // Estrutura de linhas
  linhas: {
    tipo: TipoLinhaCNAB;
    identificador: string;
    descricao: string;
    tamanhoLinha: number;
    campos: CampoCNABCompleto[];
  }[];
  
  criado_em: string;
  atualizado_em: string;
}

// Campos padrão CNAB 400 FEBRABAN
export const CAMPOS_CNAB_400_PADRAO: CampoCNABCompleto[] = [
  // === HEADER (Tipo 0) ===
  { id: 'h_tipo_registro', nome: 'Tipo de Registro', posicaoInicio: 1, posicaoFim: 1, tamanho: 1, tipo: 'numerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: true, conteudoPadrao: '0', utilizadoNoBoleto: false },
  { id: 'h_identificacao', nome: 'Identificação do Arquivo', posicaoInicio: 2, posicaoFim: 2, tamanho: 1, tipo: 'numerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: true, conteudoPadrao: '1', utilizadoNoBoleto: false },
  { id: 'h_literal_remessa', nome: 'Literal Remessa', posicaoInicio: 3, posicaoFim: 9, tamanho: 7, tipo: 'alfanumerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: true, conteudoPadrao: 'REMESSA', utilizadoNoBoleto: false },
  { id: 'h_codigo_servico', nome: 'Código do Serviço', posicaoInicio: 10, posicaoFim: 11, tamanho: 2, tipo: 'numerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: true, conteudoPadrao: '01', utilizadoNoBoleto: false },
  { id: 'h_literal_servico', nome: 'Literal Serviço', posicaoInicio: 12, posicaoFim: 26, tamanho: 15, tipo: 'alfanumerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: true, conteudoPadrao: 'COBRANCA', utilizadoNoBoleto: false },
  { id: 'h_codigo_empresa', nome: 'Código da Empresa', posicaoInicio: 27, posicaoFim: 46, tamanho: 20, tipo: 'numerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'codigo_cedente' },
  { id: 'h_nome_empresa', nome: 'Nome da Empresa', posicaoInicio: 47, posicaoFim: 76, tamanho: 30, tipo: 'alfanumerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'beneficiario_nome' },
  { id: 'h_codigo_banco', nome: 'Código do Banco', posicaoInicio: 77, posicaoFim: 79, tamanho: 3, tipo: 'numerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'banco_codigo' },
  { id: 'h_nome_banco', nome: 'Nome do Banco', posicaoInicio: 80, posicaoFim: 94, tamanho: 15, tipo: 'alfanumerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'banco_nome' },
  { id: 'h_data_geracao', nome: 'Data de Geração', posicaoInicio: 95, posicaoFim: 100, tamanho: 6, tipo: 'data', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'h_brancos1', nome: 'Brancos', posicaoInicio: 101, posicaoFim: 108, tamanho: 8, tipo: 'alfanumerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'h_identificacao_sistema', nome: 'Identificação do Sistema', posicaoInicio: 109, posicaoFim: 110, tamanho: 2, tipo: 'alfanumerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'h_sequencial_arquivo', nome: 'Sequencial do Arquivo', posicaoInicio: 111, posicaoFim: 117, tamanho: 7, tipo: 'numerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'h_brancos2', nome: 'Brancos', posicaoInicio: 118, posicaoFim: 394, tamanho: 277, tipo: 'alfanumerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'h_sequencial_registro', nome: 'Sequencial do Registro', posicaoInicio: 395, posicaoFim: 400, tamanho: 6, tipo: 'numerico', tipoLinha: 'header', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: false },
  
  // === DETALHE (Tipo 1) ===
  { id: 'd_tipo_registro', nome: 'Tipo de Registro', posicaoInicio: 1, posicaoFim: 1, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, conteudoPadrao: '1', utilizadoNoBoleto: false },
  { id: 'd_agencia_debito', nome: 'Agência de Débito', posicaoInicio: 2, posicaoFim: 6, tamanho: 5, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_digito_agencia', nome: 'Dígito da Agência', posicaoInicio: 7, posicaoFim: 7, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_razao_conta', nome: 'Razão da Conta', posicaoInicio: 8, posicaoFim: 12, tamanho: 5, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_conta_corrente', nome: 'Conta Corrente', posicaoInicio: 13, posicaoFim: 19, tamanho: 7, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_digito_conta', nome: 'Dígito da Conta', posicaoInicio: 20, posicaoFim: 20, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_identificacao_empresa', nome: 'Identificação da Empresa', posicaoInicio: 21, posicaoFim: 37, tamanho: 17, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'd_controle_participante', nome: 'Controle do Participante', posicaoInicio: 38, posicaoFim: 62, tamanho: 25, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_codigo_banco', nome: 'Código do Banco', posicaoInicio: 63, posicaoFim: 65, tamanho: 3, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'banco_codigo' },
  { id: 'd_campo_multa', nome: 'Campo de Multa', posicaoInicio: 66, posicaoFim: 66, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'mora_multa' },
  { id: 'd_percentual_multa', nome: 'Percentual Multa', posicaoInicio: 67, posicaoFim: 70, tamanho: 4, tipo: 'valor', decimais: 2, tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'percentual_multa' },
  { id: 'd_nosso_numero', nome: 'Nosso Número', posicaoInicio: 71, posicaoFim: 82, tamanho: 12, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'nosso_numero' },
  { id: 'd_digito_nosso_numero', nome: 'Dígito Nosso Número', posicaoInicio: 83, posicaoFim: 83, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'nosso_numero_dv' },
  { id: 'd_desconto_bonificacao', nome: 'Desconto Bonificação', posicaoInicio: 84, posicaoFim: 93, tamanho: 10, tipo: 'valor', decimais: 2, tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'desconto_abatimento' },
  { id: 'd_condicao_emissao', nome: 'Condição Emissão Papeleta', posicaoInicio: 94, posicaoFim: 94, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'd_emite_boleto', nome: 'Ident. Emite Boleto', posicaoInicio: 95, posicaoFim: 95, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'd_identificacao_operacao', nome: 'Identificação da Operação', posicaoInicio: 96, posicaoFim: 105, tamanho: 10, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_indicador_rateio', nome: 'Indicador Rateio Crédito', posicaoInicio: 106, posicaoFim: 106, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_enderecamento_aviso', nome: 'Endereçamento Aviso Débito', posicaoInicio: 107, posicaoFim: 107, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_brancos1', nome: 'Brancos', posicaoInicio: 108, posicaoFim: 108, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_carteira', nome: 'Carteira', posicaoInicio: 108, posicaoFim: 108, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'carteira' },
  { id: 'd_codigo_ocorrencia', nome: 'Código de Ocorrência', posicaoInicio: 109, posicaoFim: 110, tamanho: 2, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'd_numero_documento', nome: 'Número do Documento', posicaoInicio: 111, posicaoFim: 120, tamanho: 10, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'numero_documento' },
  { id: 'd_data_vencimento', nome: 'Data do Vencimento', posicaoInicio: 121, posicaoFim: 126, tamanho: 6, tipo: 'data', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'data_vencimento' },
  { id: 'd_valor_titulo', nome: 'Valor do Título', posicaoInicio: 127, posicaoFim: 139, tamanho: 13, tipo: 'valor', decimais: 2, tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'valor_documento' },
  { id: 'd_banco_cobrador', nome: 'Banco Cobrador', posicaoInicio: 140, posicaoFim: 142, tamanho: 3, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'd_agencia_depositaria', nome: 'Agência Depositária', posicaoInicio: 143, posicaoFim: 147, tamanho: 5, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_especie_titulo', nome: 'Espécie de Título', posicaoInicio: 148, posicaoFim: 149, tamanho: 2, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'especie_documento' },
  { id: 'd_aceite', nome: 'Aceite', posicaoInicio: 150, posicaoFim: 150, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'aceite' },
  { id: 'd_data_emissao', nome: 'Data de Emissão', posicaoInicio: 151, posicaoFim: 156, tamanho: 6, tipo: 'data', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'data_documento' },
  { id: 'd_instrucao1', nome: 'Instrução 1', posicaoInicio: 157, posicaoFim: 158, tamanho: 2, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'instrucao_1' },
  { id: 'd_instrucao2', nome: 'Instrução 2', posicaoInicio: 159, posicaoFim: 160, tamanho: 2, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'instrucao_2' },
  { id: 'd_juros_mora', nome: 'Juros de Mora', posicaoInicio: 161, posicaoFim: 173, tamanho: 13, tipo: 'valor', decimais: 2, tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'valor_juros_dia' },
  { id: 'd_data_limite_desconto', nome: 'Data Limite Desconto', posicaoInicio: 174, posicaoFim: 179, tamanho: 6, tipo: 'data', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_valor_desconto', nome: 'Valor do Desconto', posicaoInicio: 180, posicaoFim: 192, tamanho: 13, tipo: 'valor', decimais: 2, tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'desconto_abatimento' },
  { id: 'd_valor_iof', nome: 'Valor do IOF', posicaoInicio: 193, posicaoFim: 205, tamanho: 13, tipo: 'valor', decimais: 2, tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_valor_abatimento', nome: 'Valor do Abatimento', posicaoInicio: 206, posicaoFim: 218, tamanho: 13, tipo: 'valor', decimais: 2, tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'desconto_abatimento' },
  { id: 'd_tipo_inscricao_sacado', nome: 'Tipo Inscrição Pagador', posicaoInicio: 219, posicaoFim: 220, tamanho: 2, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'd_numero_inscricao_sacado', nome: 'CPF/CNPJ Pagador', posicaoInicio: 221, posicaoFim: 234, tamanho: 14, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'pagador_cnpj' },
  { id: 'd_nome_sacado', nome: 'Nome do Pagador', posicaoInicio: 235, posicaoFim: 274, tamanho: 40, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'pagador_nome' },
  { id: 'd_endereco_sacado', nome: 'Endereço do Pagador', posicaoInicio: 275, posicaoFim: 314, tamanho: 40, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'pagador_endereco' },
  { id: 'd_mensagem1', nome: 'Mensagem 1', posicaoInicio: 315, posicaoFim: 326, tamanho: 12, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'instrucoes' },
  { id: 'd_cep_sacado', nome: 'CEP do Pagador', posicaoInicio: 327, posicaoFim: 334, tamanho: 8, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'pagador_cep' },
  { id: 'd_sacador_avalista', nome: 'Sacador/Avalista', posicaoInicio: 335, posicaoFim: 394, tamanho: 60, tipo: 'alfanumerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'd_sequencial_registro', nome: 'Sequencial do Registro', posicaoInicio: 395, posicaoFim: 400, tamanho: 6, tipo: 'numerico', tipoLinha: 'detalhe', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },

  // === TRAILER (Tipo 9) ===
  { id: 't_tipo_registro', nome: 'Tipo de Registro', posicaoInicio: 1, posicaoFim: 1, tamanho: 1, tipo: 'numerico', tipoLinha: 'trailer', identificadorLinha: '9', obrigatorio: true, conteudoPadrao: '9', utilizadoNoBoleto: false },
  { id: 't_brancos', nome: 'Brancos', posicaoInicio: 2, posicaoFim: 394, tamanho: 393, tipo: 'alfanumerico', tipoLinha: 'trailer', identificadorLinha: '9', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 't_sequencial_registro', nome: 'Sequencial do Registro', posicaoInicio: 395, posicaoFim: 400, tamanho: 6, tipo: 'numerico', tipoLinha: 'trailer', identificadorLinha: '9', obrigatorio: true, utilizadoNoBoleto: false },
];

// Campos padrão CNAB 240 FEBRABAN
export const CAMPOS_CNAB_240_PADRAO: CampoCNABCompleto[] = [
  // === HEADER DO ARQUIVO (Tipo 0) ===
  { id: 'ha_banco', nome: 'Código do Banco', posicaoInicio: 1, posicaoFim: 3, tamanho: 3, tipo: 'numerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'banco_codigo' },
  { id: 'ha_lote', nome: 'Lote de Serviço', posicaoInicio: 4, posicaoFim: 7, tamanho: 4, tipo: 'numerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, conteudoPadrao: '0000', utilizadoNoBoleto: false },
  { id: 'ha_tipo_registro', nome: 'Tipo de Registro', posicaoInicio: 8, posicaoFim: 8, tamanho: 1, tipo: 'numerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, conteudoPadrao: '0', utilizadoNoBoleto: false },
  { id: 'ha_brancos1', nome: 'Brancos', posicaoInicio: 9, posicaoFim: 17, tamanho: 9, tipo: 'alfanumerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'ha_tipo_inscricao', nome: 'Tipo de Inscrição da Empresa', posicaoInicio: 18, posicaoFim: 18, tamanho: 1, tipo: 'numerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'ha_numero_inscricao', nome: 'Número de Inscrição da Empresa', posicaoInicio: 19, posicaoFim: 32, tamanho: 14, tipo: 'numerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'beneficiario_cnpj' },
  { id: 'ha_convenio', nome: 'Código do Convênio no Banco', posicaoInicio: 33, posicaoFim: 52, tamanho: 20, tipo: 'alfanumerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'ha_agencia', nome: 'Agência Mantenedora da Conta', posicaoInicio: 53, posicaoFim: 57, tamanho: 5, tipo: 'numerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'agencia' },
  { id: 'ha_digito_agencia', nome: 'Dígito Verificador da Agência', posicaoInicio: 58, posicaoFim: 58, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'agencia_dv' },
  { id: 'ha_conta', nome: 'Número da Conta Corrente', posicaoInicio: 59, posicaoFim: 70, tamanho: 12, tipo: 'numerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'conta' },
  { id: 'ha_digito_conta', nome: 'Dígito Verificador da Conta', posicaoInicio: 71, posicaoFim: 71, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'conta_dv' },
  { id: 'ha_digito_ag_conta', nome: 'Dígito Verificador da Ag/Conta', posicaoInicio: 72, posicaoFim: 72, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'ha_nome_empresa', nome: 'Nome da Empresa', posicaoInicio: 73, posicaoFim: 102, tamanho: 30, tipo: 'alfanumerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'beneficiario_nome' },
  { id: 'ha_nome_banco', nome: 'Nome do Banco', posicaoInicio: 103, posicaoFim: 132, tamanho: 30, tipo: 'alfanumerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'banco_nome' },
  { id: 'ha_brancos2', nome: 'Brancos', posicaoInicio: 133, posicaoFim: 142, tamanho: 10, tipo: 'alfanumerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'ha_arquivo_codigo', nome: 'Código Remessa / Retorno', posicaoInicio: 143, posicaoFim: 143, tamanho: 1, tipo: 'numerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'ha_data_geracao', nome: 'Data de Geração do Arquivo', posicaoInicio: 144, posicaoFim: 151, tamanho: 8, tipo: 'data', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'ha_hora_geracao', nome: 'Hora de Geração do Arquivo', posicaoInicio: 152, posicaoFim: 157, tamanho: 6, tipo: 'numerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'ha_sequencial_arquivo', nome: 'Número Sequencial do Arquivo', posicaoInicio: 158, posicaoFim: 163, tamanho: 6, tipo: 'numerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'ha_layout', nome: 'Nº da Versão do Layout', posicaoInicio: 164, posicaoFim: 166, tamanho: 3, tipo: 'numerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: true, conteudoPadrao: '103', utilizadoNoBoleto: false },
  { id: 'ha_densidade', nome: 'Densidade de Gravação', posicaoInicio: 167, posicaoFim: 171, tamanho: 5, tipo: 'numerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'ha_reservado_banco', nome: 'Reservado para o Banco', posicaoInicio: 172, posicaoFim: 191, tamanho: 20, tipo: 'alfanumerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'ha_reservado_empresa', nome: 'Reservado para a Empresa', posicaoInicio: 192, posicaoFim: 211, tamanho: 20, tipo: 'alfanumerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'ha_brancos3', nome: 'Brancos', posicaoInicio: 212, posicaoFim: 240, tamanho: 29, tipo: 'alfanumerico', tipoLinha: 'header_arquivo', identificadorLinha: '0', obrigatorio: false, utilizadoNoBoleto: false },

  // === HEADER DO LOTE (Tipo 1) ===
  { id: 'hl_banco', nome: 'Código do Banco', posicaoInicio: 1, posicaoFim: 3, tamanho: 3, tipo: 'numerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_lote', nome: 'Lote de Serviço', posicaoInicio: 4, posicaoFim: 7, tamanho: 4, tipo: 'numerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_tipo_registro', nome: 'Tipo de Registro', posicaoInicio: 8, posicaoFim: 8, tamanho: 1, tipo: 'numerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, conteudoPadrao: '1', utilizadoNoBoleto: false },
  { id: 'hl_operacao', nome: 'Tipo de Operação', posicaoInicio: 9, posicaoFim: 9, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_tipo_servico', nome: 'Tipo de Serviço', posicaoInicio: 10, posicaoFim: 11, tamanho: 2, tipo: 'numerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_forma_lancamento', nome: 'Forma de Lançamento', posicaoInicio: 12, posicaoFim: 13, tamanho: 2, tipo: 'numerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'hl_layout_lote', nome: 'Versão do Layout do Lote', posicaoInicio: 14, posicaoFim: 16, tamanho: 3, tipo: 'numerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_brancos1', nome: 'Brancos', posicaoInicio: 17, posicaoFim: 17, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'hl_tipo_inscricao', nome: 'Tipo de Inscrição da Empresa', posicaoInicio: 18, posicaoFim: 18, tamanho: 1, tipo: 'numerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_numero_inscricao', nome: 'Número de Inscrição da Empresa', posicaoInicio: 19, posicaoFim: 33, tamanho: 15, tipo: 'numerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_convenio', nome: 'Código do Convênio no Banco', posicaoInicio: 34, posicaoFim: 53, tamanho: 20, tipo: 'alfanumerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_agencia', nome: 'Agência Mantenedora da Conta', posicaoInicio: 54, posicaoFim: 58, tamanho: 5, tipo: 'numerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_digito_agencia', nome: 'Dígito Verificador da Agência', posicaoInicio: 59, posicaoFim: 59, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_conta', nome: 'Número da Conta Corrente', posicaoInicio: 60, posicaoFim: 71, tamanho: 12, tipo: 'numerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_digito_conta', nome: 'Dígito Verificador da Conta', posicaoInicio: 72, posicaoFim: 72, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_digito_ag_conta', nome: 'Dígito Verificador da Ag/Conta', posicaoInicio: 73, posicaoFim: 73, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'hl_nome_empresa', nome: 'Nome da Empresa', posicaoInicio: 74, posicaoFim: 103, tamanho: 30, tipo: 'alfanumerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_mensagem1', nome: 'Mensagem 1', posicaoInicio: 104, posicaoFim: 143, tamanho: 40, tipo: 'alfanumerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'instrucoes' },
  { id: 'hl_mensagem2', nome: 'Mensagem 2', posicaoInicio: 144, posicaoFim: 183, tamanho: 40, tipo: 'alfanumerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'instrucoes' },
  { id: 'hl_numero_remessa', nome: 'Número Remessa/Retorno', posicaoInicio: 184, posicaoFim: 191, tamanho: 8, tipo: 'numerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_data_gravacao', nome: 'Data de Gravação Remessa/Retorno', posicaoInicio: 192, posicaoFim: 199, tamanho: 8, tipo: 'data', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'hl_data_credito', nome: 'Data do Crédito', posicaoInicio: 200, posicaoFim: 207, tamanho: 8, tipo: 'data', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'hl_brancos2', nome: 'Brancos', posicaoInicio: 208, posicaoFim: 240, tamanho: 33, tipo: 'alfanumerico', tipoLinha: 'header_lote', identificadorLinha: '1', obrigatorio: false, utilizadoNoBoleto: false },

  // === DETALHE SEGMENTO P (Tipo 3 + P) ===
  { id: 'dp_banco', nome: 'Código do Banco', posicaoInicio: 1, posicaoFim: 3, tamanho: 3, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_lote', nome: 'Lote de Serviço', posicaoInicio: 4, posicaoFim: 7, tamanho: 4, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_tipo_registro', nome: 'Tipo de Registro', posicaoInicio: 8, posicaoFim: 8, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, conteudoPadrao: '3', utilizadoNoBoleto: false },
  { id: 'dp_sequencial', nome: 'Nº Sequencial do Registro no Lote', posicaoInicio: 9, posicaoFim: 13, tamanho: 5, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_segmento', nome: 'Código de Segmento', posicaoInicio: 14, posicaoFim: 14, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, conteudoPadrao: 'P', utilizadoNoBoleto: false },
  { id: 'dp_brancos1', nome: 'Brancos', posicaoInicio: 15, posicaoFim: 15, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dp_codigo_movimento', nome: 'Código de Movimento', posicaoInicio: 16, posicaoFim: 17, tamanho: 2, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_agencia', nome: 'Agência Mantenedora da Conta', posicaoInicio: 18, posicaoFim: 22, tamanho: 5, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'agencia' },
  { id: 'dp_digito_agencia', nome: 'Dígito Verificador da Agência', posicaoInicio: 23, posicaoFim: 23, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_conta', nome: 'Número da Conta Corrente', posicaoInicio: 24, posicaoFim: 35, tamanho: 12, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'conta' },
  { id: 'dp_digito_conta', nome: 'Dígito Verificador da Conta', posicaoInicio: 36, posicaoFim: 36, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_digito_ag_conta', nome: 'Dígito Verificador da Ag/Conta', posicaoInicio: 37, posicaoFim: 37, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dp_nosso_numero', nome: 'Nosso Número', posicaoInicio: 38, posicaoFim: 57, tamanho: 20, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'nosso_numero' },
  { id: 'dp_carteira', nome: 'Código da Carteira', posicaoInicio: 58, posicaoFim: 58, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'carteira' },
  { id: 'dp_cadastramento', nome: 'Forma de Cadastramento', posicaoInicio: 59, posicaoFim: 59, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_tipo_documento', nome: 'Tipo de Documento', posicaoInicio: 60, posicaoFim: 60, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dp_emissao_boleto', nome: 'Identificação da Emissão do Boleto', posicaoInicio: 61, posicaoFim: 61, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_distribuicao_boleto', nome: 'Identificação da Distribuição', posicaoInicio: 62, posicaoFim: 62, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_numero_documento', nome: 'Número do Documento de Cobrança', posicaoInicio: 63, posicaoFim: 77, tamanho: 15, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'numero_documento' },
  { id: 'dp_data_vencimento', nome: 'Data de Vencimento', posicaoInicio: 78, posicaoFim: 85, tamanho: 8, tipo: 'data', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'data_vencimento' },
  { id: 'dp_valor_titulo', nome: 'Valor Nominal do Título', posicaoInicio: 86, posicaoFim: 100, tamanho: 15, tipo: 'valor', decimais: 2, tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'valor_documento' },
  { id: 'dp_agencia_cobradora', nome: 'Agência Encarregada da Cobrança', posicaoInicio: 101, posicaoFim: 105, tamanho: 5, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dp_digito_ag_cobradora', nome: 'Dígito da Agência', posicaoInicio: 106, posicaoFim: 106, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dp_especie', nome: 'Espécie do Título', posicaoInicio: 107, posicaoFim: 108, tamanho: 2, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'especie_documento' },
  { id: 'dp_aceite', nome: 'Identificação de Aceite', posicaoInicio: 109, posicaoFim: 109, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'aceite' },
  { id: 'dp_data_emissao', nome: 'Data da Emissão do Título', posicaoInicio: 110, posicaoFim: 117, tamanho: 8, tipo: 'data', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'data_documento' },
  { id: 'dp_codigo_juros', nome: 'Código do Juros de Mora', posicaoInicio: 118, posicaoFim: 118, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_data_juros', nome: 'Data do Juros de Mora', posicaoInicio: 119, posicaoFim: 126, tamanho: 8, tipo: 'data', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dp_juros_mora', nome: 'Juros de Mora por Dia/Taxa', posicaoInicio: 127, posicaoFim: 141, tamanho: 15, tipo: 'valor', decimais: 2, tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'valor_juros_dia' },
  { id: 'dp_codigo_desconto1', nome: 'Código do Desconto 1', posicaoInicio: 142, posicaoFim: 142, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_data_desconto1', nome: 'Data do Desconto 1', posicaoInicio: 143, posicaoFim: 150, tamanho: 8, tipo: 'data', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dp_valor_desconto1', nome: 'Valor/Percentual Desconto 1', posicaoInicio: 151, posicaoFim: 165, tamanho: 15, tipo: 'valor', decimais: 2, tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'desconto_abatimento' },
  { id: 'dp_valor_iof', nome: 'Valor do IOF', posicaoInicio: 166, posicaoFim: 180, tamanho: 15, tipo: 'valor', decimais: 2, tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dp_valor_abatimento', nome: 'Valor do Abatimento', posicaoInicio: 181, posicaoFim: 195, tamanho: 15, tipo: 'valor', decimais: 2, tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: true, destinoBoleto: 'desconto_abatimento' },
  { id: 'dp_uso_empresa', nome: 'Identificação do Título na Empresa', posicaoInicio: 196, posicaoFim: 220, tamanho: 25, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dp_codigo_protesto', nome: 'Código para Protesto', posicaoInicio: 221, posicaoFim: 221, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_prazo_protesto', nome: 'Número de Dias para Protesto', posicaoInicio: 222, posicaoFim: 223, tamanho: 2, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dp_codigo_baixa', nome: 'Código para Baixa/Devolução', posicaoInicio: 224, posicaoFim: 224, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dp_prazo_baixa', nome: 'Número de Dias para Baixa/Devolução', posicaoInicio: 225, posicaoFim: 227, tamanho: 3, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dp_codigo_moeda', nome: 'Código da Moeda', posicaoInicio: 228, posicaoFim: 229, tamanho: 2, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'especie_moeda' },
  { id: 'dp_numero_contrato', nome: 'Número do Contrato', posicaoInicio: 230, posicaoFim: 239, tamanho: 10, tipo: 'numerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dp_brancos2', nome: 'Brancos', posicaoInicio: 240, posicaoFim: 240, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_p', identificadorLinha: '3P', obrigatorio: false, utilizadoNoBoleto: false },

  // === DETALHE SEGMENTO Q (Tipo 3 + Q) ===
  { id: 'dq_banco', nome: 'Código do Banco', posicaoInicio: 1, posicaoFim: 3, tamanho: 3, tipo: 'numerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dq_lote', nome: 'Lote de Serviço', posicaoInicio: 4, posicaoFim: 7, tamanho: 4, tipo: 'numerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dq_tipo_registro', nome: 'Tipo de Registro', posicaoInicio: 8, posicaoFim: 8, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, conteudoPadrao: '3', utilizadoNoBoleto: false },
  { id: 'dq_sequencial', nome: 'Nº Sequencial do Registro no Lote', posicaoInicio: 9, posicaoFim: 13, tamanho: 5, tipo: 'numerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dq_segmento', nome: 'Código de Segmento', posicaoInicio: 14, posicaoFim: 14, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, conteudoPadrao: 'Q', utilizadoNoBoleto: false },
  { id: 'dq_brancos1', nome: 'Brancos', posicaoInicio: 15, posicaoFim: 15, tamanho: 1, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dq_codigo_movimento', nome: 'Código de Movimento', posicaoInicio: 16, posicaoFim: 17, tamanho: 2, tipo: 'numerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dq_tipo_inscricao_sacado', nome: 'Tipo de Inscrição do Sacado', posicaoInicio: 18, posicaoFim: 18, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dq_numero_inscricao_sacado', nome: 'CPF/CNPJ do Sacado', posicaoInicio: 19, posicaoFim: 33, tamanho: 15, tipo: 'numerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'pagador_cnpj' },
  { id: 'dq_nome_sacado', nome: 'Nome do Sacado', posicaoInicio: 34, posicaoFim: 73, tamanho: 40, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'pagador_nome' },
  { id: 'dq_endereco_sacado', nome: 'Endereço do Sacado', posicaoInicio: 74, posicaoFim: 113, tamanho: 40, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'pagador_endereco' },
  { id: 'dq_bairro_sacado', nome: 'Bairro do Sacado', posicaoInicio: 114, posicaoFim: 128, tamanho: 15, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dq_cep_sacado', nome: 'CEP do Sacado', posicaoInicio: 129, posicaoFim: 133, tamanho: 5, tipo: 'numerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'pagador_cep' },
  { id: 'dq_sufixo_cep', nome: 'Sufixo do CEP', posicaoInicio: 134, posicaoFim: 136, tamanho: 3, tipo: 'numerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'dq_cidade_sacado', nome: 'Cidade do Sacado', posicaoInicio: 137, posicaoFim: 151, tamanho: 15, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'pagador_cidade_uf' },
  { id: 'dq_uf_sacado', nome: 'UF do Sacado', posicaoInicio: 152, posicaoFim: 153, tamanho: 2, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: true, utilizadoNoBoleto: true, destinoBoleto: 'pagador_uf' },
  { id: 'dq_tipo_inscricao_sacador', nome: 'Tipo de Inscrição Sacador/Avalista', posicaoInicio: 154, posicaoFim: 154, tamanho: 1, tipo: 'numerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dq_numero_inscricao_sacador', nome: 'CPF/CNPJ Sacador/Avalista', posicaoInicio: 155, posicaoFim: 169, tamanho: 15, tipo: 'numerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dq_nome_sacador', nome: 'Nome do Sacador/Avalista', posicaoInicio: 170, posicaoFim: 209, tamanho: 40, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dq_banco_correspondente', nome: 'Código do Banco Correspondente', posicaoInicio: 210, posicaoFim: 212, tamanho: 3, tipo: 'numerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dq_nosso_num_banco_corr', nome: 'Nosso Núm. no Banco Correspondente', posicaoInicio: 213, posicaoFim: 232, tamanho: 20, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'dq_brancos2', nome: 'Brancos', posicaoInicio: 233, posicaoFim: 240, tamanho: 8, tipo: 'alfanumerico', tipoLinha: 'detalhe_segmento_q', identificadorLinha: '3Q', obrigatorio: false, utilizadoNoBoleto: false },

  // === TRAILER DO LOTE (Tipo 5) ===
  { id: 'tl_banco', nome: 'Código do Banco', posicaoInicio: 1, posicaoFim: 3, tamanho: 3, tipo: 'numerico', tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'tl_lote', nome: 'Lote de Serviço', posicaoInicio: 4, posicaoFim: 7, tamanho: 4, tipo: 'numerico', tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'tl_tipo_registro', nome: 'Tipo de Registro', posicaoInicio: 8, posicaoFim: 8, tamanho: 1, tipo: 'numerico', tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: true, conteudoPadrao: '5', utilizadoNoBoleto: false },
  { id: 'tl_brancos1', nome: 'Brancos', posicaoInicio: 9, posicaoFim: 17, tamanho: 9, tipo: 'alfanumerico', tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'tl_quantidade_registros', nome: 'Quantidade de Registros do Lote', posicaoInicio: 18, posicaoFim: 23, tamanho: 6, tipo: 'numerico', tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'tl_qtd_titulos_cobranca', nome: 'Quantidade de Títulos em Cobrança', posicaoInicio: 24, posicaoFim: 29, tamanho: 6, tipo: 'numerico', tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'tl_valor_total_titulos', nome: 'Valor Total dos Títulos em Carteira', posicaoInicio: 30, posicaoFim: 46, tamanho: 17, tipo: 'valor', decimais: 2, tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'tl_qtd_titulos_baixados', nome: 'Quantidade de Títulos Baixados', posicaoInicio: 47, posicaoFim: 52, tamanho: 6, tipo: 'numerico', tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'tl_valor_total_baixados', nome: 'Valor Total dos Títulos Baixados', posicaoInicio: 53, posicaoFim: 69, tamanho: 17, tipo: 'valor', decimais: 2, tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'tl_qtd_titulos_entrada', nome: 'Quantidade de Títulos Entrada', posicaoInicio: 70, posicaoFim: 75, tamanho: 6, tipo: 'numerico', tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'tl_valor_total_entrada', nome: 'Valor Total dos Títulos Entrada', posicaoInicio: 76, posicaoFim: 92, tamanho: 17, tipo: 'valor', decimais: 2, tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'tl_qtd_titulos_pagos', nome: 'Quantidade de Títulos Pagos', posicaoInicio: 93, posicaoFim: 98, tamanho: 6, tipo: 'numerico', tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'tl_valor_total_pagos', nome: 'Valor Total dos Títulos Pagos', posicaoInicio: 99, posicaoFim: 115, tamanho: 17, tipo: 'valor', decimais: 2, tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'tl_qtd_titulos_outros', nome: 'Quantidade de Outros Títulos', posicaoInicio: 116, posicaoFim: 121, tamanho: 6, tipo: 'numerico', tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'tl_valor_total_outros', nome: 'Valor Total Outros Títulos', posicaoInicio: 122, posicaoFim: 138, tamanho: 17, tipo: 'valor', decimais: 2, tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'tl_brancos2', nome: 'Brancos', posicaoInicio: 139, posicaoFim: 240, tamanho: 102, tipo: 'alfanumerico', tipoLinha: 'trailer_lote', identificadorLinha: '5', obrigatorio: false, utilizadoNoBoleto: false },

  // === TRAILER DO ARQUIVO (Tipo 9) ===
  { id: 'ta_banco', nome: 'Código do Banco', posicaoInicio: 1, posicaoFim: 3, tamanho: 3, tipo: 'numerico', tipoLinha: 'trailer_arquivo', identificadorLinha: '9', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'ta_lote', nome: 'Lote de Serviço', posicaoInicio: 4, posicaoFim: 7, tamanho: 4, tipo: 'numerico', tipoLinha: 'trailer_arquivo', identificadorLinha: '9', obrigatorio: true, conteudoPadrao: '9999', utilizadoNoBoleto: false },
  { id: 'ta_tipo_registro', nome: 'Tipo de Registro', posicaoInicio: 8, posicaoFim: 8, tamanho: 1, tipo: 'numerico', tipoLinha: 'trailer_arquivo', identificadorLinha: '9', obrigatorio: true, conteudoPadrao: '9', utilizadoNoBoleto: false },
  { id: 'ta_brancos1', nome: 'Brancos', posicaoInicio: 9, posicaoFim: 17, tamanho: 9, tipo: 'alfanumerico', tipoLinha: 'trailer_arquivo', identificadorLinha: '9', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'ta_qtd_lotes', nome: 'Quantidade de Lotes do Arquivo', posicaoInicio: 18, posicaoFim: 23, tamanho: 6, tipo: 'numerico', tipoLinha: 'trailer_arquivo', identificadorLinha: '9', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'ta_qtd_registros', nome: 'Quantidade de Registros do Arquivo', posicaoInicio: 24, posicaoFim: 29, tamanho: 6, tipo: 'numerico', tipoLinha: 'trailer_arquivo', identificadorLinha: '9', obrigatorio: true, utilizadoNoBoleto: false },
  { id: 'ta_qtd_contas', nome: 'Quantidade de Contas', posicaoInicio: 30, posicaoFim: 35, tamanho: 6, tipo: 'numerico', tipoLinha: 'trailer_arquivo', identificadorLinha: '9', obrigatorio: false, utilizadoNoBoleto: false },
  { id: 'ta_brancos2', nome: 'Brancos', posicaoInicio: 36, posicaoFim: 240, tamanho: 205, tipo: 'alfanumerico', tipoLinha: 'trailer_arquivo', identificadorLinha: '9', obrigatorio: false, utilizadoNoBoleto: false },
];

// Cores para tipos de linha
export const CORES_TIPO_LINHA: Record<string, { bg: string; text: string; label: string }> = {
  'header_arquivo': { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-200', label: 'Header Arquivo' },
  'header_lote': { bg: 'bg-sky-100 dark:bg-sky-900/50', text: 'text-sky-800 dark:text-sky-200', label: 'Header Lote' },
  'detalhe_segmento_p': { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200', label: 'Seg. P' },
  'detalhe_segmento_q': { bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-800 dark:text-emerald-200', label: 'Seg. Q' },
  'detalhe_segmento_r': { bg: 'bg-teal-100 dark:bg-teal-900/50', text: 'text-teal-800 dark:text-teal-200', label: 'Seg. R' },
  'trailer_lote': { bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-800 dark:text-amber-200', label: 'Trailer Lote' },
  'trailer_arquivo': { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-200', label: 'Trailer Arquivo' },
  'header': { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-200', label: 'Header' },
  'detalhe': { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200', label: 'Detalhe' },
  'detalhe_multa': { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-200', label: 'Det. Multa' },
  'trailer': { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-200', label: 'Trailer' },
};

// Cores para destaque de campos
export const CORES_CAMPOS_DESTAQUE = [
  { bg: 'bg-red-200 dark:bg-red-800', border: 'border-red-400' },
  { bg: 'bg-blue-200 dark:bg-blue-800', border: 'border-blue-400' },
  { bg: 'bg-green-200 dark:bg-green-800', border: 'border-green-400' },
  { bg: 'bg-yellow-200 dark:bg-yellow-800', border: 'border-yellow-400' },
  { bg: 'bg-purple-200 dark:bg-purple-800', border: 'border-purple-400' },
  { bg: 'bg-pink-200 dark:bg-pink-800', border: 'border-pink-400' },
  { bg: 'bg-orange-200 dark:bg-orange-800', border: 'border-orange-400' },
  { bg: 'bg-cyan-200 dark:bg-cyan-800', border: 'border-cyan-400' },
  { bg: 'bg-teal-200 dark:bg-teal-800', border: 'border-teal-400' },
  { bg: 'bg-indigo-200 dark:bg-indigo-800', border: 'border-indigo-400' },
  { bg: 'bg-lime-200 dark:bg-lime-800', border: 'border-lime-400' },
  { bg: 'bg-amber-200 dark:bg-amber-800', border: 'border-amber-400' },
];

// Detecta o tipo de linha baseado no conteúdo
export function detectarTipoLinhaCNAB(linha: string, tipoCNAB: 'CNAB_240' | 'CNAB_400'): TipoLinhaCNAB {
  if (tipoCNAB === 'CNAB_400') {
    const tipoRegistro = linha.charAt(0);
    switch (tipoRegistro) {
      case '0': return 'header';
      case '1': return 'detalhe';
      case '2': return 'detalhe_multa';
      case '9': return 'trailer';
      default: return 'detalhe';
    }
  } else {
    // CNAB 240
    const tipoRegistro = linha.charAt(7);
    const segmento = linha.charAt(13);
    
    switch (tipoRegistro) {
      case '0': return 'header_arquivo';
      case '1': return 'header_lote';
      case '3':
        switch (segmento) {
          case 'P': return 'detalhe_segmento_p';
          case 'Q': return 'detalhe_segmento_q';
          case 'R': return 'detalhe_segmento_r';
          case 'S': return 'detalhe_segmento_s';
          case 'T': return 'detalhe_segmento_t';
          case 'U': return 'detalhe_segmento_u';
          default: return 'detalhe_segmento_p';
        }
      case '5': return 'trailer_lote';
      case '9': return 'trailer_arquivo';
      default: return 'detalhe_segmento_p';
    }
  }
}

// Obtém o identificador da linha
export function obterIdentificadorLinha(linha: string, tipoCNAB: 'CNAB_240' | 'CNAB_400'): string {
  if (tipoCNAB === 'CNAB_400') {
    return linha.charAt(0);
  } else {
    const tipoRegistro = linha.charAt(7);
    if (tipoRegistro === '3') {
      return `3${linha.charAt(13)}`;
    }
    return tipoRegistro;
  }
}
