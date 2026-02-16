import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface ChecklistTemplateItem {
  id: string;
  template_id: string;
  text: string;
  ordem: number;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: ChecklistTemplateItem[];
}

export function useChecklistTemplates() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.id;

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['checklist-templates', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ChecklistTemplate[];
    },
    enabled: !!companyId,
  });

  const createTemplate = useMutation({
    mutationFn: async ({ name, description, items }: { name: string; description?: string; items: string[] }) => {
      if (!companyId) throw new Error('No company');
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: template, error } = await supabase
        .from('checklist_templates')
        .insert({ company_id: companyId, name, description: description || null, created_by: user?.id || null })
        .select()
        .single();
      if (error) throw error;

      if (items.length > 0) {
        const itemRows = items.map((text, i) => ({
          template_id: template.id,
          text,
          ordem: i,
        }));
        const { error: itemsError } = await supabase
          .from('checklist_template_items')
          .insert(itemRows);
        if (itemsError) throw itemsError;
      }
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', companyId] });
      toast.success('Template criado com sucesso!');
    },
    onError: () => toast.error('Erro ao criar template'),
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, name, description, items }: { id: string; name: string; description?: string; items: string[] }) => {
      const { error } = await supabase
        .from('checklist_templates')
        .update({ name, description: description || null })
        .eq('id', id);
      if (error) throw error;

      // Replace items
      await supabase.from('checklist_template_items').delete().eq('template_id', id);
      if (items.length > 0) {
        const itemRows = items.map((text, i) => ({
          template_id: id,
          text,
          ordem: i,
        }));
        const { error: itemsError } = await supabase
          .from('checklist_template_items')
          .insert(itemRows);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', companyId] });
      toast.success('Template atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar template'),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', companyId] });
      toast.success('Template excluído!');
    },
    onError: () => toast.error('Erro ao excluir template'),
  });

  const fetchTemplateItems = async (templateId: string): Promise<ChecklistTemplateItem[]> => {
    const { data, error } = await supabase
      .from('checklist_template_items')
      .select('*')
      .eq('template_id', templateId)
      .order('ordem');
    if (error) throw error;
    return data as ChecklistTemplateItem[];
  };

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    fetchTemplateItems,
  };
}
