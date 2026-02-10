import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface GroupOpsTemplate {
  id: string;
  company_id: string;
  title: string;
  category: string;
  body: string;
  variants: any;
  placeholders: string[] | null;
  tone: string | null;
  constraints_json: any;
  created_at: string;
  updated_at: string;
}

export const TEMPLATE_CATEGORIES = [
  { value: 'DAILY_PROMPT', label: 'Provocação Diária' },
  { value: 'CHECKIN', label: 'Check-in' },
  { value: 'CHALLENGE', label: 'Desafio' },
  { value: 'CASE_STUDY', label: 'Case Anônimo' },
  { value: 'RANKING', label: 'Ranking' },
  { value: 'WELCOME', label: 'Boas-vindas' },
  { value: 'REACTIVATION', label: 'Reativação' },
  { value: 'CUSTOM', label: 'Personalizada' },
];

export const TEMPLATE_TONES = [
  { value: 'casual', label: 'Casual' },
  { value: 'professional', label: 'Profissional' },
  { value: 'motivational', label: 'Motivacional' },
  { value: 'provocative', label: 'Provocativo' },
  { value: 'educational', label: 'Educativo' },
];

export const AVAILABLE_PLACEHOLDERS = [
  { key: '{{nome}}', description: 'Nome do membro' },
  { key: '{{grupo}}', description: 'Nome do grupo' },
  { key: '{{empresa}}', description: 'Empresa do membro' },
  { key: '{{streak}}', description: 'Dias de streak' },
  { key: '{{pontos}}', description: 'Pontuação atual' },
  { key: '{{ranking}}', description: 'Posição no ranking' },
  { key: '{{dia_semana}}', description: 'Dia da semana' },
];

export function useGroupOpsTemplates() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const templatesQuery = useQuery({
    queryKey: ['groupops-templates', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('groupops_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as GroupOpsTemplate[];
    },
    enabled: !!companyId,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<GroupOpsTemplate>) => {
      const { id, created_at, updated_at, company_id, ...rest } = template;
      const { data, error } = await supabase
        .from('groupops_templates')
        .insert({ ...rest, company_id: companyId!, title: rest.title ?? 'Novo Template', body: rest.body ?? '' } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: () => toast.error('Erro ao criar template'),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GroupOpsTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('groupops_templates')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-templates'] });
      toast.success('Template atualizado');
    },
    onError: () => toast.error('Erro ao atualizar template'),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('groupops_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupops-templates'] });
      toast.success('Template excluído');
    },
    onError: () => toast.error('Erro ao excluir template'),
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
