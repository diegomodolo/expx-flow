import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/ui/image-uploader";
import { ImageEditorModal } from "@/components/image-editor/ImageEditorModal";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wand2, Pencil, X, Film } from "lucide-react";
import { toast } from "sonner";

interface ReelsCoverSectionProps {
  coverUrl: string | null;
  onCoverChange: (url: string | null) => void;
  clientId?: string;
  companyId?: string;
  headline?: string;
  subheadline?: string;
  objective?: string;
  script?: string;
  uploadBucket?: string;
  uploadFolder?: string;
  hasCreativeFactory?: boolean;
}

export function ReelsCoverSection({
  coverUrl,
  onCoverChange,
  clientId,
  companyId,
  headline,
  subheadline,
  objective,
  script,
  uploadBucket = "client-media",
  uploadFolder,
  hasCreativeFactory = true,
}: ReelsCoverSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const handleGenerateCover = async () => {
    if (!clientId || !companyId) {
      toast.error("Informações do cliente não disponíveis");
      return;
    }

    setGenerating(true);
    try {
      const approvedText = [headline, subheadline].filter(Boolean).join('\n');

      const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
        body: {
          clientId,
          companyId,
          creativeType: 'instagram_feed',
          theme: headline || objective || 'Capa do Reels',
          approvedText: approvedText || undefined,
          context: {
            title: headline,
            description: subheadline,
            contextOnly: {
              objective,
              script,
              isReelsCover: true,
            },
          },
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onCoverChange(data.imageUrl);
        toast.success('Capa do Reels gerada com sucesso!');
      } else {
        throw new Error('Nenhuma imagem foi gerada');
      }
    } catch (error: any) {
      console.error('Error generating reels cover:', error);
      toast.error('Erro ao gerar capa: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Film className="w-4 h-4" />
        Capa do Reels
      </Label>

      {coverUrl ? (
        <div className="flex gap-4 items-start">
          <div className="relative group">
            <div className="aspect-[4/5] w-[120px] rounded-lg overflow-hidden bg-muted border">
              <img
                src={coverUrl}
                alt="Capa do Reels"
                className="w-full h-full object-cover"
              />
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onCoverChange(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <ImageUploader
              bucket={uploadBucket}
              folder={uploadFolder}
              currentImageUrl={coverUrl}
              onImageUploaded={(url) => onCoverChange(url)}
              onImageRemoved={() => onCoverChange(null)}
              className="w-full"
              compact
            />
            {hasCreativeFactory && clientId && companyId && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-7"
                  onClick={handleGenerateCover}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  Gerar com IA
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-7"
                  onClick={() => setShowEditor(true)}
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <ImageUploader
            bucket={uploadBucket}
            folder={uploadFolder}
            onImageUploaded={(url) => onCoverChange(url)}
            onImageRemoved={() => onCoverChange(null)}
            className="flex-1"
            compact
          />
          {hasCreativeFactory && clientId && companyId && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 h-7 text-xs"
              onClick={handleGenerateCover}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              Gerar Capa com IA
            </Button>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Imagem que aparecerá como capa do Reels no feed
      </p>

      {/* Image Editor Modal */}
      {coverUrl && clientId && companyId && (
        <ImageEditorModal
          open={showEditor}
          onOpenChange={setShowEditor}
          images={[coverUrl]}
          onSave={(newImages) => {
            if (newImages[0] && newImages[0] !== coverUrl) {
              onCoverChange(newImages[0]);
              toast.success('Capa do Reels atualizada!');
            }
          }}
          clientId={clientId}
          companyId={companyId}
        />
      )}
    </div>
  );
}
