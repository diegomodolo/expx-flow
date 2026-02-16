import React, { useState } from "react";
import { useSubtasks } from "@/hooks/useSubtasks";
import { useRoteiros } from "@/hooks/useRoteiros";
import { useRoteiroAtividades } from "@/hooks/useRoteiroAtividades";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  BookOpen,
  Search,
  Loader2,
  ListTree,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface TaskSubtasksTabProps {
  taskId: string | null;
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  high: { label: "Alta", className: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Normal", className: "bg-primary/10 text-primary border-primary/20" },
  low: { label: "Baixa", className: "bg-muted text-muted-foreground border-border" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  Tarefa: { label: "Tarefa", icon: "📌" },
  Criativo: { label: "Criativo", icon: "🎨" },
  Backlog: { label: "Backlog", icon: "📋" },
  História: { label: "História", icon: "📖" },
  Negócio: { label: "Negócio", icon: "💼" },
  Reunião: { label: "Reunião", icon: "🤝" },
  Ticket: { label: "Ticket", icon: "🎫" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd/MM");
  } catch {
    return "—";
  }
}

export function TaskSubtasksTab({ taskId }: TaskSubtasksTabProps) {
  const {
    subtasks,
    isLoading,
    completionPercentage,
    createSubtask,
    importRoteiro,
    deleteSubtask,
    toggleSubtaskDone,
  } = useSubtasks(taskId);

  const [newTitle, setNewTitle] = useState("");
  const [showRoteiroDialog, setShowRoteiroDialog] = useState(false);

  const handleAddSubtask = () => {
    if (!newTitle.trim()) return;
    createSubtask.mutate({ title: newTitle.trim() });
    setNewTitle("");
  };

  if (!taskId) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Salve a tarefa primeiro para adicionar subtarefas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTree className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Sub-Tarefas</h3>
          {subtasks.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {subtasks.filter(s => s.status === 'done').length}/{subtasks.length}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRoteiroDialog(true)}
          className="gap-1.5"
        >
          <BookOpen className="w-4 h-4" />
          Importar Roteiro
        </Button>
      </div>

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="space-y-1">
          <Progress value={completionPercentage} className="h-6" />
          <p className="text-xs text-muted-foreground text-center">
            {completionPercentage}% concluído
          </p>
        </div>
      )}

      {/* Add subtask input */}
      <div className="flex gap-2">
        <Input
          placeholder="Nova subtarefa..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSubtask())}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleAddSubtask}
          disabled={!newTitle.trim() || createSubtask.isPending}
        >
          {createSubtask.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Subtasks table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : subtasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ListTree className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">Nenhuma subtarefa adicionada</p>
          <p className="text-xs mt-1">Adicione subtarefas ou importe um roteiro</p>
        </div>
      ) : (
        <ScrollArea className="h-[340px]">
          <div className="space-y-0">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_70px_70px_100px_100px_auto_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
              <div className="w-5" />
              <div>Tarefa</div>
              <div>Início</div>
              <div>Prazo</div>
              <div>Tipo</div>
              <div>Prioridade</div>
              <div className="w-6" />
              <div className="w-6" />
            </div>

            {/* Subtask rows */}
            {subtasks.map((subtask) => {
              const isDone = subtask.status === "done";
              const priority = PRIORITY_CONFIG[subtask.priority] || PRIORITY_CONFIG.medium;
              const type = TYPE_CONFIG[subtask.task_type || "Tarefa"] || TYPE_CONFIG.Tarefa;

              return (
                <div
                  key={subtask.id}
                  className={cn(
                    "grid grid-cols-[auto_1fr_70px_70px_100px_100px_auto_auto] gap-2 px-3 py-2.5 items-center border-b border-border/50 transition-colors hover:bg-muted/30",
                    isDone && "opacity-60"
                  )}
                >
                  {/* Avatar / responsible */}
                  <Avatar className="h-6 w-6">
                    {subtask.responsible_avatar && (
                      <AvatarImage src={subtask.responsible_avatar} />
                    )}
                    <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                      <User className="w-3 h-3" />
                    </AvatarFallback>
                  </Avatar>

                  {/* Title */}
                  <span
                    className={cn(
                      "text-sm truncate",
                      isDone && "line-through text-muted-foreground"
                    )}
                  >
                    {subtask.title}
                  </span>

                  {/* Start date */}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(subtask.start_date)}
                  </span>

                  {/* Deadline */}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(subtask.deadline)}
                  </span>

                  {/* Type */}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 w-fit">
                    {type.icon} {type.label}
                  </Badge>

                  {/* Priority */}
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0.5 w-fit", priority.className)}
                  >
                    {priority.label}
                  </Badge>

                  {/* Toggle done */}
                  <button
                    onClick={() => toggleSubtaskDone.mutate(subtask)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteSubtask.mutate(subtask.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Import Roteiro Dialog */}
      <ImportRoteiroDialog
        open={showRoteiroDialog}
        onOpenChange={setShowRoteiroDialog}
        onImport={(roteiroId) => {
          importRoteiro.mutate(roteiroId);
          setShowRoteiroDialog(false);
        }}
        isImporting={importRoteiro.isPending}
      />
    </div>
  );
}

/* ---- Import Roteiro Dialog ---- */
interface ImportRoteiroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (roteiroId: string) => void;
  isImporting: boolean;
}

function ImportRoteiroDialog({ open, onOpenChange, onImport, isImporting }: ImportRoteiroDialogProps) {
  const { roteiros, isLoading } = useRoteiros();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = roteiros.filter(
    (r) => !search || r.nome.toLowerCase().includes(search.toLowerCase())
  );

  // Preview selected roteiro's activities
  const { atividades } = useRoteiroAtividades(selectedId || undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Importar Roteiro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar roteiros..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Roteiro list */}
          <ScrollArea className="h-[250px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum roteiro encontrado
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.map((roteiro) => (
                  <button
                    key={roteiro.id}
                    onClick={() => setSelectedId(roteiro.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg border transition-colors",
                      selectedId === roteiro.id
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-transparent hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <p className="text-sm font-medium">{roteiro.nome}</p>
                    {roteiro.roteiro_categorias && (
                      <p className="text-xs text-muted-foreground">
                        {roteiro.roteiro_categorias.nome}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Preview selected roteiro's activities */}
          {selectedId && atividades.length > 0 && (
            <div className="border border-border rounded-lg p-3 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Atividades ({atividades.length}):
              </p>
              <div className="space-y-1 max-h-[120px] overflow-y-auto">
                {atividades.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <Circle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{a.titulo}</span>
                    {a.tipo && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto flex-shrink-0">
                        {a.tipo}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import button */}
          <div className="flex justify-end">
            <Button
              onClick={() => selectedId && onImport(selectedId)}
              disabled={!selectedId || isImporting}
              className="gap-2"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )}
              Importar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
