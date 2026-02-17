import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Command, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTeams } from "@/hooks/useTeams";

interface Props {
  clients: any[];
  companyId: string | undefined;
}

function parseQuickEntry(input: string, clients: any[]) {
  const clientMatch = input.match(/@([\w\sÀ-ú]+?)(?=\s[#/]|$)/i);
  const categoryMatch = input.match(/#([\w\sÀ-ú]+?)(?=\s[@/]|$)/i);
  const minutesMatch = input.match(/\/(\d+)\s*min/i);

  let clientId: string | null = null;
  if (clientMatch) {
    const search = clientMatch[1].toLowerCase().trim();
    const found = clients.find((c: any) => c.name.toLowerCase().includes(search));
    if (found) clientId = found.id;
  }

  // Clean title: remove tokens
  let title = input
    .replace(/@[\w\sÀ-ú]+/i, "")
    .replace(/#[\w\sÀ-ú]+/i, "")
    .replace(/\/\d+\s*min/i, "")
    .trim();

  return {
    title: title || input,
    clientId,
    category: categoryMatch?.[1]?.trim() || null,
    minutes: minutesMatch ? parseInt(minutesMatch[1]) : 18,
  };
}

export function BacklogQuickEntry({ clients, companyId }: Props) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { teams } = useTeams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!value.trim() || !user || !companyId) return;
    setSubmitting(true);

    try {
      const parsed = parseQuickEntry(value, clients);
      const defaultTeam = teams[0];

      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          title: parsed.title,
          description: "",
          status: "todo" as any,
          priority: "medium" as any,
          task_type: parsed.category || "geral",
          ai_estimated_minutes: parsed.minutes,
          responsible_name: user.user_metadata?.full_name || "Admin",
          user_id: user.id,
          team_id: defaultTeam?.id || "",
          company_id: companyId,
          deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
          progress: 0,
          related_client_id: parsed.clientId,
        })
        .select()
        .single();

      if (error) throw error;

      // If client found, also add to task_clients
      if (parsed.clientId && task) {
        await supabase.from("task_clients" as any).insert({
          task_id: task.id,
          client_id: parsed.clientId,
          company_id: companyId,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["backlog-center-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["backlog-center-task-clients"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setValue("");
      toast({ title: "Tarefa criada", description: `"${parsed.title}" adicionada ao backlog.` });
    } catch (err) {
      console.error("Quick entry error:", err);
      toast({ title: "Erro", description: "Falha ao criar tarefa.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 border-b">
      <div className="relative">
        <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !submitting) handleSubmit();
          }}
          placeholder="Post Black Friday @Cliente #Design /18min — Enter para criar"
          className="pl-9 pr-20 h-10 text-sm"
          disabled={submitting}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Command className="w-3 h-3" />
          <span>Enter</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
        Use <span className="font-medium">@cliente</span> para vincular, <span className="font-medium">#categoria</span> para tipo, <span className="font-medium">/18min</span> para tempo
      </p>
    </div>
  );
}
