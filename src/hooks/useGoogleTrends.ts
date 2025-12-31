import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TrendingTopic {
  title: string;
  traffic: string;
  relatedQueries: string[];
  image: string | null;
  articles: Array<{
    title: string;
    url: string;
    source: string;
  }>;
}

export interface InterestData {
  keyword: string;
  data: Array<{
    date: string;
    value: number;
  }>;
  averageInterest: number;
}

export interface RelatedQueries {
  keyword: string;
  top: Array<{
    query: string;
    value: number;
  }>;
  rising: Array<{
    query: string;
    value: string;
  }>;
}

export function useGoogleTrends() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDailyTrends = useCallback(async (geo: string = "BR"): Promise<TrendingTopic[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("google-trends", {
        body: { queryType: "dailyTrends", geo },
      });

      if (fnError) throw fnError;
      if (data?.fallback) throw new Error(data.error);

      return data as TrendingTopic[];
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar tendências";
      setError(message);
      console.error("getDailyTrends error:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getInterestOverTime = useCallback(async (
    keyword: string,
    geo: string = "BR",
    timeRange: string = "today 3-m"
  ): Promise<InterestData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("google-trends", {
        body: { queryType: "interestOverTime", keyword, geo, timeRange },
      });

      if (fnError) throw fnError;
      if (data?.fallback) throw new Error(data.error);

      return data as InterestData;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar interesse";
      setError(message);
      console.error("getInterestOverTime error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRelatedQueries = useCallback(async (
    keyword: string,
    geo: string = "BR"
  ): Promise<RelatedQueries | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("google-trends", {
        body: { queryType: "relatedQueries", keyword, geo },
      });

      if (fnError) throw fnError;
      if (data?.fallback) throw new Error(data.error);

      return data as RelatedQueries;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar queries relacionadas";
      setError(message);
      console.error("getRelatedQueries error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkKeywordTrending = useCallback(async (keyword: string): Promise<{
    isTrending: boolean;
    interest: number;
    relatedTopics: string[];
  }> => {
    try {
      const interest = await getInterestOverTime(keyword);
      const related = await getRelatedQueries(keyword);

      return {
        isTrending: (interest?.averageInterest || 0) > 50,
        interest: interest?.averageInterest || 0,
        relatedTopics: related?.rising?.slice(0, 5).map(r => r.query) || [],
      };
    } catch {
      return { isTrending: false, interest: 0, relatedTopics: [] };
    }
  }, [getInterestOverTime, getRelatedQueries]);

  return {
    isLoading,
    error,
    getDailyTrends,
    getInterestOverTime,
    getRelatedQueries,
    checkKeywordTrending,
  };
}
