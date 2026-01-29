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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, KeyRound } from "lucide-react";
import { Employee } from "@/hooks/useEmployees";
import { useCompany } from "@/contexts/CompanyContext";

interface ResendInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function ResendInviteDialog({ open, onOpenChange, employee }: ResendInviteDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const [generateNewPassword, setGenerateNewPassword] = useState(true);
  const { activeCompany } = useCompany();

  const handleResendInvite = async () => {
    if (!employee) {
      toast.error("Selecione um colaborador");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-employee-invite", {
        body: {
          userId: employee.user_id,
          email: employee.email,
          name: employee.name,
          role: employee.role,
          companyName: activeCompany?.company?.name || "Nossa Empresa",
          generateNewPassword: generateNewPassword,
        },
      });

      if (error) throw error;

      toast.success(`Email reenviado para ${employee.name}!`, {
        description: generateNewPassword 
          ? "O colaborador receberá um novo magic link e senha temporária."
          : "O colaborador receberá um novo magic link.",
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao reenviar convite:", error);
      toast.error(error.message || "Erro ao reenviar convite");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Reenviar Convite
          </DialogTitle>
          <DialogDescription>
            Reenviar email de acesso para <strong>{employee?.name}</strong> com magic link 
            e opcionalmente uma nova senha temporária.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Colaborador:</p>
            <p className="text-sm text-muted-foreground">{employee?.name}</p>
            <p className="text-sm text-muted-foreground">{employee?.email}</p>
            <p className="text-sm text-muted-foreground">Cargo: {employee?.role}</p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="generate-password" 
              checked={generateNewPassword}
              onCheckedChange={(checked) => setGenerateNewPassword(checked === true)}
            />
            <Label htmlFor="generate-password" className="text-sm cursor-pointer">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Gerar nova senha temporária
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Se marcado, uma nova senha será gerada e enviada junto com o magic link
              </p>
            </Label>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <p className="font-medium mb-1">O que será enviado:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Link de acesso rápido (Magic Link)</li>
              {generateNewPassword && <li>Nova senha temporária</li>}
              <li>Instruções de acesso ao sistema</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleResendInvite} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Reenviar Convite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
