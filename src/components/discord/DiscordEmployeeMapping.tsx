import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserCircle, Save, ChevronsUpDown, Check, RefreshCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDiscordConfig } from "@/hooks/useDiscordConfig";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface DiscordMember {
  id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

export const DiscordEmployeeMapping = () => {
  const { config, listGuildMembers, companyId } = useDiscordConfig();
  const queryClient = useQueryClient();
  const [mappings, setMappings] = useState<Record<string, { discord_user_id: string; discord_username: string }>>({});
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<DiscordMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    if (config?.guild_id && config?.is_connected) {
      fetchMembers();
    }
  }, [config?.guild_id, config?.is_connected]);

  const fetchMembers = async () => {
    if (!config?.guild_id) return;
    setLoadingMembers(true);
    try {
      const m = await listGuildMembers(config.guild_id);
      setMembers(m.sort((a: DiscordMember, b: DiscordMember) => a.display_name.localeCompare(b.display_name)));
    } catch (err: any) {
      toast.error("Erro ao carregar membros: " + err.message);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSelectMember = (employeeId: string, member: DiscordMember | null) => {
    setMappings((prev) => ({
      ...prev,
      [employeeId]: {
        discord_user_id: member?.id || "",
        discord_username: member?.display_name || "",
      },
    }));
    setOpenPopovers((prev) => ({ ...prev, [employeeId]: false }));
  };

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCircle className="h-5 w-5" /> Colaboradores × Discord
            </CardTitle>
            <CardDescription>
              Associe os colaboradores às suas contas do Discord para receber notificações e menções.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMembers} disabled={loadingMembers}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loadingMembers && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || loadingMembers ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            {members.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {members.length} membros encontrados no servidor
              </p>
            )}
            <div className="grid gap-3">
              {employees?.map((emp: any) => {
                const selectedMember = members.find((m) => m.id === mappings[emp.id]?.discord_user_id);
                return (
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
                    <Popover
                      open={openPopovers[emp.id] || false}
                      onOpenChange={(open) => setOpenPopovers((prev) => ({ ...prev, [emp.id]: open }))}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="flex-1 justify-between"
                        >
                          {selectedMember ? (
                            <span className="flex items-center gap-2">
                              <span className="text-[#5865F2]">@</span>
                              {selectedMember.display_name}
                              <span className="text-xs text-muted-foreground">({selectedMember.username})</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Selecione um membro do Discord...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar membro..." />
                          <CommandList>
                            <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => handleSelectMember(emp.id, null)}
                                className="text-muted-foreground"
                              >
                                <Check className={cn("mr-2 h-4 w-4", !mappings[emp.id]?.discord_user_id ? "opacity-100" : "opacity-0")} />
                                Nenhum
                              </CommandItem>
                              {members.map((member) => (
                                <CommandItem
                                  key={member.id}
                                  value={`${member.display_name} ${member.username}`}
                                  onSelect={() => handleSelectMember(emp.id, member)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      mappings[emp.id]?.discord_user_id === member.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="flex items-center gap-2">
                                    <span className="text-[#5865F2]">@</span>
                                    <span>{member.display_name}</span>
                                    <span className="text-xs text-muted-foreground">({member.username})</span>
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              })}
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
