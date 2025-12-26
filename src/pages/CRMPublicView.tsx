import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCRMAuth } from "@/contexts/CRMAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Upload, Loader2 } from "lucide-react";
import { CRMKanbanBoard } from "@/components/crm/CRMKanbanBoard";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { CRMDealDetailsModal } from "@/components/crm/CRMDealDetailsModal";
import { CRMNewLeadDialog } from "@/components/crm/CRMNewLeadDialog";
import { CreateStageDialog } from "@/components/crm/CreateStageDialog";
import { EditStageModal } from "@/components/crm/EditStageModal";
import { BoardSelector } from "@/components/crm/BoardSelector";
import { CreateBoardDialog } from "@/components/crm/CreateBoardDialog";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
import { CRMLeadsTable } from "@/components/crm/CRMLeadsTable";
import { CRMReports } from "@/components/crm/CRMReports";
import { LeadFiltersDialog, LeadFilters } from "@/components/crm/LeadFiltersDialog";
import { EditBoardDialog } from "@/components/crm/EditBoardDialog";
import { ClienteCRMSettings } from "@/pages/cliente/ClienteCRMSettings";
import { useCRMDeals, CRMDeal, CRMStage } from "@/hooks/useCRMDeals";
import { useCRMStages } from "@/hooks/useCRMStages";
import { useCRMBoards } from "@/hooks/useCRMBoards";
import { Badge } from "@/components/ui/badge";
import { CRMStatusBar } from "@/components/crm/CRMStatusBar";
import { toast } from "sonner";

interface Workspace {
  id: string;
  access_token: string;
  is_active: boolean;
  client_id: string;
}

