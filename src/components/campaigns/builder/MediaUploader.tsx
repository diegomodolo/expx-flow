import { useState, useCallback } from 'react';
import { Upload, X, Image, Film, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MediaUploaderProps {
  mediaUrls: string[];
  onChange: (urls: string[]) => void;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  maxFiles?: number;
}

export function MediaUploader({
  mediaUrls,
  onChange,
  type,
  maxFiles = type === 'CAROUSEL' ? 10 : 1,
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const acceptTypes = type === 'VIDEO' 
    ? 'video/mp4,video/mov,video/avi'
    : 'image/jpeg,image/png,image/webp,image/gif';

  const handleUpload = useCallback(async (files: FileList) => {
    if (files.length === 0) return;

    const filesToUpload = Array.from(files).slice(0, maxFiles - mediaUrls.length);
    if (filesToUpload.length === 0) {
      toast({
        title: 'Limite atingido',
        description: `Máximo de ${maxFiles} arquivo(s) permitido(s)`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `campaign-creatives/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('scheduled-posts-media')
          .upload(filePath, file, { 
            contentType: file.type,
            upsert: false 
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('scheduled-posts-media')
          .getPublicUrl(filePath);

        newUrls.push(urlData.publicUrl);
      }

      onChange([...mediaUrls, ...newUrls]);
      toast({
        title: 'Upload concluído',
        description: `${newUrls.length} arquivo(s) enviado(s)`,
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        title: 'Erro no upload',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }, [mediaUrls, onChange, maxFiles, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeMedia = (index: number) => {
    onChange(mediaUrls.filter((_, i) => i !== index));
  };

  const canAddMore = mediaUrls.length < maxFiles;

  return (
    <div className="space-y-3">
      {/* Preview grid */}
      {mediaUrls.length > 0 && (
        <div className={cn(
          'grid gap-2',
          type === 'CAROUSEL' ? 'grid-cols-5' : 'grid-cols-1'
        )}>
          {mediaUrls.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square rounded-lg overflow-hidden border bg-muted group"
            >
              {type === 'VIDEO' ? (
                <video
                  src={url}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              <button
                onClick={() => removeMedia(index)}
                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              {type === 'CAROUSEL' && (
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-xs bg-black/60 text-white">
                  {index + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {canAddMore && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            uploading && 'opacity-50 pointer-events-none'
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Enviando...</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-2">
                {type === 'VIDEO' ? (
                  <Film className="h-10 w-10 text-muted-foreground" />
                ) : (
                  <Image className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Arraste {type === 'VIDEO' ? 'vídeos' : 'imagens'} aqui ou
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = acceptTypes;
                  input.multiple = type === 'CAROUSEL';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) handleUpload(files);
                  };
                  input.click();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar arquivo
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {type === 'CAROUSEL' 
                  ? `${mediaUrls.length}/${maxFiles} arquivos`
                  : type === 'VIDEO'
                  ? 'MP4, MOV ou AVI'
                  : 'JPG, PNG, WebP ou GIF'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
