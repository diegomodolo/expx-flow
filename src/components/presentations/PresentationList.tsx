import { useState } from "react";
import { ContentPresentation, usePresentations } from "@/hooks/usePresentations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { 
  Calendar, 
  Eye, 
  Link2, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Upload,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface PresentationListProps {
  presentations: ContentPresentation[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const statusConfig = {
  draft: { label: "Rascunho", variant: "secondary" as const },
  ready: { label: "Pronto", variant: "default" as const },
  published: { label: "Publicado", variant: "default" as const },
};

export function PresentationList({ presentations, isLoading, onEdit }: PresentationListProps) {
  const { toast } = useToast();
  const { deletePresentation, publishPresentation } = usePresentations();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/apresentacao/${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado!",
      description: "O link da apresentação foi copiado para a área de transferência.",
    });
  };

  const handlePublish = async (id: string) => {
    await publishPresentation.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deletePresentation.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (presentations.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma apresentação</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Comece criando sua primeira apresentação de conteúdo para enviar aos clientes.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presentations.map((presentation) => (
          <Card key={presentation.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div 
              className="h-2" 
              style={{ backgroundColor: presentation.primary_color }}
            />
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={presentation.clients?.avatar || undefined} />
                    <AvatarFallback>
                      {presentation.clients?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {presentation.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {presentation.clients?.name}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(presentation.id)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {presentation.status !== 'published' && (
                      <DropdownMenuItem onClick={() => handlePublish(presentation.id)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Publicar
                      </DropdownMenuItem>
                    )}
                    {presentation.public_token && (
                      <DropdownMenuItem onClick={() => handleCopyLink(presentation.public_token!)}>
                        <Link2 className="h-4 w-4 mr-2" />
                        Copiar Link
                      </DropdownMenuItem>
                    )}
                    {presentation.public_token && (
                      <DropdownMenuItem 
                        onClick={() => window.open(`/apresentacao/${presentation.public_token}`, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setDeletingId(presentation.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Badge variant={statusConfig[presentation.status].variant}>
                  {statusConfig[presentation.status].label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {MONTH_NAMES[presentation.month - 1]} {presentation.year}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Criado em {format(new Date(presentation.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                {presentation.view_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {presentation.view_count} views
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir apresentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os criativos e mídias serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePresentation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
