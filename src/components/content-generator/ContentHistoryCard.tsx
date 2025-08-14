import React from "react";
import { ContentGeneration, useContentGenerations } from "@/hooks/useContentGenerations";
import { contentTypes } from "./ContentTypes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Copy, 
  Edit, 
  Trash2, 
  Calendar,
  User,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ContentHistoryCardProps {
  generation: ContentGeneration;
  onPreview: (generation: ContentGeneration) => void;
}

export function ContentHistoryCard({ generation, onPreview }: ContentHistoryCardProps) {
  const { deleteGeneration, updateGeneration } = useContentGenerations();
  const { toast } = useToast();

  const contentType = contentTypes.find(ct => ct.id === generation.content_type);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generation.generated_content);
      toast({
        title: "Copiado!",
        description: "Conteúdo copiado para a área de transferência."
      });
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o conteúdo.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    await deleteGeneration(generation.id);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'used': return 'default';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'used': return 'Usado';
      case 'archived': return 'Arquivado';
      default: return status;
    }
  };

  const previewText = generation.generated_content.substring(0, 150) + 
    (generation.generated_content.length > 150 ? '...' : '');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{contentType?.icon || '📝'}</div>
            <div>
              <h3 className="font-semibold text-lg">
                {contentType?.title || generation.content_type}
              </h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{generation.clients?.name || 'Cliente removido'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(generation.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
          <Badge variant={getStatusColor(generation.status)}>
            {getStatusLabel(generation.status)}
          </Badge>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium text-muted-foreground mb-1">Tema:</div>
          <div className="text-sm">{generation.theme}</div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-medium text-muted-foreground mb-2">Prévia do conteúdo:</div>
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            {previewText}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(generation)}
          >
            <Eye className="w-4 h-4 mr-1" />
            Ver
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4 mr-1" />
            Copiar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => updateGeneration(generation.id, { 
              status: generation.status === 'used' ? 'draft' : 'used' 
            })}
          >
            <FileText className="w-4 h-4 mr-1" />
            {generation.status === 'used' ? 'Marcar como rascunho' : 'Marcar como usado'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-1" />
                Deletar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja deletar este conteúdo? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Deletar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}