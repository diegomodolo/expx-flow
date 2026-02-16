import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Hash, Users, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDiscordConfig } from "@/hooks/useDiscordConfig";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const DiscordSquadChannels = () => {
  const { config, listChannels, companyId } = useDiscordConfig();
  const queryClient = useQueryClient();
  const [channels, setChannels] = useState<any[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: squads, isLoading: loadingSquads } = useQuery({
    queryKey: ["squads-discord", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("teams")
        .select("id, name, color, discord_channel_id, discord_channel_name")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (squads) {
      const initial: Record<string, string> = {};
      squads.forEach((s: any) => {
        if (s.discord_channel_id) initial[s.id] = s.discord_channel_id;
      });
      setAssignments(initial);
    }
  }, [squads]);

  useEffect(() => {
    if (config?.guild_id && config?.is_connected) {
      fetchChannels();
    }
  }, [config?.guild_id, config?.is_connected]);

  const fetchChannels = async () => {
    if (!config?.guild_id) return;
    setLoadingChannels(true);
    try {
      const ch = await listChannels(config.guild_id);
      setChannels(ch);
    } catch (err: any) {
      toast.error("Erro ao carregar canais: " + err.message);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const squad of squads || []) {
        const channelId = assignments[squad.id] || null;
        const channel = channels.find((c) => c.id === channelId);
        await (supabase as any)
          .from("teams")
          .update({
            discord_channel_id: channelId,
            discord_channel_name: channel?.name || null,
          })
          .eq("id", squad.id);
      }
      queryClient.invalidateQueries({ queryKey: ["squads-discord"] });
      toast.success("Canais dos squads atualizados!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!config?.is_connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Squads × Canais
          </CardTitle>
          <CardDescription>Configure a conexão do bot primeiro para associar squads a canais.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" /> Squads × Canais
        </CardTitle>
        <CardDescription>Associe cada squad a um canal do Discord para receber notificações.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingSquads || loadingChannels ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            {squads?.map((squad: any) => (
              <div key={squad.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-[140px]">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: squad.color || "#6366f1" }} />
                  <span className="text-sm font-medium">{squad.name}</span>
                </div>
                <Select
                  value={assignments[squad.id] || "none"}
                  onValueChange={(v) =>
                    setAssignments((prev) => ({ ...prev, [squad.id]: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" /> {ch.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {squad.discord_channel_name && (
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    #{squad.discord_channel_name}
                  </Badge>
                )}
              </div>
            ))}
            <Button onClick={handleSave} disabled={saving} className="mt-2">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Associações
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
