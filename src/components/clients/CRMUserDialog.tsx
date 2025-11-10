import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { generateSecurePassword } from "@/lib/passwordGenerator";
import { CRMUser } from "@/hooks/useCRMUsers";

interface CRMUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    email: string;
    fullName: string;
    role: 'admin' | 'collaborator';
    password?: string;
  }) => void;
  mode: 'create' | 'edit';
  user?: CRMUser;
  isLoading?: boolean;
  onResetPassword?: (newPassword: string) => void;
}

export function CRMUserDialog({
  open,
  onOpenChange,
  onSubmit,
  mode,
  user,
  isLoading,
  onResetPassword,
}: CRMUserDialogProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<'admin' | 'collaborator'>('collaborator');
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && user) {
      setEmail(user.email);
      setFullName(user.full_name);
      setRole(user.role);
    } else if (mode === 'create') {
      setEmail("");
      setFullName("");
      setRole('collaborator');
      setPassword(generateSecurePassword());
    }
  }, [mode, user, open]);

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setPassword(newPassword);
    toast.success("Nova senha gerada!");
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    toast.success("Senha copiada para a área de transferência!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'create') {
      onSubmit({ email, fullName, role, password });
    } else {
      onSubmit({ email, fullName, role });
    }
  };

  const handleResetPasswordClick = () => {
    if (onResetPassword) {
      const newPassword = generateSecurePassword();
      setPassword(newPassword);
      setShowResetPassword(true);
      onResetPassword(newPassword);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Adicionar Usuário do CRM' : 'Editar Usuário do CRM'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Crie um novo usuário para acessar o CRM. A senha será gerada automaticamente.'
              : 'Atualize as informações do usuário. Para alterar a senha, use a opção "Resetar Senha".'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="João Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@empresa.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Tipo de Usuário</Label>
            <Select value={role} onValueChange={(value: 'admin' | 'collaborator') => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin (acesso total)</SelectItem>
                <SelectItem value="collaborator">Colaborador (acesso limitado)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'create' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Senha Gerada</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGeneratePassword}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Gerar Nova
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={password}
                  type={showPassword ? "text" : "password"}
                  readOnly
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                ⚠️ Copie esta senha agora! Ela não será exibida novamente.
              </p>
            </div>
          )}

          {mode === 'edit' && (
            <div className="space-y-2">
              <Label>Redefinir Senha</Label>
              {!showResetPassword ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetPasswordClick}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resetar Senha
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={password}
                      type={showPassword ? "text" : "password"}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyPassword}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ⚠️ Nova senha gerada! Copie agora e envie ao usuário.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : mode === 'create' ? "Criar Usuário" : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
