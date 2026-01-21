import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sparkles, Move, Palette, Layout, Image } from "lucide-react";

export interface VariationOptions {
  changePoseExpression: boolean;
  varyComposition: boolean;
  alterColorPalette: boolean;
  varyBackground: boolean;
}

interface VariationOptionsCardProps {
  options: VariationOptions;
  onChange: (options: VariationOptions) => void;
}

export function VariationOptionsCard({ options, onChange }: VariationOptionsCardProps) {
  const handleChange = (key: keyof VariationOptions, value: boolean) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Opções de Variação da IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="changePoseExpression"
            checked={options.changePoseExpression}
            onCheckedChange={(checked) => handleChange("changePoseExpression", !!checked)}
          />
          <Label htmlFor="changePoseExpression" className="flex items-center gap-2 cursor-pointer">
            <Move className="w-4 h-4 text-muted-foreground" />
            Mudar pose e expressão
          </Label>
        </div>

        <div className="flex items-center space-x-3">
          <Checkbox
            id="varyComposition"
            checked={options.varyComposition}
            onCheckedChange={(checked) => handleChange("varyComposition", !!checked)}
          />
          <Label htmlFor="varyComposition" className="flex items-center gap-2 cursor-pointer">
            <Layout className="w-4 h-4 text-muted-foreground" />
            Variar composição do layout
          </Label>
        </div>

        <div className="flex items-center space-x-3">
          <Checkbox
            id="alterColorPalette"
            checked={options.alterColorPalette}
            onCheckedChange={(checked) => handleChange("alterColorPalette", !!checked)}
          />
          <Label htmlFor="alterColorPalette" className="flex items-center gap-2 cursor-pointer">
            <Palette className="w-4 h-4 text-muted-foreground" />
            Alterar paleta de cores
          </Label>
        </div>

        <div className="flex items-center space-x-3">
          <Checkbox
            id="varyBackground"
            checked={options.varyBackground}
            onCheckedChange={(checked) => handleChange("varyBackground", !!checked)}
          />
          <Label htmlFor="varyBackground" className="flex items-center gap-2 cursor-pointer">
            <Image className="w-4 h-4 text-muted-foreground" />
            Variar elementos de fundo
          </Label>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          A IA manterá a identidade da pessoa/produto enquanto varia os elementos selecionados.
        </p>
      </CardContent>
    </Card>
  );
}
