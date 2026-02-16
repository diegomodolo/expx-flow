import React, { useState } from "react";
import { useTaskHistory, TaskHistoryEntry } from "@/hooks/useTaskHistory";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, Pencil, Trash2, X, Check, Loader2, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  taskId: string | null;
}

export function TaskHistoryTab({ taskId }: Props) {
  const { entries, loading, addManualEntry, updateEntry, deleteEntry } = useTaskHistory(taskId);
  const { user } = useAuth();
  const [newEntry, setNewEntry] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!newEntry.trim()) return;
    setSubmitting(true);
    await addManualEntry(newEntry.trim());
    setNewEntry("");
    setSubmitting(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editText.trim()) return;
    setSubmitting(true);
    await updateEntry(id, editText.trim());
    setEditingId(null);
    setEditText("");
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
  };

  const startEdit = (entry: TaskHistoryEntry) => {
    setEditingId(entry.id);
    setEditText(entry.description);
  };

  if (!taskId) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Salve a tarefa primeiro para ver o histórico.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Manual entry input */}
      <div className="space-y-2">
        <Textarea
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          placeholder="Adicionar registro manual ao histórico..."
          className="min-h-[80px] resize-none"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!newEntry.trim() || submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Registrar
          </Button>
        </div>
      </div>

      <Separator />

      {/* History entries */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Clock className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">Nenhum registro no histórico</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3 pr-2">
            {entries.map((entry) => {
              const isOwner = user?.id === entry.user_id;
              const isManual = entry.history_type === "manual";
              const isEditing = editingId === entry.id;

              return (
                <div
                  key={entry.id}
                  className={cn(
                    "flex gap-3 p-3 rounded-lg border transition-colors",
                    isManual
                      ? "bg-primary/5 border-primary/20"
                      : "bg-muted/30 border-border"
                  )}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                    {entry.user_avatar && <AvatarImage src={entry.user_avatar} />}
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      <User className="w-3 h-3" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-foreground">
                        {entry.user_name || "Sistema"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                      {isManual && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          Manual
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 mt-1">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[60px] resize-none text-sm"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleUpdate(entry.id)} disabled={submitting}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/80">{entry.description}</p>
                    )}

                    {entry.field_changed && (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Campo: <span className="font-medium">{entry.field_changed}</span>
                        {entry.old_value && <> · De: <span className="line-through">{entry.old_value}</span></>}
                        {entry.new_value && <> · Para: <span className="font-medium text-primary">{entry.new_value}</span></>}
                      </div>
                    )}
                  </div>

                  {/* Actions for manual entries owned by user */}
                  {isManual && isOwner && !isEditing && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEdit(entry)}>
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
