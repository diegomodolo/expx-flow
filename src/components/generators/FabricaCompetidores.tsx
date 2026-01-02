import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCompetitors, Competitor } from "@/hooks/useCompetitors";
import { CompetitorDialog } from "@/components/clients/CompetitorDialog";
import { Plus, Building2, Globe, Instagram, ExternalLink, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface Props {
  clientId: string;
  clonePercentage: number;
}

export function FabricaCompetidores({ clientId, clonePercentage }: Props) {
  const { competitors, competitorAds, loading, deleteCompetitor, refetch } = useCompetitors(clientId);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCompetitor(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getAdsCount = (competitorId: string) => {
    return competitorAds.filter(ad => ad.competitor_id === competitorId).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {clonePercentage > 0 && competitors.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você configurou {clonePercentage}% de clones, mas não tem concorrentes cadastrados. 
            Adicione pelo menos um concorrente para gerar anúncios do tipo Clone.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Concorrentes</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os concorrentes para geração de anúncios do tipo Clone
          </p>
        </div>
        <CompetitorDialog clientId={clientId} onCompetitorAdded={refetch} />
      </div>

      {competitors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              Nenhum concorrente cadastrado ainda
            </p>
            <CompetitorDialog clientId={clientId} onCompetitorAdded={refetch} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {competitors.map((competitor) => (
            <Card key={competitor.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{competitor.name}</CardTitle>
                    <CardDescription>{competitor.company_name}</CardDescription>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        {deletingId === competitor.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover concorrente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação removerá o concorrente e todos os anúncios associados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(competitor.id)}>
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {competitor.industry && (
                    <Badge variant="secondary">{competitor.industry}</Badge>
                  )}
                  <Badge variant="outline">{getAdsCount(competitor.id)} anúncios</Badge>
                </div>
                
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {competitor.website_url && (
                    <a 
                      href={competitor.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Globe className="h-3 w-3" />
                      Site
                    </a>
                  )}
                  {competitor.instagram_handle && (
                    <span className="flex items-center gap-1">
                      <Instagram className="h-3 w-3" />
                      @{competitor.instagram_handle}
                    </span>
                  )}
                  {competitor.ad_library_url && (
                    <a 
                      href={competitor.ad_library_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ad Library
                    </a>
                  )}
                </div>

                {competitor.last_scrape_at && (
                  <p className="text-xs text-muted-foreground">
                    Último scrape: {new Date(competitor.last_scrape_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
