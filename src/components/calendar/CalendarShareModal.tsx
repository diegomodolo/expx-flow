import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CalendarShare } from "@/hooks/useCalendarShares";

interface Employee {
  id: string;
  user_id: string;
  name: string;
}

interface CalendarShareModalProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  myShares: CalendarShare[];
  currentUserId: string;
  onShare: (userId: string) => Promise<unknown>;
  onRemoveShare: (shareId: string) => Promise<unknown>;
  sharing: boolean;
}

export function CalendarShareModal({
  open,
  onClose,
  employees,
  myShares,
  currentUserId,
  onShare,
  onRemoveShare,
  sharing,
}: CalendarShareModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const sharedUserIds = new Set(myShares.map((s) => s.shared_with_id));
  const availableEmployees = employees.filter(
    (e) => e.user_id !== currentUserId && !sharedUserIds.has(e.user_id),
  );

  const handleShare = async () => {
    if (!selectedUserId) return;
    await onShare(selectedUserId);
    setSelectedUserId("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar Meu Calendário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar colaborador..." />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((emp) => (
                  <SelectItem key={emp.user_id} value={emp.user_id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleShare} disabled={!selectedUserId || sharing}>
              {sharing ? "Compartilhando..." : "Compartilhar"}
            </Button>
          </div>

          {myShares.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Compartilhado com:
              </h4>
              <div className="space-y-2">
                {myShares.map((share) => {
                  const emp = employees.find(
                    (e) => e.user_id === share.shared_with_id,
                  );
                  return (
                    <div
                      key={share.id}
                      className="flex items-center justify-between bg-muted/50 rounded px-3 py-2"
                    >
                      <span className="text-sm">{emp?.name || "Usuário"}</span>
                      <Button aria-label="Excluir"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => onRemoveShare(share.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
