import React, { useState, useEffect } from "react";
import { Plus, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useIAAgents } from "@/hooks/useIAAgents";
import { AgentCard } from "@/components/agents/AgentCard";
import { CreateAgentDialog } from "@/components/agents/CreateAgentDialog";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";

export default function AgentesIA() {
  const { agents } = useIAAgents();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { hasPermission } = useEmployeePermissions();

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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
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
