import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserCircle, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDiscordConfig } from "@/hooks/useDiscordConfig";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const DiscordEmployeeMapping = () => {
  const { config, companyId } = useDiscordConfig();
  const queryClient = useQueryClient();
  const [mappings, setMappings] = useState<Record<string, { discord_user_id: string; discord_username: string }>>({});
  const [saving, setSaving] = useState(false);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees-discord", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("employees")
        .select("id, name, email, discord_user_id, discord_username")
        .eq("company_id", companyId!)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (employees) {
      const initial: Record<string, any> = {};
      employees.forEach((e: any) => {
        initial[e.id] = {
          discord_user_id: e.discord_user_id || "",
          discord_username: e.discord_username || "",
        };
      });
      setMappings(initial);
    }
  }, [employees]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const emp of employees || []) {
        const mapping = mappings[emp.id];
        if (mapping) {
          await (supabase as any)
            .from("employees")
            .update({
              discord_user_id: mapping.discord_user_id || null,
              discord_username: mapping.discord_username || null,
            })
            .eq("id", emp.id);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["employees-discord"] });
      toast.success("Mapeamento de colaboradores atualizado!");
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
            <UserCircle className="h-5 w-5" /> Colaboradores × Discord
          </CardTitle>
          <CardDescription>Configure a conexão do bot primeiro para mapear colaboradores.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCircle className="h-5 w-5" /> Colaboradores × Discord
        </CardTitle>
        <CardDescription>
          Associe os colaboradores às suas contas do Discord para receber notificações e menções.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              {employees?.map((emp: any) => (
                <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg border">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {emp.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-[120px]">
                    <p className="text-sm font-medium">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </div>
                  <Input
                    placeholder="Discord User ID"
                    value={mappings[emp.id]?.discord_user_id || ""}
                    onChange={(e) =>
                      setMappings((prev) => ({
                        ...prev,
                        [emp.id]: { ...prev[emp.id], discord_user_id: e.target.value },
                      }))
                    }
                    className="flex-1"
                  />
                  <Input
                    placeholder="Username (ex: joao#1234)"
                    value={mappings[emp.id]?.discord_username || ""}
                    onChange={(e) =>
                      setMappings((prev) => ({
                        ...prev,
                        [emp.id]: { ...prev[emp.id], discord_username: e.target.value },
                      }))
                    }
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Mapeamento
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
