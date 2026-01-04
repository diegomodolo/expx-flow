import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ExternalLink, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { ClientSearchCombobox } from "@/components/generators/ClientSearchCombobox";

interface MarketResearchInsight {
  id: string;
  client_id: string;
  topic: string;
  pain_point: string | null;
  sentiment: string | null;
  source_type: string;
  relevance_score: number | null;
  source_url: string | null;
  clients?: {
    name: string;
    company: string;
  };
}

export default function TemasFabricaCriativos() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const navigate = useNavigate();
  const [clientFilter, setClientFilter] = useState<string>("all");

  const { data: clients } = useQuery({
    queryKey: ["clients-for-themes", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("clients")
        .select("id, name, company")
        .eq("company_id", companyId)
        .eq("is_canceled", false)
        .order("name");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: insights, isLoading, refetch } = useQuery({
    queryKey: ["all-market-insights", companyId, clientFilter],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from("market_research_insights")
        .select(`
          id,
          client_id,
          topic,
          pain_point,
          sentiment,
          source_type,
          relevance_score,
          source_url,
          clients (name, company)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (clientFilter !== "all") {
        query = query.eq("client_id", clientFilter);
      }

      const { data } = await query;
      return (data || []) as unknown as MarketResearchInsight[];
    },
    enabled: !!companyId,
  });

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return "bg-green-500/10 text-green-500";
      case "negative": return "bg-red-500/10 text-red-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const getSentimentLabel = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return "Positivo";
      case "negative": return "Negativo";
      default: return "Neutro";
    }
  };

  const getSourceTypeLabel = (sourceType: string) => {
    switch (sourceType) {
      case "reddit": return "Reddit";
      case "twitter": return "Twitter";
      case "forum": return "Fórum";
      case "review": return "Review";
      case "ai_generated": return "Gerado por IA";
      case "manual": return "Manual";
      default: return sourceType;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Temas de Pesquisa</h1>
          <p className="text-muted-foreground">Temas para geração de criativos</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Temas de Pesquisa</h1>
          <p className="text-muted-foreground">Temas para geração de criativos</p>
        </div>
        <div className="flex items-center gap-2">
          <ClientSearchCombobox
            clients={clients || []}
            value={clientFilter}
            onValueChange={setClientFilter}
            includeAllOption
            allOptionLabel="Todos os clientes"
            className="w-56"
          />
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {insights?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Nenhum tema de pesquisa encontrado</p>
            <p className="text-sm text-muted-foreground">
              Acesse a configuração de um cliente para adicionar temas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights?.map((insight) => (
            <Card key={insight.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base line-clamp-1">{insight.topic}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {insight.clients?.name} • {insight.clients?.company}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => navigate(`/clientes/${insight.client_id}/fabrica-criativos`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {insight.pain_point && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {insight.pain_point}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={getSentimentColor(insight.sentiment)}>
                    {getSentimentLabel(insight.sentiment)}
                  </Badge>
                  <Badge variant="secondary">
                    {getSourceTypeLabel(insight.source_type)}
                  </Badge>
                  {insight.relevance_score && (
                    <Badge variant="outline">
                      Relevância: {insight.relevance_score}%
                    </Badge>
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
