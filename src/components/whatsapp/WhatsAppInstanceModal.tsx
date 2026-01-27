import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { WhatsAppInstance } from "@/hooks/useWhatsAppInstances";

interface WhatsAppInstanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: WhatsAppInstance | null;
  onSave: (data: { instance_name: string; session_id: string }) => void;
  onUpdate: (data: { id: string; instance_name: string; session_id: string }) => void;
  isSaving: boolean;
}

export function WhatsAppInstanceModal({
  open,
  onOpenChange,
  instance,
  onSave,
  onUpdate,
  isSaving,
}: WhatsAppInstanceModalProps) {
  const [instanceName, setInstanceName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [errors, setErrors] = useState<{ name?: string; session?: string }>({});

  const isEditing = !!instance;

  useEffect(() => {
    if (instance) {
      setInstanceName(instance.instance_name);
      setSessionId(instance.session_id);
    } else {
      setInstanceName("");
      setSessionId("");
    }
    setErrors({});
  }, [instance, open]);

  const validateForm = () => {
    const newErrors: { name?: string; session?: string } = {};

    if (!instanceName.trim()) {
      newErrors.name = "Nome da instância é obrigatório";
    }

    if (!sessionId.trim()) {
      newErrors.session = "Session ID é obrigatório";
    } else if (/\s/.test(sessionId)) {
      newErrors.session = "Session ID não pode conter espaços";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      newErrors.session = "Session ID deve conter apenas letras, números, - ou _";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (isEditing) {
      onUpdate({
        id: instance.id,
        instance_name: instanceName.trim(),
        session_id: sessionId.trim(),
      });
    } else {
      onSave({
        instance_name: instanceName.trim(),
        session_id: sessionId.trim(),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Instância" : "Nova Instância WhatsApp"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instance-name">Nome da Instância *</Label>
            <Input
              id="instance-name"
              placeholder="Ex: Comercial, Suporte, Marketing"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-id">Session ID *</Label>
            <Input
              id="session-id"
              placeholder="Ex: comercial-01"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value.toLowerCase().replace(/\s/g, "-"))}
              className={errors.session ? "border-destructive" : ""}
              disabled={isEditing}
            />
            {errors.session && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.session}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Identificador único da sessão. Não pode ser alterado após criação.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar" : "Criar Instância"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
