import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Upload, Loader2, X } from "lucide-react";

interface ImageUploaderProps {
  bucket: string;
  folder?: string;
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved?: () => void;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
}

export const ImageUploader = ({
  bucket,
  folder,
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  maxSize = 5,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
  className = "",
}: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: `Por favor, selecione um arquivo ${acceptedTypes.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo deve ter no máximo ${maxSize}MB`,
        variant: "destructive",
      });
      return;
    }

    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    if (!user) return;

    try {
      setUploading(true);

      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = folder 
        ? `${folder}/${fileName}`
        : `${user.id}/${fileName}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting existing files
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setPreview(publicUrl);
      onImageUploaded(publicUrl);

      toast({
        title: "Upload realizado!",
        description: "Imagem enviada com sucesso.",
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar a imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    try {
      setPreview(null);
      onImageRemoved?.();

      toast({
        title: "Imagem removida",
        description: "A imagem foi removida com sucesso.",
      });

    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a imagem.",
        variant: "destructive",
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="relative group">
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="w-24 h-24 rounded-full object-cover border-2 border-border shadow-sm"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-1 -right-1 h-7 w-7 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div 
            className="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50 cursor-pointer hover:border-primary/50 hover:bg-muted transition-colors"
            onClick={triggerFileInput}
          >
            <Upload className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={triggerFileInput}
          disabled={uploading}
          className="text-xs"
        >
          {uploading ? (
            <>
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-3 w-3 mr-1.5" />
              {preview ? "Alterar" : "Enviar"} Imagem
            </>
          )}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          JPG, PNG, WebP • Máx. {maxSize}MB
        </p>
      </div>
    </div>
  );
};