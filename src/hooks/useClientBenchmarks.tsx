import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PlatformType = 'meta_ads' | 'google_ads';

export interface ClientBenchmark {
  id: string;
  client_id: string;
  company_id: string;
  platform: PlatformType;
  target_cpa: number | null;
  target_cpl: number | null;
  target_ctr: number | null;
  target_cpc: number | null;
  target_cpm: number | null;
  target_roas: number | null;
  target_conversion_rate: number | null;
  target_frequency: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BenchmarkFormData {
  target_cpa: string;
  target_cpl: string;
  target_ctr: string;
  target_cpc: string;
  target_cpm: string;
  target_roas: string;
  target_conversion_rate: string;
  target_frequency: string;
  is_active: boolean;
}

export const emptyBenchmarkFormData: BenchmarkFormData = {
  target_cpa: "",
  target_cpl: "",
  target_ctr: "",
  target_cpc: "",
  target_cpm: "",
  target_roas: "",
  target_conversion_rate: "",
  target_frequency: "",
  is_active: true,
};

export function useClientBenchmarks(clientId?: string, companyId?: string) {
  const [benchmarks, setBenchmarks] = useState<ClientBenchmark[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBenchmarks = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_metric_benchmarks')
        .select('*')
        .eq('client_id', clientId);

      if (error) throw error;
      setBenchmarks((data || []) as ClientBenchmark[]);
    } catch (error: any) {
      console.error('Error fetching benchmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmarks();
  }, [clientId]);

  const getBenchmarkByPlatform = (platform: PlatformType): ClientBenchmark | undefined => {
    return benchmarks.find(b => b.platform === platform);
  };

  const formDataToBenchmark = (formData: BenchmarkFormData) => {
    return {
      target_cpa: formData.target_cpa ? parseFloat(formData.target_cpa) : null,
      target_cpl: formData.target_cpl ? parseFloat(formData.target_cpl) : null,
      target_ctr: formData.target_ctr ? parseFloat(formData.target_ctr) : null,
      target_cpc: formData.target_cpc ? parseFloat(formData.target_cpc) : null,
      target_cpm: formData.target_cpm ? parseFloat(formData.target_cpm) : null,
      target_roas: formData.target_roas ? parseFloat(formData.target_roas) : null,
      target_conversion_rate: formData.target_conversion_rate ? parseFloat(formData.target_conversion_rate) : null,
      target_frequency: formData.target_frequency ? parseFloat(formData.target_frequency) : null,
      is_active: formData.is_active,
    };
  };

  const benchmarkToFormData = (benchmark?: ClientBenchmark): BenchmarkFormData => {
    if (!benchmark) return emptyBenchmarkFormData;
    return {
      target_cpa: benchmark.target_cpa?.toString() || "",
      target_cpl: benchmark.target_cpl?.toString() || "",
      target_ctr: benchmark.target_ctr?.toString() || "",
      target_cpc: benchmark.target_cpc?.toString() || "",
      target_cpm: benchmark.target_cpm?.toString() || "",
      target_roas: benchmark.target_roas?.toString() || "",
      target_conversion_rate: benchmark.target_conversion_rate?.toString() || "",
      target_frequency: benchmark.target_frequency?.toString() || "",
      is_active: benchmark.is_active ?? true,
    };
  };

  const saveBenchmark = async (
    platform: PlatformType,
    formData: BenchmarkFormData
  ): Promise<boolean> => {
    if (!clientId || !companyId) {
      toast({
        title: "Erro",
        description: "Cliente ou empresa não identificados.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const existingBenchmark = getBenchmarkByPlatform(platform);
      const benchmarkData = formDataToBenchmark(formData);

      if (existingBenchmark) {
        // Update existing
        const { error } = await supabase
          .from('client_metric_benchmarks')
          .update({
            ...benchmarkData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingBenchmark.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('client_metric_benchmarks')
          .insert({
            client_id: clientId,
            company_id: companyId,
            platform,
            ...benchmarkData,
          });

        if (error) throw error;
      }

      await fetchBenchmarks();
      return true;
    } catch (error: any) {
      console.error('Error saving benchmark:', error);
      toast({
        title: "Erro ao salvar métricas",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const saveBothBenchmarks = async (
    metaFormData: BenchmarkFormData,
    googleFormData: BenchmarkFormData
  ): Promise<boolean> => {
    if (!clientId || !companyId) return false;

    try {
      // Save Meta Ads benchmark
      const metaSuccess = await saveBenchmark('meta_ads', metaFormData);
      if (!metaSuccess) return false;

      // Save Google Ads benchmark
      const googleSuccess = await saveBenchmark('google_ads', googleFormData);
      if (!googleSuccess) return false;

      toast({
        title: "Métricas salvas",
        description: "As métricas ideais foram salvas com sucesso.",
      });

      return true;
    } catch (error: any) {
      console.error('Error saving benchmarks:', error);
      return false;
    }
  };

  return {
    benchmarks,
    loading,
    getBenchmarkByPlatform,
    benchmarkToFormData,
    saveBenchmark,
    saveBothBenchmarks,
    refetch: fetchBenchmarks,
  };
}
