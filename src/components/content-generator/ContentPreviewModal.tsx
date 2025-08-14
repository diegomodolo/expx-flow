import React, { useState } from "react";
import { ContentGeneration, useContentGenerations } from "@/hooks/useContentGenerations";
import { contentTypes } from "./ContentTypes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Copy, 
  Save, 
  Calendar,
  User,
  Tag,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  generation: ContentGeneration;
}

export function ContentPreviewModal({ isOpen, onClose, generation }: ContentPreviewModalProps) {
  const { updateGeneration } = useContentGenerations();
  const { toast } = useToast();
  const [editedContent, setEditedContent] = useState(generation.generated_content);
  const [editedStatus, setEditedStatus] = useState(generation.status);
  const [isEditing, setIsEditing] = useState(false);

  const contentType = contentTypes.find(ct => ct.id === generation.content_type);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
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

  const handleSave = async () => {
    if (editedContent !== generation.generated_content || editedStatus !== generation.status) {
      await updateGeneration(generation.id, {
        generated_content: editedContent,
        status: editedStatus
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(generation.generated_content);
    setEditedStatus(generation.status);
    setIsEditing(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">{contentType?.icon || '📝'}</span>
            <div>
              <div className="text-lg font-semibold">
                {contentType?.title || generation.content_type}
              </div>
              <div className="text-sm text-muted-foreground font-normal">
                Gerado em {formatDate(generation.created_at)}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do conteúdo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Cliente:</strong> {generation.clients?.name || 'Cliente removido'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Tema:</strong> {generation.theme}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Criado:</strong> {formatDate(generation.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Status:</strong>
              </span>
              {isEditing ? (
                <Select value={editedStatus} onValueChange={setEditedStatus}>
                  <SelectTrigger className="w-32 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="used">Usado</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={getStatusColor(editedStatus)}>
                  {getStatusLabel(editedStatus)}
                </Badge>
              )}
            </div>
          </div>

          {/* Conteúdo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Conteúdo Gerado</Label>
              <div className="flex gap-2">
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copiar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Salvar
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[300px] text-sm"
                placeholder="Conteúdo gerado..."
              />
            ) : (
              <div className="border rounded-md p-4 bg-background min-h-[300px]">
                <pre className="whitespace-pre-wrap text-sm font-sans">
                  {editedContent}
                </pre>
              </div>
            )}
          </div>

          {/* Estatísticas do conteúdo */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{editedContent.length}</div>
              <div className="text-xs text-muted-foreground">Caracteres</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{editedContent.split(' ').length}</div>
              <div className="text-xs text-muted-foreground">Palavras</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{editedContent.split('\n').length}</div>
              <div className="text-xs text-muted-foreground">Linhas</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}