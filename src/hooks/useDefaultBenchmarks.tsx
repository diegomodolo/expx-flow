import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

export interface DefaultBenchmarks {
  default_target_cpa: number | null;
  default_target_cpl: number | null;
  default_target_ctr: number | null;
  default_target_cpc: number | null;
  default_target_cpm: number | null;
  default_target_roas: number | null;
  default_target_frequency: number | null;
  default_target_conversion_rate: number | null;
}

// System default values (used when company has no configuration)
export const SYSTEM_DEFAULTS: DefaultBenchmarks = {
  default_target_cpa: 100,
  default_target_cpl: 50,
  default_target_ctr: 1,
  default_target_cpc: 3,
  default_target_cpm: 30,
  default_target_roas: 3,
  default_target_frequency: 3,
  default_target_conversion_rate: 2,
};

export const useDefaultBenchmarks = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();

  const { data: benchmarks, isLoading } = useQuery({
    queryKey: ['default-benchmarks', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return null;

      const { data, error } = await supabase
        .from('company_settings')
        .select(`
          default_target_cpa,
          default_target_cpl,
          default_target_ctr,
          default_target_cpc,
          default_target_cpm,
          default_target_roas,
          default_target_frequency,
          default_target_conversion_rate
        `)
        .eq('company_id', activeCompany.company_id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching default benchmarks:', error);
        throw error;
      }

      return data as DefaultBenchmarks | null;
    },
    enabled: !!activeCompany?.company_id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<DefaultBenchmarks>) => {
      if (!activeCompany?.company_id) throw new Error('Company not found');

      // Check if settings exist
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .eq('company_id', activeCompany.company_id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('company_settings')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', activeCompany.company_id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('company_settings')
          .insert({
            company_id: activeCompany.company_id,
            campaign_name_prefix: '',
            ...data,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-benchmarks'] });
      toast({
        title: 'Configurações salvas',
        description: 'As métricas padrão foram atualizadas com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error saving default benchmarks:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    },
  });

  const restoreDefaults = async () => {
    await saveMutation.mutateAsync(SYSTEM_DEFAULTS);
  };

  return {
    benchmarks: benchmarks || SYSTEM_DEFAULTS,
    isLoading,
    saveBenchmarks: saveMutation.mutateAsync,
    restoreDefaults,
    isSaving: saveMutation.isPending,
  };
};