export default function CRMPublicView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, checkAuth } = useCRMAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<CRMDeal | null>(null);
  const [newLeadDialogOpen, setNewLeadDialogOpen] = useState(false);
  const [dealDetailsModalOpen, setDealDetailsModalOpen] = useState(false);
  const [createStageDialogOpen, setCreateStageDialogOpen] = useState(false);
  const [createBoardDialogOpen, setCreateBoardDialogOpen] = useState(false);
  const [editStageModalOpen, setEditStageModalOpen] = useState(false);
  const [stageToEdit, setStageToEdit] = useState<CRMStage | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'leads' | 'contacts' | 'reports' | 'settings'>('leads');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [leadsSearchTerm, setLeadsSearchTerm] = useState('');
  const [leadFilters, setLeadFilters] = useState<LeadFilters>({});
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [editBoardDialogOpen, setEditBoardDialogOpen] = useState(false);
  const [movingDealIds, setMovingDealIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Hook para boards
  const { 
    boards, 
    createBoard, 
    updateBoard, 
    deleteBoard, 
    isLoading: isLoadingBoards,
    isUpdatingBoard,
    isDeletingBoard
  } = useCRMBoards({ 
    workspaceId: workspace?.id || '' 
  });

  // Hook para deals com boardId
  const { deals, stages, isLoading, moveDeal, updateDeal } = useCRMDeals(
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

  // Verificar autenticação
  useEffect(() => {
    if (!token) return;
    
    // Se não estiver carregando e não estiver autenticado, redirecionar para login
    if (!loading && workspace && !isAuthenticated) {
      const hasValidSession = checkAuth(workspace.id);
      if (!hasValidSession) {
        navigate(`/crm/${token}/login`);
      }
    }
  }, [token, loading, workspace, isAuthenticated, checkAuth, navigate]);

  // Selecionar board padrão quando boards carregarem
  useEffect(() => {
    if (boards && boards.length > 0 && !selectedBoardId) {
      const defaultBoard = boards.find(b => b.is_default) || boards[0];
      setSelectedBoardId(defaultBoard.id);
    }
  }, [boards, selectedBoardId]);

  const handleMoveCard = async (dealId: string, toStageId: string, fromStageId: string) => {
    if (!workspace) return;

    try {
      setMovingDealIds(prev => new Set(prev).add(dealId));
      await moveDeal({
        dealId,
        toStageId,
        fromStageId,
      });
    } catch (error) {
      console.error('Error moving deal:', error);
    } finally {
      setMovingDealIds(prev => {
        const next = new Set(prev);
        next.delete(dealId);
        return next;
      });
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

  const handleUpdateBoard = async (boardId: string, updates: { name?: string; description?: string | null }) => {
    await updateBoard({ boardId, updates });
  };

  const handleDeleteBoard = async (boardId: string) => {
    await deleteBoard(boardId);
    // Selecionar board padrão após deletar
    const defaultBoard = boards.find(b => b.is_default);
    if (defaultBoard) {
      setSelectedBoardId(defaultBoard.id);
    }
  };

  const handleStatusDrop = async (dealId: string, newStatus: string) => {
    try {
      await updateDeal({ id: dealId, status: newStatus as 'open' | 'won' | 'lost' });
      toast.success(`Status alterado para ${
        newStatus === 'open' ? 'Aberto' : 
        newStatus === 'qualified' ? 'Qualificado' : 
        newStatus === 'unqualified' ? 'Não Qualificado' : 
        newStatus === 'won' ? 'Ganho' : 'Perdido'
      }`);
    } catch (error) {
      console.error('Error updating deal status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const filterDeals = (dealsToFilter: CRMDeal[]) => {
    let filtered = [...dealsToFilter];

    if (leadFilters.status) {
      filtered = filtered.filter(deal => deal.status === leadFilters.status);
    }

    if (leadFilters.temperature) {
      filtered = filtered.filter(deal => deal.temperature === leadFilters.temperature);
    }

    if (leadFilters.stageId) {
      filtered = filtered.filter(deal => deal.stage_id === leadFilters.stageId);
    }

    if (leadFilters.minValue !== undefined) {
      filtered = filtered.filter(deal => (deal.value || 0) >= leadFilters.minValue!);
    }

    if (leadFilters.maxValue !== undefined) {
      filtered = filtered.filter(deal => (deal.value || 0) <= leadFilters.maxValue!);
    }

    if (leadFilters.dateFrom) {
      filtered = filtered.filter(deal => new Date(deal.created_at) >= new Date(leadFilters.dateFrom!));
    }

    if (leadFilters.dateTo) {
      filtered = filtered.filter(deal => new Date(deal.created_at) <= new Date(leadFilters.dateTo!));
    }

    return filtered;
  };

  // Aplicar filtro de status da barra + filtros do dialog
  let filteredDeals = filterDeals(deals);
  if (statusFilter) {
    filteredDeals = filteredDeals.filter(deal => deal.status === statusFilter);
  }
  const activeFiltersCount = Object.values(leadFilters).filter(v => v !== undefined && v !== '').length;
  const selectedBoard = boards.find(b => b.id === selectedBoardId) || null;

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
                placeholder="Buscar negócios..."
                className="pl-10 bg-muted/50 border-transparent"
              />
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setNewLeadDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Negócio
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
                  onEditBoard={() => setEditBoardDialogOpen(true)}
                />
                <div className="flex items-center gap-3">
                  <Button 
                    variant={activeFiltersCount > 0 ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setFiltersDialogOpen(true)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                        {activeFiltersCount}
                      </Badge>
                    )}
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

              <CRMStatusBar
                onStatusDrop={handleStatusDrop}
                activeStatusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />

              <CRMKanbanBoard
                stages={stages}
                deals={filteredDeals}
                onMoveCard={handleMoveCard}
                onCardClick={(deal) => {
                  setSelectedDeal(deal);
                  setDealDetailsModalOpen(true);
                }}
                onEditStage={handleEditStage}
                onDeleteStage={handleDeleteStage}
                onReorderStages={handleReorderStages}
                movingDealIds={movingDealIds}
              />
            </div>
          )}

        {currentView === 'contacts' && (
          <div className="px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Contatos</h1>
                <p className="text-muted-foreground">
                  {deals.length} {deals.length === 1 ? 'negócio cadastrado' : 'negócios cadastrados'}
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
                  Novo Negócio
                </Button>
              </div>
            </div>

            {/* TODO: Update CRMLeadsTable to use deals */}
            <div className="text-center py-12 text-muted-foreground">
              <p>Tabela de contatos em atualização</p>
            </div>
          </div>
        )}

          {currentView === 'reports' && (
            <div className="px-8 py-8">
              <CRMReports workspaceId={workspace.id} />
            </div>
          )}

          {currentView === 'settings' && token && (
            <ClienteCRMSettings workspaceId={workspace.id} workspaceToken={token} />
          )}
        </main>
      </div>

      <CRMDealDetailsModal
        deal={selectedDeal}
        stages={stages}
        boards={boards}
        isOpen={dealDetailsModalOpen}
        onClose={() => {
          setDealDetailsModalOpen(false);
          setSelectedDeal(null);
        }}
        onUpdateDeal={updateDeal}
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

      <EditBoardDialog
        isOpen={editBoardDialogOpen}
        onClose={() => setEditBoardDialogOpen(false)}
        board={selectedBoard}
        onUpdate={handleUpdateBoard}
        onDelete={handleDeleteBoard}
        isUpdating={isUpdatingBoard}
        isDeleting={isDeletingBoard}
      />

      <LeadFiltersDialog
        isOpen={filtersDialogOpen}
        onClose={() => setFiltersDialogOpen(false)}
        stages={stages}
        filters={leadFilters}
        onApplyFilters={setLeadFilters}
      />
    </div>
  );
}
