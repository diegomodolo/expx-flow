import React from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Edit, Copy, Trash2, MoreVertical, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIAAgents } from "@/hooks/useIAAgents";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Badge } from "@/components/ui/badge";

interface AgentCardProps {
  agent: {
    id: string;
    agent_name: string;
    description: string | null;
    client_id: string | null;
    created_at: string;
    client?: {
      id: string;
      name: string;
      company: string;
    } | null;
  };
  index: number;
}

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
];

export function AgentCard({ agent, index }: AgentCardProps) {
  const navigate = useNavigate();
  const { deleteAgent, duplicateAgent } = useIAAgents();
  const { hasPermission } = useEmployeePermissions();

  const handleAccess = () => {
    navigate(`/ia/agents/${agent.id}`);
  };

  const handleEdit = () => {
    navigate(`/ia/agents/${agent.id}/edit`);
  };

  const handleDuplicate = async () => {
    await duplicateAgent(agent.id);
  };

  const handleDelete = async () => {
    await deleteAgent(agent.id);
  };

  const gradient = gradients[index % gradients.length];

  return (
    <div 
      onClick={handleAccess}
      className="flex items-start gap-4 p-6 rounded-lg bg-card hover:bg-accent/50 transition-all cursor-pointer group border border-border/50"
    >
      {/* Número */}
      <div className="text-4xl font-bold text-muted-foreground/30 min-w-[2rem]">
        {index + 1}
      </div>

      {/* Ícone do Agente */}
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: gradient }}
      >
        <Bot className="w-8 h-8 text-white" />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold mb-1 truncate group-hover:text-primary transition-colors">
          {agent.agent_name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {agent.description || "Sem descrição"}
        </p>
        {agent.client ? (
          <Badge variant="secondary" className="text-xs gap-1">
            <User className="w-3 h-3" />
            {agent.client.name}
          </Badge>
        ) : (
          <p className="text-xs text-muted-foreground/70">
            Sem cliente associado
          </p>
        )}
      </div>

      {/* Menu de Ações */}
      {hasPermission('editar-agentes') && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(); }}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                  <span className="text-destructive">Excluir</span>
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todas as conversas associadas a este agente também serão excluídas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
