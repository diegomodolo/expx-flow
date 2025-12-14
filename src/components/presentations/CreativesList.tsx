import { usePresentationDetails, PresentationCreative } from "@/hooks/usePresentations";
import { useCreatives } from "@/hooks/useCreatives";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GripVertical, 
  Image, 
  Film, 
  LayoutGrid, 
  PlayCircle, 
  Pencil, 
  Trash2,
  Calendar,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface CreativesListProps {
  presentationId: string;
  onEdit: (id: string) => void;
}

const creativeTypeConfig = {
  post_unico: { 
    label: "Post Único", 
    icon: Image, 
    color: "bg-blue-500/10 text-blue-600" 
  },
  carrossel: { 
    label: "Carrossel", 
    icon: LayoutGrid, 
    color: "bg-purple-500/10 text-purple-600" 
  },
  reels: { 
    label: "Reels", 
    icon: PlayCircle, 
    color: "bg-pink-500/10 text-pink-600" 
  },
  stories: { 
    label: "Stories", 
    icon: Film, 
    color: "bg-orange-500/10 text-orange-600" 
  },
};

export function CreativesList({ presentationId, onEdit }: CreativesListProps) {
  const { data, isLoading } = usePresentationDetails(presentationId);
  const { deleteCreative } = useCreatives(presentationId);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deletingId) {
      await deleteCreative.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const creatives = data?.creatives || [];

  if (creatives.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Image className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum criativo</h3>
          <p className="text-muted-foreground max-w-sm">
            Adicione criativos à sua apresentação clicando no botão "Novo Criativo" acima.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {creatives.map((creative, index) => {
          const config = creativeTypeConfig[creative.creative_type];
          const Icon = config.icon;
          const firstMedia = creative.creative_media?.[0];

          return (
            <Card key={creative.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-4 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground cursor-grab">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-sm font-medium w-6 text-center">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {firstMedia ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {firstMedia.media_type === 'image' ? (
                        <img 
                          src={firstMedia.media_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video 
                          src={firstMedia.media_url}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={config.color} variant="secondary">
                        <Icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      {creative.creative_media && creative.creative_media.length > 1 && (
                        <span className="text-xs text-muted-foreground">
                          {creative.creative_media.length} mídias
                        </span>
                      )}
                    </div>
                    
                    <p className="font-medium text-foreground line-clamp-1">
                      {creative.headline || "Sem headline"}
                    </p>
                    
                    {creative.scheduled_date && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(creative.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {creative.scheduled_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {creative.scheduled_time.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onEdit(creative.id)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setDeletingId(creative.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir criativo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as mídias do criativo serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
