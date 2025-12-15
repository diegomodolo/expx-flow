import { MetaAudience } from "@/hooks/useMetaAudiences";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { MoreVertical, Eye, Upload, Trash2, Users, Loader2 } from "lucide-react";
import { useState } from "react";

interface AudiencesListProps {
  audiences: MetaAudience[];
  loading: boolean;
  onViewDetails: (audience: MetaAudience) => void;
  onUploadLeads: (audience: MetaAudience) => void;
  onDelete: (audienceId: string) => void;
}

export function AudiencesList({
  audiences,
  loading,
  onViewDetails,
  onUploadLeads,
  onDelete,
}: AudiencesListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [audienceToDelete, setAudienceToDelete] = useState<MetaAudience | null>(null);

  const handleDeleteClick = (audience: MetaAudience) => {
    setAudienceToDelete(audience);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (audienceToDelete) {
      onDelete(audienceToDelete.id);
    }
    setDeleteDialogOpen(false);
    setAudienceToDelete(null);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getSubtypeBadge = (subtype?: string) => {
    const subtypeLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      CUSTOM: { label: "Personalizado", variant: "default" },
      WEBSITE: { label: "Website", variant: "secondary" },
      APP: { label: "App", variant: "secondary" },
      OFFLINE_CONVERSION: { label: "Conversão Offline", variant: "outline" },
      CLAIM: { label: "Claim", variant: "outline" },
      PARTNER: { label: "Parceiro", variant: "outline" },
      MANAGED: { label: "Gerenciado", variant: "outline" },
      VIDEO: { label: "Vídeo", variant: "secondary" },
      LOOKALIKE: { label: "Lookalike", variant: "default" },
      ENGAGEMENT: { label: "Engajamento", variant: "secondary" },
    };

    const config = subtypeLabels[subtype || "CUSTOM"] || { label: subtype || "Desconhecido", variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading && audiences.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Carregando públicos...</p>
        </CardContent>
      </Card>
    );
  }

  if (audiences.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
          <Users className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum público encontrado</p>
          <p className="text-sm">Crie seu primeiro público personalizado para começar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {audiences.map((audience) => (
          <Card key={audience.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate" title={audience.name}>
                    {audience.name}
                  </h4>
                  {audience.description && (
                    <p className="text-sm text-muted-foreground truncate" title={audience.description}>
                      {audience.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(audience)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUploadLeads(audience)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Adicionar Leads
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(audience)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Público
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getSubtypeBadge(audience.subtype)}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{formatCount(audience.approximate_count)}</p>
                  <p className="text-xs text-muted-foreground">usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Público</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o público "{audienceToDelete?.name}"?
              Esta ação não pode ser desfeita e o público será removido permanentemente do Meta Ads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
