import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronRight, Columns3, User } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { BoardGroup } from "@/hooks/useAllBoardColumns";
import { Skeleton } from "@/components/ui/skeleton";

interface FlowBoardSidebarProps {
  boards: BoardGroup[];
  isLoading: boolean;
}

export function FlowBoardSidebar({ boards, isLoading }: FlowBoardSidebarProps) {
  const [search, setSearch] = useState("");
  const [expandedBoards, setExpandedBoards] = useState<Record<string, boolean>>({});

  const filteredBoards = (boards || [])
    .map((board) => ({
      ...board,
      columns: (board.columns || []).filter(
        (col) =>
          col.name?.toLowerCase().includes(search.toLowerCase()) ||
          board.owner_name?.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((board) => board.columns.length > 0);

  const toggleBoard = (userId: string) => {
    setExpandedBoards((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const onDragStart = (event: React.DragEvent, col: BoardGroup["columns"][0]) => {
    event.dataTransfer.setData(
      "application/task-flow-column",
      JSON.stringify(col)
    );
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full overflow-hidden flex-shrink-0">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold text-foreground mb-2">Quadros & Colunas</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar quadro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))
        ) : filteredBoards.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhum quadro encontrado
          </p>
        ) : (
          filteredBoards.map((board) => (
            <Collapsible
              key={board.user_id}
              open={expandedBoards[board.user_id] ?? false}
              onOpenChange={() => toggleBoard(board.user_id)}
            >
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 text-left transition-colors">
                  {expandedBoards[board.user_id] ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground truncate">
                    {board.owner_name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {board.columns.length}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-5 space-y-0.5 mt-0.5">
                  {board.columns.map((col) => (
                    <div
                      key={col.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, col)}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-grab active:cursor-grabbing",
                        "hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                      )}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: col.color }}
                      />
                      <Columns3 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground truncate">{col.name}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>

      <div className="p-3 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Arraste colunas para o canvas
        </p>
      </div>
    </aside>
  );
}
