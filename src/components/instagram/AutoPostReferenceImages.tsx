import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReferenceSelectionDialog } from '@/components/clients/ReferenceSelectionDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ImageIcon, Upload, X, Import, Loader2, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AutoPostReferenceImagesProps {
  configId?: string;
  clientId?: string;
  instagramAccountId?: string;
  companyId: string;
  referenceImage1: string | null;
  referenceImage2: string | null;
  referenceImage3: string | null;
  onImagesChange: (images: { reference_image_1?: string | null; reference_image_2?: string | null; reference_image_3?: string | null }) => void;
  disabled?: boolean;
  isInline?: boolean;
}

export function AutoPostReferenceImages({
  configId,
  clientId,
  instagramAccountId,
  companyId,
  referenceImage1,
  referenceImage2,
  referenceImage3,
  onImagesChange,
  disabled = false,
  isInline = false
}: AutoPostReferenceImagesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const images = [referenceImage1, referenceImage2, referenceImage3];
  const fileInputRefs = [fileInputRef1, fileInputRef2, fileInputRef3];

  const handleFileUpload = async (file: File, slotIndex: number) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Por favor, selecione uma imagem.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 5MB.',
        variant: 'destructive'
      });
      return;
    }

    setUploading(slotIndex);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `instagram-auto-post-references/${configId || 'new'}/${Date.now()}-${slotIndex}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('ai-generated-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('ai-generated-images')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Update the correct slot
      const updateKey = `reference_image_${slotIndex + 1}` as 'reference_image_1' | 'reference_image_2' | 'reference_image_3';
      onImagesChange({ [updateKey]: imageUrl });

      toast({
        title: 'Imagem carregada!',
        description: 'A imagem de referência foi adicionada.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro ao carregar imagem',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = (slotIndex: number) => {
    const updateKey = `reference_image_${slotIndex + 1}` as 'reference_image_1' | 'reference_image_2' | 'reference_image_3';
    onImagesChange({ [updateKey]: null });
  };

  const handleImportSelect = (selectedUrls: string[]) => {
    // Fill in empty slots with selected images
    const updates: { reference_image_1?: string | null; reference_image_2?: string | null; reference_image_3?: string | null } = {};
    let urlIndex = 0;

    for (let i = 0; i < 3 && urlIndex < selectedUrls.length; i++) {
      if (!images[i]) {
        const key = `reference_image_${i + 1}` as 'reference_image_1' | 'reference_image_2' | 'reference_image_3';
        updates[key] = selectedUrls[urlIndex];
        urlIndex++;
      }
    }

    // If all slots are filled, replace from the beginning
    if (urlIndex === 0 && selectedUrls.length > 0) {
      for (let i = 0; i < selectedUrls.length && i < 3; i++) {
        const key = `reference_image_${i + 1}` as 'reference_image_1' | 'reference_image_2' | 'reference_image_3';
        updates[key] = selectedUrls[i];
      }
    }

    onImagesChange(updates);
  };

  const emptySlots = images.filter(img => !img).length;

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>A IA usará essas imagens como guia de estilo visual para gerar as postagens. Escolha imagens que representem a identidade visual desejada.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          disabled={disabled}
        >
          <Import className="w-4 h-4 mr-2" />
          Importar
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {images.map((imageUrl, index) => (
          <div
            key={index}
            className={cn(
              "relative aspect-square rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden",
              imageUrl ? "border-transparent" : "border-muted-foreground/30 hover:border-muted-foreground/50",
              disabled && "opacity-50 pointer-events-none"
            )}
          >
            {uploading === index ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Enviando...</span>
              </div>
            ) : imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt={`Referência ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-2 right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground hover:bg-destructive/80 transition-colors"
                  disabled={disabled}
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <span className="text-white text-xs font-medium">Imagem {index + 1}</span>
                </div>
              </>
            ) : (
              <button
                onClick={() => fileInputRefs[index].current?.click()}
                className="flex flex-col items-center gap-2 p-4 text-muted-foreground hover:text-foreground transition-colors"
                disabled={disabled}
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs text-center">Upload</span>
              </button>
            )}
            <input
              ref={fileInputRefs[index]}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, index);
                e.target.value = '';
              }}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Selecione até 3 imagens. Você pode fazer upload manual ou importar de anúncios/Instagram.
      </p>
    </>
  );

  return (
    <>
      {isInline ? (
        content
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="w-5 h-5" />
                  Imagens de Referência para IA
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {content}
          </CardContent>
        </Card>
      )}

      <ReferenceSelectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={clientId}
        instagramAccountId={instagramAccountId}
        companyId={companyId}
        onSelect={handleImportSelect}
        maxSelections={emptySlots > 0 ? emptySlots : 3}
      />
    </>
  );
}
