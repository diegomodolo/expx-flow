import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Trash2, GripVertical } from "lucide-react";
import { useCRMBoards } from "@/hooks/useCRMBoards";
import { useCRMStages } from "@/hooks/useCRMStages";
import { useCRMLeads } from "@/hooks/useCRMLeads";
import { CRMStage } from "@/hooks/useCRMDeals";
import { CreateBoardDialog } from "@/components/crm/CreateBoardDialog";
import { EditBoardDialog } from "@/components/crm/EditBoardDialog";
import { CreateStageDialog } from "@/components/crm/CreateStageDialog";
import { EditStageModal } from "@/components/crm/EditStageModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PipelineSettingsProps {
  workspaceId: string;
}

export function PipelineSettings({ workspaceId }: PipelineSettingsProps) {
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [createBoardDialogOpen, setCreateBoardDialogOpen] = useState(false);
  const [editBoardDialogOpen, setEditBoardDialogOpen] = useState(false);
  const [createStageDialogOpen, setCreateStageDialogOpen] = useState(false);
  const [editStageModalOpen, setEditStageModalOpen] = useState(false);
  const [stageToEdit, setStageToEdit] = useState<CRMStage | null>(null);

  const {
    boards,
    createBoard,
    updateBoard,
    deleteBoard,
    isUpdatingBoard,
    isDeletingBoard,
  } = useCRMBoards({ workspaceId });

  const { stages } = useCRMLeads(workspaceId, selectedBoardId);
  
  const { updateStage, createStage, deleteStage } = useCRMStages({
    workspaceId,
    boardId: selectedBoardId,
  });

  // Selecionar primeiro board por padrão
  if (boards.length > 0 && !selectedBoardId) {
    const defaultBoard = boards.find((b) => b.is_default) || boards[0];
    setSelectedBoardId(defaultBoard.id);
  }

  const selectedBoard = boards.find((b) => b.id === selectedBoardId) || null;

  const handleCreateBoard = async (boardData: { name: string; description?: string }) => {
    const newBoardId = await createBoard(boardData);
    setSelectedBoardId(newBoardId);
    setCreateBoardDialogOpen(false);
  };

  const handleUpdateBoard = async (
    boardId: string,
    updates: { name?: string; description?: string | null }
  ) => {
    await updateBoard({ boardId, updates });
  };

  const handleDeleteBoard = async (boardId: string) => {
    await deleteBoard(boardId);
    const defaultBoard = boards.find((b) => b.is_default);
    if (defaultBoard) {
      setSelectedBoardId(defaultBoard.id);
    }
  };

  const handleCreateStage = async (stageData: {
    name: string;
    color: string;
    event_mapping: string | null;
    auto_status_change: boolean;
    target_status: string | null;
    auto_temperature_change?: boolean;
    target_temperature?: "frio" | "morno" | "quente";
  }) => {
    await createStage(stageData);
  };

  const handleSaveStage = async (stageId: string, updates: Partial<CRMStage>) => {
    await updateStage({ stageId, updates });
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta coluna? Esta ação não pode ser desfeita.")) {
      return;
    }
    await deleteStage(stageId);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Quadros (Boards)</h2>
              <p className="text-muted-foreground">
                Gerencie os diferentes quadros do seu funil de vendas.
              </p>
            </div>
            <Button onClick={() => setCreateBoardDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Quadro
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Selecione um quadro" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((board) => (
                  <SelectItem key={board.id} value={board.id}>
                    {board.name} {board.is_default && "(Padrão)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedBoard && (
              <Button variant="outline" onClick={() => setEditBoardDialogOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Editar Quadro
              </Button>
            )}
          </div>
        </div>
      </Card>

      {selectedBoardId && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Estágios do Funil</h2>
                <p className="text-muted-foreground">
                  Configure os estágios de {selectedBoard?.name || "este quadro"}.
                </p>
              </div>
              <Button onClick={() => setCreateStageDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Coluna
              </Button>
            </div>

            <div className="space-y-2">
              {stages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum estágio cadastrado ainda.
                </div>
              ) : (
                stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{stage.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {stage.event_mapping && (
                          <Badge variant="secondary" className="text-xs">
                            Evento: {stage.event_mapping}
                          </Badge>
                        )}
                        {stage.auto_status_change && (
                          <Badge variant="secondary" className="text-xs">
                            Status: {stage.target_status}
                          </Badge>
                        )}
                        {stage.auto_temperature_change && (
                          <Badge variant="secondary" className="text-xs">
                            Temperatura: {stage.target_temperature}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStageToEdit(stage);
                          setEditStageModalOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStage(stage.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      )}

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

      <CreateStageDialog
        isOpen={createStageDialogOpen}
        onClose={() => setCreateStageDialogOpen(false)}
        onCreate={handleCreateStage}
      />

      <EditStageModal
        isOpen={editStageModalOpen}
        onClose={() => {
          setEditStageModalOpen(false);
          setStageToEdit(null);
        }}
        stage={stageToEdit}
        onSave={handleSaveStage}
        workspaceId={workspaceId}
      />
    </div>
  );
}
