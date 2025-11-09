import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCRMLeads, CRMLead, CRMStage } from "@/hooks/useCRMLeads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Upload, Filter, Loader2 } from "lucide-react";
import { CRMKanbanBoard } from "@/components/crm/CRMKanbanBoard";
import { CRMLeadDetailsModal } from "@/components/crm/CRMLeadDetailsModal";
import { CRMNewLeadDialog } from "@/components/crm/CRMNewLeadDialog";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
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
  const [currentView, setCurrentView] = useState<string>('leads');

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
    <div className="flex h-screen bg-muted/30">
      {/* Sidebar */}
      <CRMSidebar activeView={currentView} onViewChange={setCurrentView} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-20 flex-shrink-0 bg-card border-b border-border">
          <div className="px-8 h-full flex items-center justify-between">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar leads..."
                className="pl-10 bg-muted/50 border-transparent"
              />
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setNewLeadDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Lead
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <div className="px-8 py-8">
              <CRMDashboard />
            </div>
          )}

          {currentView === 'leads' && (
            <div className="px-8 py-8">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Leads - {clientName}</h1>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar
                  </Button>
                  <Button variant="default" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
              
              <CRMKanbanBoard
                stages={stages}
                leads={leads}
                onMoveCard={handleMoveCard}
                onCardClick={setSelectedLead}
              />
            </div>
          )}

          {currentView === 'contacts' && (
            <div className="px-8 py-8">
              <h1 className="text-3xl font-bold mb-6">Contatos</h1>
              <p className="text-muted-foreground">Contatos em desenvolvimento...</p>
            </div>
          )}

          {currentView === 'reports' && (
            <div className="px-8 py-8">
              <h1 className="text-3xl font-bold mb-6">Relatórios</h1>
              <p className="text-muted-foreground">Relatórios em desenvolvimento...</p>
            </div>
          )}

          {currentView === 'settings' && (
            <div className="px-8 py-8">
              <h1 className="text-3xl font-bold mb-6">Configurações</h1>
              <p className="text-muted-foreground">Configurações em desenvolvimento...</p>
            </div>
          )}
        </main>
      </div>

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
