import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMarketResearchInsights, MarketResearchInsight } from "@/hooks/useMarketResearchInsights";
import { TemasPesquisaDialog } from "./TemasPesquisaDialog";
import { GerarTemasIADialog } from "./GerarTemasIADialog";
import { Lightbulb, ExternalLink, Trash2, AlertCircle, Loader2, TrendingUp, Sparkles } from "lucide-react";
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
  conceptPercentage: number;
}

export function FabricaTemasPesquisa({ clientId, conceptPercentage }: Props) {
  const { insights, loading, deleteInsight, refetch } = useMarketResearchInsights(clientId);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showIADialog, setShowIADialog] = useState(false);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteInsight(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'negative': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSentimentLabel = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return 'Positivo';
      case 'negative': return 'Negativo';
      default: return 'Neutro';
    }
  };

  const getSourceTypeLabel = (sourceType: string) => {
    const labels: Record<string, string> = {
      manual: 'Manual',
      reddit: 'Reddit',
      forum: 'Fórum',
      social: 'Redes Sociais',
      article: 'Artigo',
      research: 'Pesquisa',
    };
    return labels[sourceType] || sourceType;
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
      {conceptPercentage > 0 && insights.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você configurou {conceptPercentage}% de conceitos, mas não tem temas de pesquisa cadastrados. 
            Adicione pelo menos um tema para gerar anúncios do tipo Conceito.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Temas de Pesquisa</h3>
          <p className="text-sm text-muted-foreground">
            Insights de mercado para geração de anúncios do tipo Conceito
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setShowIADialog(true)}
          >
            <Sparkles className="h-4 w-4" />
            Gerar com IA
          </Button>
          <TemasPesquisaDialog clientId={clientId} onInsightAdded={refetch} />
        </div>
      </div>

      <GerarTemasIADialog 
        open={showIADialog} 
        onOpenChange={setShowIADialog} 
        clientId={clientId} 
        onThemesAdded={refetch} 
      />

      {insights.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              Nenhum tema de pesquisa cadastrado ainda
            </p>
            <TemasPesquisaDialog clientId={clientId} onInsightAdded={refetch} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((insight) => (
            <Card key={insight.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{insight.topic}</CardTitle>
                    {insight.pain_point && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {insight.pain_point}
                      </CardDescription>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        {deletingId === insight.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover tema?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação removerá o tema de pesquisa permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(insight.id)}>
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={getSentimentColor(insight.sentiment)}>
                    {getSentimentLabel(insight.sentiment)}
                  </Badge>
                  <Badge variant="secondary">
                    {getSourceTypeLabel(insight.source_type)}
                  </Badge>
                  {insight.used_in_ads > 0 && (
                    <Badge variant="outline" className="text-primary">
                      Usado {insight.used_in_ads}x
                    </Badge>
                  )}
                </div>

                {insight.opportunity && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    <span className="font-medium">Oportunidade:</span> {insight.opportunity}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Relevância:</span>
                    <span className="font-medium">{insight.relevance_score || 0}%</span>
                  </div>
                  
                  {insight.source_url && (
                    <a 
                      href={insight.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Fonte
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
