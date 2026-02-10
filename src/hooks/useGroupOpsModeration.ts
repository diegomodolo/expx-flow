import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface GroupOpsModerationRule {
  id: string;
  company_id: string;
  group_id: string;
  name: string;
  type: string;
  action_type: string;
  config_json: any;
  is_active: boolean | null;
  created_at: string;
}

export interface GroupOpsModerationAction {
  id: string;
  company_id: string;
  group_id: string;
  member_id: string | null;
  message_id: string | null;
  rule_id: string | null;
  action_type: string;
  reason: string | null;
  resolved: boolean | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export const RULE_TYPES = [
  { value: 'flood', label: 'Anti-Flood', description: 'Limita mensagens por minuto' },
  { value: 'spam', label: 'Anti-Spam', description: 'Detecta links e conteúdo repetitivo' },
  { value: 'profanity', label: 'Linguagem', description: 'Filtra palavras ofensivas' },
  { value: 'media', label: 'Mídia', description: 'Controla envio de imagens/vídeos' },
  { value: 'link', label: 'Links', description: 'Restringe compartilhamento de links' },
  { value: 'custom', label: 'Personalizada', description: 'Regra com configuração livre' },
];

export const ACTION_TYPES = [
  { value: 'warn', label: 'Aviso' },
  { value: 'mute', label: 'Silenciar' },
  { value: 'delete', label: 'Deletar mensagem' },
  { value: 'ban', label: 'Banir' },
  { value: 'score_penalty', label: 'Penalidade de pontos' },
];

export function useGroupOpsModeration(groupId?: string) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const rulesQuery = useQuery({
    queryKey: ['groupops-mod-rules', companyId, groupId],
    queryFn: async () => {
      if (!companyId) return [];
      let query = supabase.from('groupops_moderation_rules').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
      if (groupId) query = query.eq('group_id', groupId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GroupOpsModerationRule[];
    },
    enabled: !!companyId,
  });

  const actionsQuery = useQuery({
    queryKey: ['groupops-mod-actions', companyId, groupId],
    queryFn: async () => {
      if (!companyId) return [];
      let query = supabase.from('groupops_moderation_actions').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200);
      if (groupId) query = query.eq('group_id', groupId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GroupOpsModerationAction[];
    },
    enabled: !!companyId,
  });

  const createRule = useMutation({
    mutationFn: async (rule: Partial<GroupOpsModerationRule>) => {
      const { id, created_at, company_id, ...rest } = rule;
      const { data, error } = await supabase.from('groupops_moderation_rules')
        .insert({ ...rest, company_id: companyId!, name: rest.name ?? 'Nova Regra' } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groupops-mod-rules'] }); toast.success('Regra criada'); },
    onError: () => toast.error('Erro ao criar regra'),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GroupOpsModerationRule> & { id: string }) => {
      const { data, error } = await supabase.from('groupops_moderation_rules').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groupops-mod-rules'] }); toast.success('Regra atualizada'); },
    onError: () => toast.error('Erro ao atualizar regra'),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('groupops_moderation_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groupops-mod-rules'] }); toast.success('Regra excluída'); },
    onError: () => toast.error('Erro ao excluir regra'),
  });

  const resolveAction = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('groupops_moderation_actions')
        .update({ resolved: true, resolved_at: new Date().toISOString() } as any)
        .eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groupops-mod-actions'] }); toast.success('Ação resolvida'); },
    onError: () => toast.error('Erro ao resolver ação'),
  });

  return {
    rules: rulesQuery.data ?? [],
    actions: actionsQuery.data ?? [],
    isLoading: rulesQuery.isLoading || actionsQuery.isLoading,
    createRule, updateRule, deleteRule, resolveAction,
  };
}
