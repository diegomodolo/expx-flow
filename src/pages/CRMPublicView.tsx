import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Upload, Loader2 } from "lucide-react";
import { CRMKanbanBoard } from "@/components/crm/CRMKanbanBoard";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { CRMLeadEditModal } from "@/components/crm/CRMLeadEditModal";
import { CRMNewLeadDialog } from "@/components/crm/CRMNewLeadDialog";
import { CreateStageDialog } from "@/components/crm/CreateStageDialog";
import { EditStageModal } from "@/components/crm/EditStageModal";
import { BoardSelector } from "@/components/crm/BoardSelector";
import { CreateBoardDialog } from "@/components/crm/CreateBoardDialog";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
import { CRMLeadsTable } from "@/components/crm/CRMLeadsTable";
import { useCRMLeads, CRMLead, CRMStage } from "@/hooks/useCRMLeads";
import { useCRMStages } from "@/hooks/useCRMStages";
import { useCRMBoards } from "@/hooks/useCRMBoards";

interface Workspace {
  id: string;
  access_token: string;
  is_active: boolean;
  client_id: string;
}

export default function CRMPublicView() {
  const { token } = useParams();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [newLeadDialogOpen, setNewLeadDialogOpen] = useState(false);
  const [leadEditModalOpen, setLeadEditModalOpen] = useState(false);
  const [createStageDialogOpen, setCreateStageDialogOpen] = useState(false);
  const [createBoardDialogOpen, setCreateBoardDialogOpen] = useState(false);
  const [editStageModalOpen, setEditStageModalOpen] = useState(false);
  const [stageToEdit, setStageToEdit] = useState<CRMStage | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'leads' | 'contacts' | 'reports' | 'settings'>('leads');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [leadsSearchTerm, setLeadsSearchTerm] = useState('');

  // Hook para boards
  const { boards, createBoard, isLoading: isLoadingBoards } = useCRMBoards({ 
    workspaceId: workspace?.id || '' 
  });

  // Hook para leads e stages com boardId
  const { leads, stages, isLoading, moveLead, createLead, updateLead } = useCRMLeads(
    workspace?.id || '', 
    selectedBoardId
  );
  
  // Hook para stages com boardId
  const { updateStage, reorderStages, createStage, deleteStage } = useCRMStages({ 
    workspaceId: workspace?.id || '',
    boardId: selectedBoardId
  });

  useEffect(() => {
    const fetchWorkspace = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('crm_workspaces')
        .select('*')
        .eq('access_token', token)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('Error fetching workspace:', error);
        setWorkspace(null);
      } else {
        setWorkspace(data);
      }
      
      setLoading(false);
    };

    fetchWorkspace();
  }, [token]);

  // Selecionar board padrão quando boards carregarem
  useEffect(() => {
    if (boards && boards.length > 0 && !selectedBoardId) {
      const defaultBoard = boards.find(b => b.is_default) || boards[0];
      setSelectedBoardId(defaultBoard.id);
    }
  }, [boards, selectedBoardId]);

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

  const handleEditStage = (stage: CRMStage) => {
    setStageToEdit(stage);
    setEditStageModalOpen(true);
  };

  const handleSaveStage = async (stageId: string, updates: Partial<CRMStage>) => {
    await updateStage({ stageId, updates });
  };

  const handleReorderStages = async (reorderedStages: CRMStage[]) => {
    await reorderStages(reorderedStages);
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta coluna? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      await deleteStage(stageId);
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleCreateStage = async (stageData: {
    name: string;
    color: string;
    event_mapping: string | null;
    auto_status_change: boolean;
    target_status: string | null;
  }) => {
    await createStage(stageData);
  };

  const handleCreateBoard = async (boardData: { name: string; description?: string }) => {
    const newBoardId = await createBoard(boardData);
    setSelectedBoardId(newBoardId);
    setCreateBoardDialogOpen(false);
  };

  if (loading || isLoadingBoards) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <CRMSidebar 
        activeView={currentView} 
        onViewChange={(view) => setCurrentView(view as typeof currentView)} 
      />

      <div className="flex-1 flex flex-col">
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

        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <div className="px-8 py-8">
              <CRMDashboard workspaceId={workspace.id} />
            </div>
          )}

          {currentView === 'leads' && (
            <div className="px-8 py-8">
              <div className="flex items-center justify-between mb-6">
                <BoardSelector
                  boards={boards}
                  selectedBoardId={selectedBoardId}
                  onBoardChange={setSelectedBoardId}
                  onCreateBoard={() => setCreateBoardDialogOpen(true)}
                />
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCreateStageDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Coluna
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
                onCardClick={(lead) => {
                  setSelectedLead(lead);
                  setLeadEditModalOpen(true);
                }}
                onEditStage={handleEditStage}
                onDeleteStage={handleDeleteStage}
                onReorderStages={handleReorderStages}
              />
            </div>
          )}

        {currentView === 'contacts' && (
          <div className="px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Leads</h1>
                <p className="text-muted-foreground">
                  {leads.length} {leads.length === 1 ? 'lead cadastrado' : 'leads cadastrados'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email, telefone ou empresa..."
                    value={leadsSearchTerm}
                    onChange={(e) => setLeadsSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Button onClick={() => setNewLeadDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Lead
                </Button>
              </div>
            </div>

            <CRMLeadsTable
              leads={leads}
              stages={stages}
              onLeadClick={(lead) => {
                setSelectedLead(lead);
                setLeadEditModalOpen(true);
              }}
              searchTerm={leadsSearchTerm}
            />
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

      <CRMLeadEditModal
        lead={selectedLead}
        stages={stages}
        isOpen={leadEditModalOpen}
        onClose={() => {
          setLeadEditModalOpen(false);
          setSelectedLead(null);
        }}
        workspaceId={workspace.id}
        boardId={selectedBoardId || ''}
      />

      <CRMNewLeadDialog
        isOpen={newLeadDialogOpen}
        onClose={() => setNewLeadDialogOpen(false)}
        stages={stages}
        workspaceId={workspace.id}
        boardId={selectedBoardId}
      />

      <EditStageModal
        isOpen={editStageModalOpen}
        onClose={() => {
          setEditStageModalOpen(false);
          setStageToEdit(null);
        }}
        stage={stageToEdit}
        onSave={handleSaveStage}
        workspaceId={workspace.id}
      />

      <CreateStageDialog
        isOpen={createStageDialogOpen}
        onClose={() => setCreateStageDialogOpen(false)}
        onCreate={handleCreateStage}
      />

      <CreateBoardDialog
        isOpen={createBoardDialogOpen}
        onClose={() => setCreateBoardDialogOpen(false)}
        onCreate={handleCreateBoard}
      />
    </div>
  );
}
