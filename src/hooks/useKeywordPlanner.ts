import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface KeywordIdea {
  keyword: string;
  avgMonthlySearches: number;
  competition: "LOW" | "MEDIUM" | "HIGH" | "UNSPECIFIED";
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  monthlySearchVolumes: Array<{
    year: number;
    month: string;
    monthlySearches: number;
  }>;
}

interface UseKeywordPlannerOptions {
  companyId: string;
  customerId?: string;
}

export function useKeywordPlanner({ companyId, customerId }: UseKeywordPlannerOptions) {
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState<KeywordIdea[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateKeywordIdeas = async (
    seedKeywords: string[],
    pageUrl?: string,
    options?: {
      language?: string;
      geoTargetLocation?: string;
      includeAdultKeywords?: boolean;
    }
  ): Promise<KeywordIdea[]> => {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    if (seedKeywords.length === 0 && !pageUrl) {
      throw new Error("Either keywords or URL is required");
    }

    setLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("google-ads-keyword-planner", {
        body: {
          action: "generateKeywordIdeas",
          companyId,
          customerId,
          keywords: seedKeywords,
          pageUrl,
          language: options?.language || "1014", // Portuguese
          geoTargetLocation: options?.geoTargetLocation || "2076", // Brazil
          includeAdultKeywords: options?.includeAdultKeywords || false,
        },
      });

      if (response.error) {
        // Tentar extrair a mensagem real do erro da Edge Function
        let errorMessage = "Failed to generate keyword ideas";
        try {
          if (response.error.context && typeof response.error.context.json === 'function') {
            const errorBody = await response.error.context.json();
            if (errorBody?.google?.message) {
              errorMessage = `Google Ads: ${errorBody.google.status || 'ERROR'} (${errorBody.google.code || ''}) — ${errorBody.google.message}`;
            } else if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
          }
        } catch {
          // Se não conseguir parsear, usa a mensagem genérica
          errorMessage = response.error.message || errorMessage;
        }
        throw new Error(errorMessage);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const result = response.data?.data || [];
      setKeywords(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || "Error generating keyword ideas";
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getHistoricalMetrics = async (
    keywordList: string[],
    options?: {
      language?: string;
      geoTargetLocation?: string;
    }
  ): Promise<KeywordIdea[]> => {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    if (keywordList.length === 0) {
      throw new Error("Keywords are required");
    }

    setLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("google-ads-keyword-planner", {
        body: {
          action: "getHistoricalMetrics",
          companyId,
          customerId,
          keywords: keywordList,
          language: options?.language || "1014",
          geoTargetLocation: options?.geoTargetLocation || "2076",
        },
      });

      if (response.error) {
        // Tentar extrair a mensagem real do erro da Edge Function
        let errorMessage = "Failed to get historical metrics";
        try {
          if (response.error.context && typeof response.error.context.json === 'function') {
            const errorBody = await response.error.context.json();
            if (errorBody?.google?.message) {
              errorMessage = `Google Ads: ${errorBody.google.status || 'ERROR'} (${errorBody.google.code || ''}) — ${errorBody.google.message}`;
            } else if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
          }
        } catch {
          errorMessage = response.error.message || errorMessage;
        }
        throw new Error(errorMessage);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const result = response.data?.data || [];
      setKeywords(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || "Error getting historical metrics";
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (micros: number): string => {
    const value = micros / 1_000_000;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getCompetitionLabel = (competition: string): string => {
    const labels: Record<string, string> = {
      LOW: "Baixa",
      MEDIUM: "Média",
      HIGH: "Alta",
      UNSPECIFIED: "N/A",
    };
    return labels[competition] || competition;
  };

  const getCompetitionColor = (competition: string): string => {
    const colors: Record<string, string> = {
      LOW: "text-green-600",
      MEDIUM: "text-yellow-600",
      HIGH: "text-red-600",
      UNSPECIFIED: "text-muted-foreground",
    };
    return colors[competition] || "text-muted-foreground";
  };

  const clearKeywords = () => {
    setKeywords([]);
    setError(null);
  };

  return {
    loading,
    keywords,
    error,
    generateKeywordIdeas,
    getHistoricalMetrics,
    formatCurrency,
    formatNumber,
    getCompetitionLabel,
    getCompetitionColor,
    clearKeywords,
  };
}
