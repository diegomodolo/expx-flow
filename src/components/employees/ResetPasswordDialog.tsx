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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateSecurePassword } from "@/lib/passwordGenerator";
import { Copy, RefreshCw, Loader2, KeyRound, Check } from "lucide-react";
import { Employee } from "@/hooks/useEmployees";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function ResetPasswordDialog({ open, onOpenChange, employee }: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGeneratePassword = () => {
    const password = generateSecurePassword(12);
    setNewPassword(password);
    setCopied(false);
  };

  const handleCopyPassword = async () => {
    if (!newPassword) return;
    
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      toast.success("Senha copiada para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar senha");
    }
  };

  const handleResetPassword = async () => {
    if (!employee) {
      toast.error("Selecione um colaborador");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres. Clique em gerar para criar uma senha segura.");
      return;
    }

    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-employee-password", {
        body: {
          userId: employee.user_id,
          newPassword: newPassword,
          employeeName: employee.name,
          employeeEmail: employee.email,
        },
      });

      if (error) throw error;

      toast.success(`Senha de ${employee.name} redefinida com sucesso!`);
      onOpenChange(false);
      setNewPassword("");
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      toast.error(error.message || "Erro ao redefinir senha do colaborador");
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setNewPassword("");
      setCopied(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Gerar Nova Senha
          </DialogTitle>
          <DialogDescription>
            Gere uma nova senha para <strong>{employee?.name}</strong>. 
            A senha será atualizada imediatamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee-email">Email do Colaborador</Label>
            <Input 
              id="employee-email" 
              value={employee?.email || ""} 
              disabled 
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha (mínimo 8 caracteres)</Label>
            <div className="flex gap-2">
              <Input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Clique em gerar para criar uma senha"
                className="font-mono"
                minLength={8}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGeneratePassword}
                title="Gerar nova senha"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyPassword}
                disabled={!newPassword}
                title="Copiar senha"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            {newPassword && newPassword.length < 8 && (
              <p className="text-sm text-destructive">A senha deve ter pelo menos 8 caracteres</p>
            )}
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <p className="font-medium mb-1">⚠️ Importante:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Copie a senha antes de confirmar</li>
              <li>Envie a nova senha ao colaborador de forma segura</li>
              <li>Recomende que ele altere a senha no primeiro acesso</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleResetPassword} 
            disabled={!newPassword || newPassword.length < 8 || isResetting}
          >
            {isResetting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redefinindo...
              </>
            ) : (
              "Confirmar Nova Senha"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
