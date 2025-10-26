import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Calendar, Edit, Copy, Trash2, Users, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useIAAgents } from "@/hooks/useIAAgents";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AgentCardProps {
  agent: {
    id: string;
    agent_name: string;
    description: string | null;
    client_id: string | null;
    created_at: string;
  };
}

export function AgentCard({ agent }: AgentCardProps) {
  const navigate = useNavigate();
  const { deleteAgent, duplicateAgent } = useIAAgents();
  const { hasPermission } = useEmployeePermissions();
  const [clientName, setClientName] = useState<string | null>(null);
  const [docsCount, setDocsCount] = useState(0);

  useEffect(() => {
    const fetchClientName = async () => {
      if (agent.client_id) {
        const { data } = await supabase
          .from('clients')
          .select('name')
          .eq('id', agent.client_id)
          .single();
        if (data) setClientName(data.name);
      }
    };

    const fetchDocsCount = async () => {
      const { count } = await supabase
        .from('ia_agent_knowledge_documents')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id);
      setDocsCount(count || 0);
    };

    fetchClientName();
    fetchDocsCount();
  }, [agent.client_id, agent.id]);

  const handleAccess = () => {
    navigate(`/ia/agents/${agent.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/ia/agents/${agent.id}/edit`);
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await duplicateAgent(agent.id);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteAgent(agent.id);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">{agent.agent_name}</CardTitle>
          </div>
        </div>
        {agent.description && (
          <CardDescription className="line-clamp-2">{agent.description}</CardDescription>
        )}
        <div className="flex gap-2 mt-3">
          {clientName && (
            <Badge variant="secondary" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {clientName}
            </Badge>
          )}
          {docsCount > 0 && (
            <Badge variant="outline" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              {docsCount} {docsCount === 1 ? 'documento' : 'documentos'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Calendar className="w-4 h-4" />
          Criado em {format(new Date(agent.created_at), "dd/MM/yyyy", { locale: ptBR })}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleAccess} className="flex-1">
            Acessar
          </Button>
          {hasPermission('editar-agentes') && (
            <>
              <Button variant="outline" size="icon" onClick={handleEdit}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleDuplicate}>
                <Copy className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="icon">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
