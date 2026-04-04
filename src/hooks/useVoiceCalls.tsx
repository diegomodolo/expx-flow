import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VoiceCall {
  id: string;
  company_id: string;
  conversation_id: string | null;
  phone: string;
  contact_name: string | null;
  direction: string;
  status: string;
  api4com_call_id: string | null;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  hangup_cause: string | null;
  record_url: string | null;
  created_at: string;
}

interface InitiateCallParams {
  companyId: string;
  conversationId: string;
  phone: string;
  contactName?: string;
}

export function useVoiceCalls(
  companyId: string | undefined,
  conversationId?: string,
) {
  const queryClient = useQueryClient();

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["voice-calls", companyId, conversationId],
    queryFn: async () => {
      let query = supabase
        .from("voice_calls")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(20);

      if (conversationId) {
        query = query.eq("conversation_id", conversationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VoiceCall[];
    },
    enabled: !!companyId,
  });

  const { mutate: initiateCall, isPending: isInitiating } = useMutation({
    mutationFn: async (params: InitiateCallParams) => {
      const { data, error } = await supabase.functions.invoke(
        "initiate-voice-call",
        {
          body: {
            companyId: params.companyId,
            conversationId: params.conversationId,
            phone: params.phone,
            contactName: params.contactName,
          },
        },
      );
      if (error) throw error;
      if (!data?.success)
        throw new Error(data?.error || "Erro ao iniciar chamada");
      return data;
    },
    onSuccess: () => {
      toast.success("Ligação iniciada!", {
        description: "Atenda o telefone para ser conectado ao contato.",
      });
      queryClient.invalidateQueries({ queryKey: ["voice-calls", companyId] });
    },
    onError: (error: Error) => {
      if (error.message.includes("API4Com não configurada")) {
        toast.error("API4Com não configurada", {
          description: error.message,
          action: {
            label: "Configurar",
            onClick: () => {
              window.location.href = "/configuracoes/whatsapp";
            },
          },
          duration: 8000,
        });
      } else {
        toast.error("Erro ao iniciar ligação", { description: error.message });
      }
    },
  });

  return { calls, isLoading, initiateCall, isInitiating };
}

export function useApi4ComConfig(companyId: string | undefined) {
  return useQuery({
    queryKey: ["api4com-config", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_configs")
        .select("api4com_token, api4com_extension")
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return {
        hasConfig: !!(data?.api4com_token && data?.api4com_extension),
        token: data?.api4com_token || "",
        extension: data?.api4com_extension || "",
      };
    },
    enabled: !!companyId,
  });
}
