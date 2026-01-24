import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Palette, Users, Image, LayoutGrid, Lightbulb } from "lucide-react";

export interface VisualVariationOptions {
  alterColorPalette: boolean;
  alterCharacters: boolean;
  alterBackground: boolean;
  alterLayout: boolean;
}

export const defaultVisualVariations: VisualVariationOptions = {
  alterColorPalette: false,
  alterCharacters: false,
  alterBackground: false,
  alterLayout: false,
};

interface VisualVariationOptionsCardProps {
  options: VisualVariationOptions;
  onChange: (options: VisualVariationOptions) => void;
}

export function VisualVariationOptionsCard({
  options,
  onChange,
}: VisualVariationOptionsCardProps) {
  const handleChange = (key: keyof VisualVariationOptions, value: boolean) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="w-4 h-4 text-primary" />
          Configurações de Variação Visual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="alter-color-palette"
              checked={options.alterColorPalette}
              onCheckedChange={(checked) =>
                handleChange("alterColorPalette", checked === true)
              }
            />
            <div className="flex-1">
              <Label htmlFor="alter-color-palette" className="flex items-center gap-2 cursor-pointer">
                <Palette className="w-4 h-4 text-muted-foreground" />
                Alterar paleta de cores
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inverte/troca as cores principais da imagem
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="alter-characters"
              checked={options.alterCharacters}
              onCheckedChange={(checked) =>
                handleChange("alterCharacters", checked === true)
              }
            />
            <div className="flex-1">
              <Label htmlFor="alter-characters" className="flex items-center gap-2 cursor-pointer">
                <Users className="w-4 h-4 text-muted-foreground" />
                Alterar personagens/pessoas
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Substitui pessoas que aparecem nas imagens
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="alter-background"
              checked={options.alterBackground}
              onCheckedChange={(checked) =>
                handleChange("alterBackground", checked === true)
              }
            />
            <div className="flex-1">
              <Label htmlFor="alter-background" className="flex items-center gap-2 cursor-pointer">
                <Image className="w-4 h-4 text-muted-foreground" />
                Alterar elementos de fundo
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Troca ícones, formas e elementos decorativos
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="alter-layout"
              checked={options.alterLayout}
              onCheckedChange={(checked) =>
                handleChange("alterLayout", checked === true)
              }
            />
            <div className="flex-1">
              <Label htmlFor="alter-layout" className="flex items-center gap-2 cursor-pointer">
                <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                Alterar disposição dos elementos
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Reposiciona textos e blocos visuais
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs">
          <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            Se nenhuma opção estiver marcada, a imagem será reproduzida fielmente à referência, apenas com o novo texto.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
