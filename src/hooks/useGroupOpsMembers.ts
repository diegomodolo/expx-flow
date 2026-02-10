import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface GroupOpsMember {
  id: string;
  group_id: string;
  company_id: string;
  wa_user_id: string | null;
  phone_e164: string | null;
  display_name: string | null;
  company_name: string | null;
  role: string | null;
  segment: string | null;
  size_bucket: string | null;
  primary_pain: string | null;
  tags: string[];
  status: string;
  last_message_at: string | null;
  last_participation_at: string | null;
  streak_days: number;
  silent_days: number;
  risk_level: string;
  privacy_flags: any;
  created_at: string;
  updated_at: string;
}

export function useGroupOpsMembers(groupId?: string) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const membersQuery = useQuery({
    queryKey: ['groupops-members', companyId, groupId],
    queryFn: async () => {
      if (!companyId) return [];
      let query = supabase
        .from('groupops_members')
        .select('*')
        .eq('company_id', companyId)
        .order('display_name', { ascending: true });
      if (groupId) query = query.eq('group_id', groupId);
      const { data, error } = await query;
      if (error) throw error;
      return data as GroupOpsMember[];
    },
    enabled: !!companyId,
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GroupOpsMember> & { id: string }) => {
      // If banning (removing from group), call UazapiGO API first
      if (updates.status === 'banned') {
        // Get member details (group_id, phone)
        const { data: member, error: memberErr } = await supabase
          .from('groupops_members')
          .select('group_id, wa_user_id, phone_e164')
          .eq('id', id)
          .single();
        if (memberErr || !member) throw new Error('Membro não encontrado');

        // Get group details (provider_group_id)
        const { data: group } = await supabase
          .from('groupops_groups')
          .select('provider_group_id')
          .eq('id', member.group_id)
          .single();
        if (!group?.provider_group_id) throw new Error('Grupo sem ID do provedor');

        // Get instance linked to this group via campaigns or directly
        // First try getting instance from any campaign for this group
        const { data: campaign } = await supabase
          .from('groupops_campaigns')
          .select('instance_id')
          .eq('group_id', member.group_id)
          .eq('company_id', companyId!)
          .not('instance_id', 'is', null)
          .limit(1)
          .maybeSingle();

        let instanceId = campaign?.instance_id;

        // Fallback: get first connected instance for the company
        if (!instanceId) {
          const { data: inst } = await supabase
            .from('whatsapp_instances')
            .select('id')
            .eq('company_id', companyId!)
            .eq('is_connected', true)
            .limit(1)
            .maybeSingle();
          instanceId = inst?.id;
        }

        if (!instanceId) throw new Error('Nenhuma instância WhatsApp conectada');

        // Get instance token
        const { data: instance } = await supabase
          .from('whatsapp_instances')
          .select('uazapi_token')
          .eq('id', instanceId)
          .single();
        if (!instance?.uazapi_token) throw new Error('Token da instância não encontrado');

        // Get company WhatsApp config endpoint
        const { data: config } = await supabase
          .from('whatsapp_configs')
          .select('uazapi_endpoint')
          .eq('company_id', companyId!)
          .eq('is_active', true)
          .single();
        if (!config?.uazapi_endpoint) throw new Error('Endpoint WhatsApp não configurado');

        // Build participant JID from wa_user_id or phone
        const participantId = member.wa_user_id || member.phone_e164?.replace(/\D/g, '');
        if (!participantId) throw new Error('Não foi possível identificar o participante');
        const participantJid = participantId.includes('@') ? participantId : `${participantId}@s.whatsapp.net`;

        // Call UazapiGO API to remove participant
        const endpoint = config.uazapi_endpoint.replace(/\/$/, '');
        const removeRes = await fetch(`${endpoint}/group/removeParticipant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            token: instance.uazapi_token,
          },
          body: JSON.stringify({
            groupJid: group.provider_group_id,
            participantJid: participantJid,
          }),
        });

        const removeResult = await removeRes.json();
        console.log('[useGroupOpsMembers] Remove participant result:', removeResult);

        if (!removeRes.ok) {
          throw new Error(`Erro ao remover do grupo: ${removeResult?.message || removeResult?.error || JSON.stringify(removeResult)}`);
        }
      }

      const { data, error } = await supabase
        .from('groupops_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groupops-members'] });
      if (variables.status === 'banned') {
        toast.success('Membro removido do grupo com sucesso');
      } else {
        toast.success('Membro atualizado');
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao atualizar membro'),
  });

  return { members: membersQuery.data ?? [], isLoading: membersQuery.isLoading, updateMember };
}
