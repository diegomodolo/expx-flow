import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, Loader2, Image, Video, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type ContentType = 'image' | 'video' | 'carousel' | 'reel';

interface MediaUploaderProps {
  contentType: ContentType;
  mediaUrls: string[];
  onMediaChange: (urls: string[]) => void;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_CAROUSEL_ITEMS = 10;

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  contentType,
  mediaUrls,
  onMediaChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptedTypes = () => {
    switch (contentType) {
      case 'image':
        return ACCEPTED_IMAGE_TYPES.join(',');
      case 'video':
      case 'reel':
        return ACCEPTED_VIDEO_TYPES.join(',');
      case 'carousel':
        return [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(',');
      default:
        return ACCEPTED_IMAGE_TYPES.join(',');
    }
  };

  const canAddMore = () => {
    if (contentType === 'carousel') {
      return mediaUrls.length < MAX_CAROUSEL_ITEMS;
    }
    return mediaUrls.length === 0;
  };

  const isMultiple = contentType === 'carousel';

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const filesToUpload = Array.from(files);
    
    // Validar quantidade
    if (contentType !== 'carousel' && filesToUpload.length > 1) {
      toast({
        title: 'Limite de arquivos',
        description: 'Apenas 1 arquivo permitido para este tipo de conteúdo',
        variant: 'destructive',
      });
      return;
    }

    if (contentType === 'carousel' && mediaUrls.length + filesToUpload.length > MAX_CAROUSEL_ITEMS) {
      toast({
        title: 'Limite de arquivos',
        description: `Máximo de ${MAX_CAROUSEL_ITEMS} itens no carrossel`,
        variant: 'destructive',
      });
      return;
    }

    // Validar tipos
    const acceptedTypes = contentType === 'carousel' 
      ? [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES]
      : contentType === 'image' 
        ? ACCEPTED_IMAGE_TYPES 
        : ACCEPTED_VIDEO_TYPES;

    for (const file of filesToUpload) {
      if (!acceptedTypes.includes(file.type)) {
        toast({
          title: 'Tipo de arquivo inválido',
          description: `O arquivo "${file.name}" não é suportado`,
          variant: 'destructive',
        });
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Arquivo muito grande',
          description: `O arquivo "${file.name}" excede o limite de 100MB`,
          variant: 'destructive',
        });
        return;
      }
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `posts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('scheduled-posts-media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('scheduled-posts-media')
          .getPublicUrl(filePath);

        newUrls.push(urlData.publicUrl);
      }

      onMediaChange([...mediaUrls, ...newUrls]);
      toast({
        title: 'Upload concluído',
        description: `${newUrls.length} arquivo(s) enviado(s) com sucesso`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar o arquivo. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveMedia = (index: number) => {
    onMediaChange(mediaUrls.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const isVideo = (url: string) => {
    return url.match(/\.(mp4|webm|mov|quicktime)$/i);
  };

  return (
    <div className="space-y-3">
      {/* Media previews */}
      {mediaUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {mediaUrls.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
              {isVideo(url) ? (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
              ) : (
                <img 
                  src={url} 
                  alt={`Media ${index + 1}`} 
                  className="w-full h-full object-cover"
                />
              )}
              <button
                onClick={() => handleRemoveMedia(index)}
                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          
          {/* Add more button for carousel */}
          {canAddMore() && contentType === 'carousel' && (
            <button
              onClick={triggerFileInput}
              disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <Plus className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Upload area */}
      {canAddMore() && (contentType !== 'carousel' || mediaUrls.length === 0) && (
        <div
          onClick={triggerFileInput}
          className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-6 text-center cursor-pointer transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {uploading ? 'Enviando...' : 'Clique para fazer upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {contentType === 'image' && 'JPG, PNG, WebP ou GIF'}
            {contentType === 'video' && 'MP4, WebM ou MOV'}
            {contentType === 'reel' && 'MP4, WebM ou MOV (vertical)'}
            {contentType === 'carousel' && 'Imagens ou vídeos (até 10)'}
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptedTypes()}
        multiple={isMultiple}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
