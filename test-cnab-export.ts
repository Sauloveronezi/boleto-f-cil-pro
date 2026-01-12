
import { mapearModeloParaCNAB, mapearBoletoApiParaModelo, BoletoApiData, EmpresaData } from './src/lib/boletoMapping';
import { DadosBoleto } from './src/lib/pdfModelRenderer';
import { Banco, Cliente, ConfiguracaoBanco } from './src/types/boleto';

// Mock data
const mockBoletoApi: BoletoApiData = {
  id: '1',
  numero_nota: '12345',
  numero_cobranca: 'COB-123',
  data_emissao: '2023-10-01',
  data_vencimento: '2023-10-15',
  valor: 1500.50,
  valor_desconto: 0,
  dados_extras: {
    instrucoes: 'Não receber após vencimento',
    especie_documento: 'DM',
    aceite: 'N',
    uso_banco: 'ABC-123'
  },
  dyn_zonatransporte: 'ROTA-SP',
  dyn_nome_do_cliente: 'Cliente Teste Ltda',
  dyn_cidade: 'São Paulo',
  dyn_conta: '12345-6'
};

const mockCliente: Partial<Cliente> = {
  razao_social: 'Cliente Teste Ltda',
  cnpj: '12.345.678/0001-90',
  endereco: 'Rua das Flores, 123',
  cidade: 'São Paulo',
  estado: 'SP',
  cep: '01234-567'
};

const mockEmpresa: EmpresaData = {
  razao_social: 'Minha Empresa S.A.',
  cnpj: '98.765.432/0001-10',
  endereco: 'Av. Paulista, 1000',
  numero: '1000',
  complemento: 'Andar 10',
  cidade: 'São Paulo',
  estado: 'SP',
  cep: '01310-100'
};

const mockBanco: Partial<Banco> = {
  nome_banco: 'Banco do Brasil',
  codigo_banco: '001'
};

const mockConfig: Partial<ConfiguracaoBanco> = {
  agencia: '1234',
  conta: '56789',
  carteira: '17',
  codigo_cedente: '123456',
  convenio: '789012'
};

const mockBarcode = {
  linhaDigitavel: '00190.00009 01234.567890 00000.000000 1 89760000150050',
  codigoBarras: '00191897600001500500000012345678900000000000',
  nossoNumero: '12345678901'
};

console.log('--- Iniciando Teste de Exportação CNAB ---');

// 1. Mapear API -> Modelo
console.log('1. Mapeando API -> Modelo...');
const dadosBoleto = mapearBoletoApiParaModelo(
  mockBoletoApi,
  mockCliente,
  mockEmpresa,
  mockBanco,
  mockConfig,
  mockBarcode
);

console.log('Dados Boleto (Parcial):', {
  pagador_nome: dadosBoleto.pagador_nome,
  dyn_zonatransporte: dadosBoleto.dyn_zonatransporte,
  uso_banco: dadosBoleto.uso_banco
});

// 2. Mapear Modelo -> CNAB
console.log('2. Mapeando Modelo -> CNAB...');
const registroCNAB = mapearModeloParaCNAB(dadosBoleto);

// 3. Verificação
console.log('3. Verificando campos...');
const camposParaVerificar = [
  'nome_sacado',
  'cnpj_sacado',
  'valor',
  'dyn_zonatransporte', // Campo dinâmico
  'uso_banco',          // Mapeado de dyn ou extra
  'nosso_numero'
];

let sucesso = true;
camposParaVerificar.forEach(campo => {
  const valor = registroCNAB[campo];
  console.log(`Campo '${campo}': '${valor}'`);
  if (valor === undefined) {
    console.error(`ERRO: Campo '${campo}' não encontrado no registro CNAB!`);
    sucesso = false;
  }
});

if (sucesso) {
  console.log('--- Teste Concluído com SUCESSO! ---');
} else {
  console.error('--- Teste FALHOU! ---');
  process.exit(1);
}
