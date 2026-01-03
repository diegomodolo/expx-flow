import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Image, Upload, X, Loader2 } from "lucide-react";

interface ScheduleConfig {
  custom_image_prompt: string | null;
  reference_image_1: string | null;
  reference_image_2: string | null;
  reference_image_3: string | null;
  reference_image_4: string | null;
  reference_image_5: string | null;
  reference_image_6: string | null;
}

interface Props {
  config: ScheduleConfig;
  onConfigChange: (config: Partial<ScheduleConfig>) => void;
  clientId: string;
}

export function FabricaCriativosAvancado({ config, onConfigChange, clientId }: Props) {
  const [uploading, setUploading] = useState<number | null>(null);

  const handleImageUpload = async (file: File, index: number) => {
    setUploading(index);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}-ref-${index}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('visual-creatives')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('visual-creatives')
        .getPublicUrl(fileName);

      const fieldName = `reference_image_${index}` as keyof ScheduleConfig;
      onConfigChange({ ...config, [fieldName]: publicUrl });
      toast.success('Imagem enviada!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = (index: number) => {
    const fieldName = `reference_image_${index}` as keyof ScheduleConfig;
    onConfigChange({ ...config, [fieldName]: null });
  };

  const referenceImages = [1, 2, 3, 4, 5, 6].map(i => ({
    index: i,
    url: config[`reference_image_${i}` as keyof ScheduleConfig] as string | null,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Prompt Personalizado
          </CardTitle>
          <CardDescription>
            Instruções adicionais para a geração de imagens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Prompt de Imagem</Label>
            <Textarea
              value={config.custom_image_prompt || ''}
              onChange={(e) => onConfigChange({ ...config, custom_image_prompt: e.target.value || null })}
              placeholder="Ex: Use sempre cores vibrantes, estilo minimalista, fundo gradiente..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Este prompt será adicionado a todas as gerações de imagem
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Imagens de Referência
          </CardTitle>
          <CardDescription>
            Faça upload de até 6 imagens para manter consistência visual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {referenceImages.map(({ index, url }) => (
              <div
                key={index}
                className="aspect-square border-2 border-dashed rounded-lg relative overflow-hidden"
              >
                {url ? (
                  <>
                    <img
                      src={url}
                      alt={`Referência ${index}`}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-muted/50 transition-colors">
                    {uploading === index ? (
                      <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground">Imagem {index}</span>
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, index);
                      }}
                      disabled={uploading !== null}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Essas imagens serão usadas como referência visual para manter a identidade da marca
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
