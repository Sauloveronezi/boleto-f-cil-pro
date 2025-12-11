import { Card, CardContent } from '@/components/ui/card';
import { NotaFiscal, Cliente, Banco, ConfiguracaoBanco } from '@/types/boleto';

interface BoletoPreviewProps {
  nota: NotaFiscal | null;
  cliente: Cliente | null;
  banco: Banco | null;
  configuracao?: ConfiguracaoBanco;
  campos?: Record<string, string>;
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

function formatarData(data: string): string {
  if (!data) return '--/--/----';
  try {
    return new Date(data).toLocaleDateString('pt-BR');
  } catch {
    return data;
  }
}

export function BoletoPreview({ nota, cliente, banco, configuracao, campos }: BoletoPreviewProps) {
  // Usar campos extraídos ou dados do cliente/nota
  const razaoSocial = campos?.razao_social || campos?.nome_sacado || cliente?.razao_social || 'RAZÃO SOCIAL DO PAGADOR';
  const cnpj = campos?.cnpj || campos?.cnpj_sacado || cliente?.cnpj || '00.000.000/0001-00';
  const endereco = campos?.endereco || campos?.endereco_sacado || cliente?.endereco || 'ENDEREÇO DO PAGADOR';
  const cidade = campos?.cidade || cliente?.cidade || 'CIDADE';
  const estado = campos?.estado || cliente?.estado || 'UF';
  const cep = campos?.cep || campos?.cep_sacado || cliente?.cep || '00000-000';
  
  const valor = campos?.valor || (nota?.valor_titulo ? formatarMoeda(nota.valor_titulo) : 'R$ 0,00');
  const vencimento = campos?.vencimento || campos?.data_vencimento || (nota?.data_vencimento ? formatarData(nota.data_vencimento) : '--/--/----');
  const nossoNumero = campos?.nosso_numero || nota?.referencia_interna || '00000000000';
  const numeroDoc = campos?.numero_nota || campos?.numero_documento || nota?.numero_nota || '000000';
  const dataEmissao = nota?.data_emissao ? formatarData(nota.data_emissao) : formatarData(new Date().toISOString());

  const codigoBanco = banco?.codigo_banco || '000';
  const nomeBanco = banco?.nome_banco || 'BANCO';
  const carteira = configuracao?.carteira || campos?.carteira || '17';
  const agencia = configuracao?.agencia || campos?.agencia || '0000';
  const conta = configuracao?.conta || campos?.conta || '00000';
  const codigoCedente = configuracao?.codigo_cedente || '000000';

  return (
    <Card className="bg-white border-2 border-border shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {/* Header do Banco */}
        <div className="bg-primary text-primary-foreground p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center font-bold text-lg">
              {codigoBanco}
            </div>
            <span className="font-semibold">{nomeBanco}</span>
          </div>
          <span className="text-xs opacity-80">FICHA DE COMPENSAÇÃO</span>
        </div>

        {/* Linha Digitável */}
        <div className="bg-muted/50 p-2 border-b">
          <p className="font-mono text-sm text-center tracking-wider">
            {codigoBanco}9.00000 00000.000000 00000.000000 0 00000000000000
          </p>
        </div>

        {/* Corpo do Boleto */}
        <div className="p-4 space-y-3 text-sm">
          {/* Local de Pagamento */}
          <div className="border rounded p-2">
            <p className="text-xs text-muted-foreground">Local de Pagamento</p>
            <p className="font-medium">PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO</p>
          </div>

          {/* Beneficiário */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 border rounded p-2">
              <p className="text-xs text-muted-foreground">Beneficiário</p>
              <p className="font-medium truncate">EMPRESA CEDENTE LTDA</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-xs text-muted-foreground">Agência/Código</p>
              <p className="font-medium">{agencia} / {codigoCedente}</p>
            </div>
          </div>

          {/* Dados do Documento */}
          <div className="grid grid-cols-5 gap-2">
            <div className="border rounded p-2">
              <p className="text-xs text-muted-foreground">Data Doc.</p>
              <p className="font-medium text-xs">{dataEmissao}</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-xs text-muted-foreground">Nº Documento</p>
              <p className="font-medium text-xs">{numeroDoc}</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-xs text-muted-foreground">Espécie</p>
              <p className="font-medium text-xs">DM</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-xs text-muted-foreground">Aceite</p>
              <p className="font-medium text-xs">N</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-xs text-muted-foreground">Data Proc.</p>
              <p className="font-medium text-xs">{formatarData(new Date().toISOString())}</p>
            </div>
          </div>

          {/* Carteira, Moeda, Valor */}
          <div className="grid grid-cols-5 gap-2">
            <div className="border rounded p-2">
              <p className="text-xs text-muted-foreground">Uso Banco</p>
              <p className="font-medium text-xs">&nbsp;</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-xs text-muted-foreground">Carteira</p>
              <p className="font-medium text-xs">{carteira}</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-xs text-muted-foreground">Moeda</p>
              <p className="font-medium text-xs">R$</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-xs text-muted-foreground">Qtd.</p>
              <p className="font-medium text-xs">&nbsp;</p>
            </div>
            <div className="border rounded p-2 bg-primary/5">
              <p className="text-xs text-muted-foreground">(=) Valor</p>
              <p className="font-bold text-xs text-primary">{valor}</p>
            </div>
          </div>

          {/* Nosso Número e Vencimento */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1 border rounded p-2">
              <p className="text-xs text-muted-foreground">Nosso Número</p>
              <p className="font-medium">{nossoNumero}</p>
            </div>
            <div className="border rounded p-2 bg-destructive/5">
              <p className="text-xs text-muted-foreground">Vencimento</p>
              <p className="font-bold text-destructive">{vencimento}</p>
            </div>
            <div className="border rounded p-2">
              <p className="text-xs text-muted-foreground">Valor Cobrado</p>
              <p className="font-medium">&nbsp;</p>
            </div>
          </div>

          {/* Pagador (Sacado) */}
          <div className="border rounded p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Pagador</p>
            <p className="font-semibold">{razaoSocial}</p>
            <p className="text-xs text-muted-foreground">CNPJ/CPF: {cnpj}</p>
            <p className="text-xs text-muted-foreground">{endereco} - {cidade}/{estado} - CEP: {cep}</p>
          </div>

          {/* Instruções */}
          <div className="border rounded p-2">
            <p className="text-xs text-muted-foreground">Instruções</p>
            <p className="text-xs">
              {configuracao?.texto_instrucao_padrao || 'Não receber após o vencimento. Cobrar juros de mora de 1% ao mês e multa de 2%.'}
            </p>
          </div>

          {/* Código de Barras Simulado */}
          <div className="border rounded p-2 mt-3">
            <div className="flex gap-[2px]">
              {Array.from({ length: 44 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-foreground h-10"
                  style={{ width: Math.random() > 0.3 ? '2px' : '1px' }}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
