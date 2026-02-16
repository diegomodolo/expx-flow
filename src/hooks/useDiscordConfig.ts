import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

export const useDiscordConfig = () => {
  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const { data: config, isLoading } = useQuery({
    queryKey: ["discord-config", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("discord_config")
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const saveConfig = useMutation({
    mutationFn: async ({ guild_id, guild_name, is_connected, enabled }: { guild_id: string; guild_name?: string; is_connected?: boolean; enabled?: boolean }) => {
      if (config?.id) {
        const { error } = await (supabase as any)
          .from("discord_config")
          .update({ guild_id, guild_name, is_connected, enabled })
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("discord_config")
          .insert({ company_id: companyId, guild_id, guild_name, is_connected, enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discord-config"] });
      toast.success("Configuração do Discord salva!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const testConnection = async (guild_id: string) => {
    const res = await supabase.functions.invoke("discord-bot", {
      body: { action: "test-connection", guild_id },
    });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  const listChannels = async (guild_id: string) => {
    const res = await supabase.functions.invoke("discord-bot", {
      body: { action: "list-channels", guild_id },
    });
    if (res.error) throw new Error(res.error.message);
    return res.data?.channels || [];
  };

  const listGuildMembers = async (guild_id: string) => {
    const res = await supabase.functions.invoke("discord-bot", {
      body: { action: "list-guild-members", guild_id },
    });
    if (res.error) throw new Error(res.error.message);
    return res.data?.members || [];
  };

  const sendMessage = async (channel_id: string, content: string) => {
    const res = await supabase.functions.invoke("discord-bot", {
      body: { action: "send-message", channel_id, content },
    });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  return {
    config,
    isLoading,
    saveConfig,
    testConnection,
    listChannels,
    listGuildMembers,
    sendMessage,
    companyId,
  };
};
