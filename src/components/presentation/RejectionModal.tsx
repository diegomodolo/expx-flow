import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RejectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  creativeName?: string;
  isLoading?: boolean;
}

export function RejectionModal({
  open,
  onClose,
  onConfirm,
  creativeName,
  isLoading,
}: RejectionModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason("");
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reprovar Criativo</DialogTitle>
          <DialogDescription>
            {creativeName ? (
              <>Informe o motivo da reprovação de <strong>"{creativeName}"</strong></>
            ) : (
              "Informe o motivo da reprovação deste criativo"
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="reason">Motivo da reprovação *</Label>
          <Textarea
            id="reason"
            placeholder="Descreva o que precisa ser alterado..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
            variant="destructive"
          >
            {isLoading ? "Salvando..." : "Confirmar Reprovação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
