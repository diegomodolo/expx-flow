import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Bot, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { CreateAgentModal } from "./CreateAgentModal";

interface Agent {
  id: string;
  agent_name: string;
  description: string | null;
  client_id: string | null;
}

interface SquadAgentLibraryProps {
  clientId?: string;
  onDragStart: (event: React.DragEvent, agent: Agent) => void;
}

export function SquadAgentLibrary({ clientId, onDragStart }: SquadAgentLibraryProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { activeCompany } = useCompany();

  const fetchAgents = async () => {
    if (!activeCompany?.company_id) return;
    let query = supabase
      .from("ia_agents")
      .select("id, agent_name, description, client_id")
      .eq("company_id", activeCompany.company_id);

    if (clientId) {
      query = query.or(`client_id.eq.${clientId},client_id.is.null`);
    }

    const { data } = await query.order("agent_name");
    setAgents((data || []) as Agent[]);
  };

  useEffect(() => {
    fetchAgents();
  }, [activeCompany?.company_id, clientId, refreshKey]);

  const filtered = agents.filter((a) =>
    a.agent_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-64 border-r bg-card h-full flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Agentes Disponíveis</h3>
            <p className="text-xs text-muted-foreground mt-1">Arraste para o canvas</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCreateModalOpen(true)}
            title="Criar novo agente"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar agentes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filtered.map((agent) => (
            <div
              key={agent.id}
              draggable
              onDragStart={(e) => onDragStart(e, agent)}
              className="px-3 py-2.5 rounded-md border bg-background cursor-grab active:cursor-grabbing hover:border-primary hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{agent.agent_name}</div>
                  {agent.description && (
                    <div className="text-xs text-muted-foreground truncate">{agent.description}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhum agente encontrado
            </div>
          )}
        </div>
      </ScrollArea>

      <CreateAgentModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultClientId={clientId}
        onAgentCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
