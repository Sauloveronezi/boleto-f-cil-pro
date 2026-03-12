import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Palette } from 'lucide-react';

interface ColorSwatch {
  label: string;
  cssVar: string;
  hex: string;
  pantone?: string;
}

const paletaInstitucional: ColorSwatch[] = [
  { label: 'Verde Escuro', cssVar: '--vv-green-dark', hex: '#154734', pantone: '3435C' },
  { label: 'Verde Médio', cssVar: '--vv-green-mid', hex: '#00754A', pantone: '3415C' },
  { label: 'Verde Claro', cssVar: '--vv-green-light', hex: '#A1C342', pantone: '7480C' },
];

const paletaTerrosos: ColorSwatch[] = [
  { label: 'Marrom', cssVar: '--vv-brown', hex: '#673E24', pantone: '469C' },
  { label: 'Bege', cssVar: '--vv-beige', hex: '#D5BA8C', pantone: '467C' },
  { label: 'Bege Claro', cssVar: '--vv-beige-light', hex: '#E0D0A6', pantone: '7500C' },
];

const paletaQuentes: ColorSwatch[] = [
  { label: 'Laranja', cssVar: '--vv-orange', hex: '#FFA400', pantone: '137C' },
  { label: 'Laranja Escuro', cssVar: '--vv-orange-dark', hex: '#E65300', pantone: '166C' },
];

const paletaVibrantes: ColorSwatch[] = [
  { label: 'Pink', cssVar: '--vv-pink', hex: '#DF1683', pantone: '219C' },
  { label: 'Vermelho', cssVar: '--vv-red', hex: '#D50037', pantone: '206C' },
];

interface SemanticToken {
  label: string;
  cssVar: string;
  usage: string;
}

const tokensMenu: SemanticToken[] = [
  { label: 'Header (fundo)', cssVar: '--header-bg', usage: 'Barra superior do sistema' },
  { label: 'Header (texto)', cssVar: '--header-foreground', usage: 'Texto e ícones do header' },
  { label: 'Sidebar (fundo)', cssVar: '--sidebar-background', usage: 'Menu lateral esquerdo' },
  { label: 'Sidebar (texto)', cssVar: '--sidebar-foreground', usage: 'Texto do menu lateral' },
  { label: 'Sidebar (ativo)', cssVar: '--sidebar-accent', usage: 'Item selecionado no menu' },
  { label: 'Sidebar (ativo texto)', cssVar: '--sidebar-accent-foreground', usage: 'Texto do item ativo' },
];

const tokensRegras: SemanticToken[] = [
  { label: 'Sucesso', cssVar: '--success', usage: 'Confirmações, status positivos' },
  { label: 'Alerta', cssVar: '--warning', usage: 'Avisos, pendências' },
  { label: 'Erro / Destrutivo', cssVar: '--destructive', usage: 'Erros, exclusões, ações perigosas' },
  { label: 'Informação', cssVar: '--info', usage: 'Dicas, informações auxiliares' },
];

const tokensGerais: SemanticToken[] = [
  { label: 'Primária', cssVar: '--primary', usage: 'Botões, links, destaques principais' },
  { label: 'Secundária', cssVar: '--secondary', usage: 'Botões secundários, fundos alternativos' },
  { label: 'Acento', cssVar: '--accent', usage: 'Destaques visuais, badges' },
  { label: 'Fundo', cssVar: '--background', usage: 'Fundo geral das páginas' },
  { label: 'Card', cssVar: '--card', usage: 'Fundo dos cartões e painéis' },
  { label: 'Bordas', cssVar: '--border', usage: 'Linhas divisórias e bordas' },
  { label: 'Texto secundário', cssVar: '--muted-foreground', usage: 'Texto de menor destaque' },
];

function SwatchGrid({ colors }: { colors: ColorSwatch[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {colors.map((c) => (
        <div key={c.cssVar} className="text-center space-y-1">
          <div
            className="w-full aspect-square rounded-lg border border-border shadow-sm"
            style={{ backgroundColor: c.hex }}
          />
          <p className="text-xs font-medium text-foreground">{c.label}</p>
          <p className="text-[10px] text-muted-foreground font-mono">{c.hex}</p>
          {c.pantone && (
            <p className="text-[10px] text-muted-foreground">PANTONE {c.pantone}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function TokenTable({ tokens }: { tokens: SemanticToken[] }) {
  return (
    <div className="space-y-2">
      {tokens.map((t) => (
        <div key={t.cssVar} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50">
          <div
            className="w-8 h-8 rounded-md border border-border flex-shrink-0"
            style={{ backgroundColor: `hsl(var(${t.cssVar}))` }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t.label}</p>
            <p className="text-xs text-muted-foreground truncate">{t.usage}</p>
          </div>
          <code className="text-[10px] text-muted-foreground font-mono hidden sm:block">
            {t.cssVar}
          </code>
        </div>
      ))}
    </div>
  );
}

export function GuiaCoresConfig() {
  return (
    <div className="space-y-6">
      {/* Paleta Base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Paleta de Cores — Vida Veg
          </CardTitle>
          <CardDescription>
            Cores institucionais do manual de marca. Altere os valores em <code className="text-xs bg-muted px-1 rounded">src/index.css</code> para personalizar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Verdes Institucionais</h4>
            <SwatchGrid colors={paletaInstitucional} />
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Terrosos</h4>
            <SwatchGrid colors={paletaTerrosos} />
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Quentes</h4>
            <SwatchGrid colors={paletaQuentes} />
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Vibrantes</h4>
            <SwatchGrid colors={paletaVibrantes} />
          </div>
        </CardContent>
      </Card>

      {/* Tokens por categoria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cores do Menu</CardTitle>
          <CardDescription>Header e sidebar — navegação principal</CardDescription>
        </CardHeader>
        <CardContent>
          <TokenTable tokens={tokensMenu} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cores de Regras e Status</CardTitle>
          <CardDescription>Feedback visual: sucesso, alerta, erro, informação</CardDescription>
        </CardHeader>
        <CardContent>
          <TokenTable tokens={tokensRegras} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações Gerais de Cor</CardTitle>
          <CardDescription>Cores de fundo, texto, bordas e destaques</CardDescription>
        </CardHeader>
        <CardContent>
          <TokenTable tokens={tokensGerais} />
        </CardContent>
      </Card>
    </div>
  );
}
