import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, LayoutGrid, Settings } from "lucide-react";
import { CRMBoard } from "@/hooks/useCRMBoards";

interface BoardSelectorProps {
  boards: CRMBoard[];
  selectedBoardId: string;
  onBoardChange: (boardId: string) => void;
  onCreateBoard: () => void;
  onEditBoard: () => void;
}

export function BoardSelector({ 
  boards, 
  selectedBoardId, 
  onBoardChange, 
  onCreateBoard,
  onEditBoard
}: BoardSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <Select value={selectedBoardId} onValueChange={onBoardChange}>
        <SelectTrigger className="w-[280px]">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            <SelectValue placeholder="Selecione um quadro" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {boards.map((board) => (
            <SelectItem key={board.id} value={board.id}>
              {board.name}
              {board.is_default && " (Padrão)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={onEditBoard}
        title="Configurações do quadro"
      >
        <Settings className="w-4 h-4" />
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={onCreateBoard}
      >
        <Plus className="w-4 h-4 mr-2" />
        Novo Quadro
      </Button>
    </div>
  );
}
