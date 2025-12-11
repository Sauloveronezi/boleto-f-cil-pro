import { Building2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Banco, TipoImpressao, TIPOS_IMPRESSAO } from '@/types/boleto';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface BancoSelectorProps {
  bancos: Banco[];
  bancoSelecionado: string | null;
  tipoImpressao: TipoImpressao | null;
  onBancoChange: (bancoId: string) => void;
  onTipoImpressaoChange: (tipo: TipoImpressao) => void;
}

export function BancoSelector({
  bancos,
  bancoSelecionado,
  tipoImpressao,
  onBancoChange,
  onTipoImpressaoChange,
}: BancoSelectorProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Tipo de Origem */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">Tipo de Origem dos Dados</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Escolha o formato de leitura dos dados. CNAB 240 e 400 leem arquivos de retorno bancário.
                  API/CDS integra diretamente com sistemas ERP (SAP, etc.).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <RadioGroup
          value={tipoImpressao || ''}
          onValueChange={(value) => onTipoImpressaoChange(value as TipoImpressao)}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {Object.entries(TIPOS_IMPRESSAO).map(([key, value]) => (
            <Card
              key={key}
              className={cn(
                'cursor-pointer transition-all hover:shadow-card-hover',
                tipoImpressao === key
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-muted-foreground/30'
              )}
              onClick={() => onTipoImpressaoChange(key as TipoImpressao)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value={key} id={key} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={key} className="font-medium cursor-pointer">
                      {value.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {value.descricao}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>
      </div>

      {/* Seleção de Banco */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">Banco Emissor</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Selecione o banco que irá emitir os boletos. As configurações de juros,
                  multa e instruções serão carregadas automaticamente.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {bancos.filter(b => b.ativo).map((banco) => (
            <Card
              key={banco.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-card-hover relative',
                bancoSelecionado === banco.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-muted-foreground/30'
              )}
              onClick={() => onBancoChange(banco.id)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                {bancoSelecionado === banco.id && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  </div>
                )}
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-3">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-sm">{banco.nome_banco}</p>
                <p className="text-xs text-muted-foreground">{banco.codigo_banco}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
