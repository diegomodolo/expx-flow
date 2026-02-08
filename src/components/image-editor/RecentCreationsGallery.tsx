import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader2, ImageIcon, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface StorageImage {
  name: string;
  url: string;
  createdAt: Date;
  size: number;
}

interface RecentCreationsGalleryProps {
  onSelectImage: (imageUrl: string) => void;
}

export function RecentCreationsGallery({ onSelectImage }: RecentCreationsGalleryProps) {
  const { activeCompany } = useCompany();
  const [images, setImages] = useState<StorageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);

  const fetchImages = async () => {
    if (!activeCompany?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar imagens do bucket ai-generated-images na pasta standalone da empresa
      const { data: standaloneFiles, error: standaloneError } = await supabase.storage
        .from('ai-generated-images')
        .list(`visual-creatives/standalone/${activeCompany.company_id}`, {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (standaloneError) {
        console.error('Error fetching standalone images:', standaloneError);
      }

      // Buscar também imagens diretas na pasta visual-creatives/{companyId}
      const { data: directFiles, error: directError } = await supabase.storage
        .from('ai-generated-images')
        .list(`visual-creatives/${activeCompany.company_id}`, {
          limit: 50,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (directError) {
        console.error('Error fetching direct images:', directError);
      }

      const allFiles: StorageImage[] = [];

      // Processar arquivos standalone
      if (standaloneFiles) {
        for (const file of standaloneFiles) {
          if (file.name && file.metadata) {
            const { data: urlData } = supabase.storage
              .from('ai-generated-images')
              .getPublicUrl(`visual-creatives/standalone/${activeCompany.company_id}/${file.name}`);

            allFiles.push({
              name: file.name,
              url: urlData.publicUrl,
              createdAt: new Date(file.created_at || Date.now()),
              size: file.metadata?.size || 0,
            });
          }
        }
      }

      // Processar arquivos diretos
      if (directFiles) {
        for (const file of directFiles) {
          if (file.name && file.metadata) {
            const { data: urlData } = supabase.storage
              .from('ai-generated-images')
              .getPublicUrl(`visual-creatives/${activeCompany.company_id}/${file.name}`);

            allFiles.push({
              name: file.name,
              url: urlData.publicUrl,
              createdAt: new Date(file.created_at || Date.now()),
              size: file.metadata?.size || 0,
            });
          }
        }
      }

      // Ordenar por data de criação (mais recente primeiro)
      allFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setImages(allFiles.slice(0, 30)); // Limitar a 30 imagens
    } catch (error) {
      console.error('Error loading recent images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [activeCompany?.company_id]);

  const handleDeleteImage = async (image: StorageImage) => {
    if (!activeCompany?.company_id) return;

    try {
      setDeletingImage(image.name);

      // Tentar deletar de ambas as pastas possíveis
      const paths = [
        `visual-creatives/standalone/${activeCompany.company_id}/${image.name}`,
        `visual-creatives/${activeCompany.company_id}/${image.name}`,
      ];

      for (const path of paths) {
        const { error } = await supabase.storage
          .from('ai-generated-images')
          .remove([path]);

        if (!error) {
          break;
        }
      }

      toast({
        title: "Imagem removida",
        description: "A imagem foi removida com sucesso.",
      });

      // Atualizar lista
      setImages((prev) => prev.filter((img) => img.name !== image.name));
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a imagem.",
        variant: "destructive",
      });
    } finally {
      setDeletingImage(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!activeCompany) {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Criações Recentes
        </h2>
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Carregando imagens...
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Criações Recentes
        </h2>
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
          <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
          <p>Nenhuma criação encontrada</p>
          <p className="text-sm">Suas imagens geradas aparecerão aqui</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Criações Recentes
        </h2>
        <span className="text-sm text-muted-foreground">
          {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
        </span>
      </div>

      <ScrollArea className="w-full whitespace-nowrap rounded-xl border bg-muted/20 p-4">
        <div className="flex gap-4">
          {images.map((image) => (
            <div
              key={image.name}
              className="group relative flex-shrink-0 w-48 rounded-lg overflow-hidden border bg-background shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div
                className="aspect-square w-full bg-muted cursor-pointer overflow-hidden"
                onClick={() => onSelectImage(image.url)}
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Overlay com ações */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onSelectImage(image.url)}
                    className="h-8"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Abrir
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                        disabled={deletingImage === image.name}
                      >
                        {deletingImage === image.name ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover imagem?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A imagem será permanentemente removida.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteImage(image)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Info */}
              <div className="p-2 border-t">
                <p className="text-xs text-muted-foreground truncate">
                  {format(image.createdAt, "dd MMM, HH:mm", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {formatFileSize(image.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
