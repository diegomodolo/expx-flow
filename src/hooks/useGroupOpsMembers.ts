import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface JoinRequest {
  jid: string;
  phone: string;
  name?: string;
}

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
  privacy_flags: unknown;
  created_at: string;
  updated_at: string;
}

export function useGroupOpsMembers(groupId?: string) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const membersQuery = useQuery({
    queryKey: ["groupops-members", companyId, groupId],
    queryFn: async () => {
      if (!companyId) return [];
      let query = supabase
        .from("groupops_members")
        .select("*")
        .eq("company_id", companyId)
        .order("display_name", { ascending: true });
      if (groupId) query = query.eq("group_id", groupId);
      const { data, error } = await query;
      if (error) throw error;
      return data as GroupOpsMember[];
    },
    enabled: !!companyId,
  });

  const updateMember = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<GroupOpsMember> & { id: string }) => {
      // If banning (removing from group), call UazapiGO API first
      if (updates.status === "banned") {
        // Get member details (group_id, phone)
        const { data: member, error: memberErr } = await supabase
          .from("groupops_members")
          .select("group_id, wa_user_id, phone_e164")
          .eq("id", id)
          .single();
        if (memberErr || !member) throw new Error("Membro não encontrado");

        // Get group details (provider_group_id)
        const { data: group } = await supabase
          .from("groupops_groups")
          .select("provider_group_id")
          .eq("id", member.group_id)
          .single();
        if (!group?.provider_group_id)
          throw new Error("Grupo sem ID do provedor");

        // Get instance linked to this group via campaigns or directly
        // First try getting instance from any campaign for this group
        const { data: campaign } = await supabase
          .from("groupops_campaigns")
          .select("instance_id")
          .eq("group_id", member.group_id)
          .eq("company_id", companyId!)
          .not("instance_id", "is", null)
          .limit(1)
          .maybeSingle();

        let instanceId = campaign?.instance_id;

        // Fallback: get first connected instance for the company
        if (!instanceId) {
          const { data: inst } = await supabase
            .from("whatsapp_instances")
            .select("id")
            .eq("company_id", companyId!)
            .eq("is_connected", true)
            .limit(1)
            .maybeSingle();
          instanceId = inst?.id;
        }

        if (!instanceId)
          throw new Error("Nenhuma instância WhatsApp conectada");

        // Get instance token
        const { data: instance } = await supabase
          .from("whatsapp_instances")
          .select("uazapi_token")
          .eq("id", instanceId)
          .single();
        if (!instance?.uazapi_token)
          throw new Error("Token da instância não encontrado");

        // Get company WhatsApp config endpoint
        const { data: config } = await supabase
          .from("whatsapp_configs")
          .select("uazapi_endpoint")
          .eq("company_id", companyId!)
          .eq("is_active", true)
          .single();
        if (!config?.uazapi_endpoint)
          throw new Error("Endpoint WhatsApp não configurado");

        // Build participant JID from wa_user_id or phone
        const participantId =
          member.wa_user_id || member.phone_e164?.replace(/\D/g, "");
        if (!participantId)
          throw new Error("Não foi possível identificar o participante");
        const participantJid = participantId.includes("@")
          ? participantId
          : `${participantId}@s.whatsapp.net`;

        // Call UazapiGO API to remove participant
        const endpoint = config.uazapi_endpoint.replace(/\/$/, "");
        const removeRes = await fetch(`${endpoint}/group/removeParticipant`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: instance.uazapi_token,
          },
          body: JSON.stringify({
            groupJid: group.provider_group_id,
            participantJid: participantJid,
          }),
        });

        const removeResult = await removeRes.json();

        if (!removeRes.ok) {
          throw new Error(
            `Erro ao remover do grupo: ${removeResult?.message || removeResult?.error || JSON.stringify(removeResult)}`,
          );
        }
      }

      const { data, error } = await supabase
        .from("groupops_members")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["groupops-members"] });
      if (variables.status === "banned") {
        toast.success("Membro removido do grupo com sucesso");
      } else {
        toast.success("Membro atualizado");
      }
    },
    onError: (err: Error) =>
      toast.error(err.message || "Erro ao atualizar membro"),
  });

  // Helper to get API config for a group
  const getApiConfig = async (groupId: string) => {
    const { data: group } = await supabase
      .from("groupops_groups")
      .select("provider_group_id, config_json")
      .eq("id", groupId)
      .single();
    if (!group?.provider_group_id) throw new Error("Grupo sem JID configurado");

    const instanceId = (group.config_json as Record<string, unknown>)
      ?.instance_id as string | undefined;

    // Try campaign instance, then fallback
    let resolvedInstanceId = instanceId;
    if (!resolvedInstanceId) {
      const { data: campaign } = await supabase
        .from("groupops_campaigns")
        .select("instance_id")
        .eq("group_id", groupId)
        .eq("company_id", companyId!)
        .not("instance_id", "is", null)
        .limit(1)
        .maybeSingle();
      resolvedInstanceId = campaign?.instance_id;
    }
    if (!resolvedInstanceId) {
      const { data: inst } = await supabase
        .from("whatsapp_instances")
        .select("id")
        .eq("company_id", companyId!)
        .eq("is_connected", true)
        .limit(1)
        .maybeSingle();
      resolvedInstanceId = inst?.id;
    }
    if (!resolvedInstanceId)
      throw new Error("Nenhuma instância WhatsApp conectada");

    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("uazapi_token")
      .eq("id", resolvedInstanceId)
      .single();
    if (!instance?.uazapi_token)
      throw new Error("Token da instância não encontrado");

    const { data: config } = await supabase
      .from("whatsapp_configs")
      .select("uazapi_endpoint")
      .eq("company_id", companyId!)
      .eq("is_active", true)
      .single();
    if (!config?.uazapi_endpoint)
      throw new Error("Endpoint WhatsApp não configurado");

    return {
      endpoint: config.uazapi_endpoint.replace(/\/$/, ""),
      token: instance.uazapi_token,
      groupJid: group.provider_group_id,
    };
  };

  // Fetch pending join requests for a group
  const fetchJoinRequests = async (groupId: string): Promise<JoinRequest[]> => {
    if (!companyId) return [];
    try {
      const { endpoint, token, groupJid } = await getApiConfig(groupId);

      const res = await fetch(`${endpoint}/group/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify({
          groupjid: groupJid,
          getRequestsParticipants: true,
        }),
      });

      if (!res.ok) throw new Error("Erro ao buscar solicitações");

      const info = await res.json();
      const requests = info.request_participants;

      if (!requests || !Array.isArray(requests)) return [];

      return requests.map(
        (r: { JID?: string; jid?: string; Name?: string; name?: string }) => {
          const jid = r.JID || r.jid || "";
          const phone = jid.replace("@s.whatsapp.net", "");
          return { jid, phone, name: r.Name || r.name };
        },
      );
    } catch (err) {
      console.error("Error fetching join requests:", err);
      return [];
    }
  };

  // Approve or reject a join request
  const handleJoinRequest = useMutation({
    mutationFn: async ({
      groupId,
      participants,
      action,
    }: {
      groupId: string;
      participants: string[];
      action: "approve" | "reject";
    }) => {
      const { endpoint, token, groupJid } = await getApiConfig(groupId);

      const res = await fetch(`${endpoint}/group/updateParticipants`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify({
          groupjid: groupJid,
          action,
          participants,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err?.message ||
            `Erro ao ${action === "approve" ? "aprovar" : "rejeitar"} solicitação`,
        );
      }

      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["groupops-members"] });
      toast.success(
        variables.action === "approve"
          ? "Solicitação aprovada com sucesso"
          : "Solicitação rejeitada",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    updateMember,
    fetchJoinRequests,
    handleJoinRequest,
  };
}
