import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMetaPixels } from "@/hooks/useMetaPixels";
import { Activity } from "lucide-react";

interface PixelSelectorProps {
  clientId: string;
  companyId: string;
  value?: string;
  onChange: (pixelId: string) => void;
}

export function PixelSelector({ clientId, companyId, value, onChange }: PixelSelectorProps) {
  const { pixels, loading, fetchPixels } = useMetaPixels(clientId, companyId);

  useEffect(() => {
    if (clientId && companyId) {
      fetchPixels();
    }
  }, [clientId, companyId, fetchPixels]);

  const primaryPixel = pixels?.find(p => p.is_primary);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Pixel de Conversão
      </Label>
      <Select
        value={value || ""}
        onValueChange={onChange}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Carregando pixels..." : "Selecione um pixel"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Nenhum pixel</SelectItem>
          {pixels?.map((pixel) => (
            <SelectItem key={pixel.id} value={pixel.pixel_id}>
              {pixel.pixel_name} {pixel.is_primary && "(Principal)"} - {pixel.pixel_id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Pixel usado para rastrear conversões do anúncio
        {primaryPixel && !value && (
          <span className="ml-1 text-primary cursor-pointer hover:underline" onClick={() => onChange(primaryPixel.pixel_id)}>
            → Usar pixel principal
          </span>
        )}
      </p>
    </div>
  );
}
