import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useYouTubeThumbnails, ThumbnailConfig } from "@/hooks/useYouTubeThumbnails";
import { 
  Loader2, 
  Upload, 
  X, 
  Image as ImageIcon, 
  User, 
  Palette,
  Save,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface YouTubeThumbnailConfigProps {
  clientId: string;
  companyId: string;
}

export function YouTubeThumbnailConfig({ clientId, companyId }: YouTubeThumbnailConfigProps) {
  const { config, loading, saving, uploadImage, saveConfig } = useYouTubeThumbnails(clientId, companyId);
  
  const [modelPhotos, setModelPhotos] = useState<string[]>(config?.model_photos || []);
  const [referenceThumbnails, setReferenceThumbnails] = useState<string[]>(config?.reference_thumbnails || []);
  const [styleNotes, setStyleNotes] = useState(config?.style_notes || "");
  const [uploading, setUploading] = useState<'model' | 'reference' | null>(null);
  
  const modelInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  // Sync state when config loads
  useState(() => {
    if (config) {
      setModelPhotos(config.model_photos);
      setReferenceThumbnails(config.reference_thumbnails);
      setStyleNotes(config.style_notes || "");
    }
  });

  const handleUpload = async (file: File, type: 'model' | 'reference') => {
    setUploading(type);
    const url = await uploadImage(file, type);
    if (url) {
      if (type === 'model') {
        setModelPhotos(prev => [...prev, url]);
      } else {
        setReferenceThumbnails(prev => [...prev, url]);
      }
    }
    setUploading(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'model' | 'reference') => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file, type);
    }
    e.target.value = '';
  };

  const removePhoto = (index: number, type: 'model' | 'reference') => {
    if (type === 'model') {
      setModelPhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setReferenceThumbnails(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    await saveConfig({
      model_photos: modelPhotos,
      reference_thumbnails: referenceThumbnails,
      style_notes: styleNotes || null,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Como funciona a geração de thumbnails</p>
              <p className="text-blue-700 dark:text-blue-300">
                Configure fotos do modelo (pessoa que aparecerá) e thumbnails de referência (estilo visual).
                Ao gerar uma thumbnail em um roteiro, a IA usará essas referências para criar uma imagem personalizada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Model Photos */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Fotos do Modelo</CardTitle>
            </div>
            <CardDescription>
              Adicione fotos da pessoa que aparecerá nas thumbnails (até 5 fotos)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {modelPhotos.map((photo, index) => (
                <div key={index} className="relative aspect-square group">
                  <img
                    src={photo}
                    alt={`Modelo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(index, 'model')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {modelPhotos.length < 5 && (
                <button
                  onClick={() => modelInputRef.current?.click()}
                  disabled={uploading === 'model'}
                  className={cn(
                    "aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2",
                    "hover:border-primary hover:bg-primary/5 transition-colors",
                    "text-muted-foreground hover:text-primary",
                    uploading === 'model' && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {uploading === 'model' ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6" />
                      <span className="text-xs">Adicionar</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={modelInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'model')}
            />
          </CardContent>
        </Card>

        {/* Reference Thumbnails */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Thumbnails de Referência</CardTitle>
            </div>
            <CardDescription>
              Adicione thumbnails de outros vídeos como inspiração visual (até 10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {referenceThumbnails.map((thumb, index) => (
                <div key={index} className="relative aspect-video group">
                  <img
                    src={thumb}
                    alt={`Referência ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(index, 'reference')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {referenceThumbnails.length < 10 && (
                <button
                  onClick={() => referenceInputRef.current?.click()}
                  disabled={uploading === 'reference'}
                  className={cn(
                    "aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2",
                    "hover:border-primary hover:bg-primary/5 transition-colors",
                    "text-muted-foreground hover:text-primary",
                    uploading === 'reference' && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {uploading === 'reference' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-xs">Adicionar</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={referenceInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'reference')}
            />
          </CardContent>
        </Card>
      </div>

      {/* Style Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notas de Estilo (Opcional)</CardTitle>
          <CardDescription>
            Descreva o estilo visual desejado para as thumbnails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={styleNotes}
            onChange={(e) => setStyleNotes(e.target.value)}
            placeholder="Ex: Usar cores vibrantes, texto grande e legível, expressões faciais impactantes..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
