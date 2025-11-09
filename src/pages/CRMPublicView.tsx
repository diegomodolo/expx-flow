import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCRMLeads, CRMLead, CRMStage } from "@/hooks/useCRMLeads";
import { Button } from "@/components/ui/button";
import { Plus, Users, Loader2 } from "lucide-react";
import { CRMKanbanBoard } from "@/components/crm/CRMKanbanBoard";
import { CRMLeadDetailsModal } from "@/components/crm/CRMLeadDetailsModal";
import { CRMNewLeadDialog } from "@/components/crm/CRMNewLeadDialog";
import { useToast } from "@/hooks/use-toast";

interface Workspace {
  id: string;
  access_token: string;
  is_active: boolean;
  client_id: string;
}

export default function CRMPublicView() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [newLeadDialogOpen, setNewLeadDialogOpen] = useState(false);
  const [clientName, setClientName] = useState('');

  const { leads, stages, isLoading, moveLead } = useCRMLeads(workspace?.id || '');

  useEffect(() => {
    const loadWorkspace = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Buscar workspace pelo token
        const { data: workspaceData, error } = await supabase
          .from('crm_workspaces')
          .select('*, clients(name)')
          .eq('access_token', token)
          .eq('is_active', true)
          .single();

        if (error || !workspaceData) {
          console.error('Workspace not found:', error);
          toast({
            title: "CRM não encontrado",
            description: "Este link de acesso é inválido ou o CRM foi desativado.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        setWorkspace(workspaceData);
        setClientName((workspaceData as any).clients?.name || 'Cliente');
      } catch (error) {
        console.error('Error loading workspace:', error);
        toast({
          title: "Erro ao carregar CRM",
          description: "Não foi possível carregar o CRM. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [token, toast]);

  const handleMoveCard = async (leadId: string, toStageId: string, fromStageId: string) => {
    if (!workspace) return;

    try {
      await moveLead({
        leadId,
        toStageId,
        fromStageId,
        workspaceToken: workspace.access_token,
      });
    } catch (error) {
      console.error('Error moving lead:', error);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">CRM não encontrado</h1>
          <p className="text-muted-foreground">
            Este link de acesso é inválido ou o CRM foi desativado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Mini CRM - {clientName}</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie seus leads e acompanhe a jornada de conversão
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                Usuários
              </Button>
              <Button size="sm" onClick={() => setNewLeadDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Lead
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 lg:px-6 py-6">
        <CRMKanbanBoard
          stages={stages}
          leads={leads}
          onMoveCard={handleMoveCard}
          onCardClick={setSelectedLead}
        />
      </main>

      {/* Modals */}
      <CRMLeadDetailsModal
        lead={selectedLead}
        stages={stages}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />

      <CRMNewLeadDialog
        isOpen={newLeadDialogOpen}
        onClose={() => setNewLeadDialogOpen(false)}
        stages={stages}
        workspaceId={workspace.id}
      />
    </div>
  );
}
