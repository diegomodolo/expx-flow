import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export const USAGE_KEYS = {
  BLOCK_FINISH_WITH_PENDING_SUBTASKS: 'block_finish_with_pending_subtasks',
  BLOCK_FINISH_WITH_PENDING_CHECKLIST: 'block_finish_with_pending_checklist',
} as const;

type UsageKey = typeof USAGE_KEYS[keyof typeof USAGE_KEYS];

export function useCompanyUsageDefaults() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: defaults = {}, isLoading } = useQuery({
    queryKey: ['company-usage-defaults', companyId],
    queryFn: async () => {
      if (!companyId) return {};
      const { data, error } = await supabase
        .from('company_usage_defaults' as any)
        .select('setting_key, setting_value')
        .eq('company_id', companyId);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data as any[])?.forEach((row: any) => {
        map[row.setting_key] = row.setting_value;
      });
      return map;
    },
    enabled: !!companyId,
  });

  const getSetting = (key: UsageKey, fallback = false): boolean => {
    return defaults[key] ?? fallback;
  };

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: UsageKey; value: boolean }) => {
      if (!companyId) throw new Error('No company');
      const { error } = await (supabase as any)
        .from('company_usage_defaults')
        .upsert(
          { company_id: companyId, setting_key: key, setting_value: value },
          { onConflict: 'company_id,setting_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-usage-defaults', companyId] });
      toast.success('Configuração salva!');
    },
    onError: () => toast.error('Erro ao salvar configuração'),
  });

  return { defaults, isLoading, getSetting, updateSetting };
}
