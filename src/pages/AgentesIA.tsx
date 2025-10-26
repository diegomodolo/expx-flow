import React, { useState, useEffect } from "react";
import { Plus, Bot, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useIAAgents } from "@/hooks/useIAAgents";
import { AgentCard } from "@/components/agents/AgentCard";
import { CreateAgentDialog } from "@/components/agents/CreateAgentDialog";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";

export default function AgentesIA() {
  const { agents } = useIAAgents();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { hasPermission } = useEmployeePermissions();

  // Filtrar agentes baseado no termo de busca
  const filteredAgents = agents.filter((agent) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      agent.agent_name.toLowerCase().includes(searchLower) ||
      (agent.description && agent.description.toLowerCase().includes(searchLower))
    );
  });

  // Log para debug - verificar se a lista está atualizando
  useEffect(() => {
    console.log('Agentes atualizados:', agents.length);
  }, [agents]);

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bot className="w-8 h-8" />
              Agentes de Inteligência Artificial
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie e gerencie seus assistentes de IA personalizados
            </p>
          </div>
          {hasPermission('editar-agentes') && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Agente
            </Button>
          )}
        </div>

        {/* Campo de Busca */}
        {agents.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar agentes por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Grid de Cards */}
        {agents.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum agente criado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro agente de IA para começar
            </p>
            {hasPermission('editar-agentes') && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            )}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum agente encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os termos da sua busca
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}

        {/* Dialog de Criação */}
        <CreateAgentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
}
