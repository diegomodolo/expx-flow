import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Shield, Key, Smartphone, Eye, EyeOff } from "lucide-react";

export const SecuritySettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({
        title: "Erro de validação",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast({
        title: "Senha muito fraca",
        description: "A senha deve ter pelo menos 8 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setLoading(false);
    }, 1000);
  };

  const handleTwoFactorToggle = (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    toast({
      title: enabled ? "2FA Ativado" : "2FA Desativado",
      description: enabled 
        ? "Autenticação de dois fatores foi ativada." 
        : "Autenticação de dois fatores foi desativada.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Mantenha sua conta segura com uma senha forte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  placeholder="Digite sua senha atual"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">Nova Senha</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                placeholder="Digite sua nova senha"
                required
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de 8 caracteres, inclua letras maiúsculas, minúsculas e números
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                placeholder="Confirme sua nova senha"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Alterando..." : "Alterar Senha"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Autenticação de Dois Fatores
          </CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar 2FA</Label>
              <p className="text-sm text-muted-foreground">
                Use um aplicativo autenticador para gerar códigos de verificação
              </p>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={handleTwoFactorToggle}
            />
          </div>

          {twoFactorEnabled && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Configurar aplicativo autenticador:</p>
              <ol className="text-sm text-muted-foreground space-y-1 pl-4">
                <li>1. Baixe um aplicativo como Google Authenticator ou Authy</li>
                <li>2. Escaneie o código QR abaixo</li>
                <li>3. Digite o código de 6 dígitos para confirmar</li>
              </ol>
              
              <div className="flex justify-center p-4 bg-white rounded border">
                <div className="w-32 h-32 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  QR Code Placeholder
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification_code">Código de Verificação</Label>
                <Input
                  id="verification_code"
                  placeholder="Digite o código de 6 dígitos"
                  maxLength={6}
                />
              </div>

              <Button className="w-full">
                Confirmar Configuração
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciar Sessões
          </CardTitle>
          <CardDescription>
            Visualize e gerencie onde você está conectado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Sessão Atual</p>
                <p className="text-sm text-muted-foreground">Chrome • São Paulo, Brasil</p>
                <p className="text-xs text-muted-foreground">Ativo agora</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Atual
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">iPhone • Safari</p>
                <p className="text-sm text-muted-foreground">Rio de Janeiro, Brasil</p>
                <p className="text-xs text-muted-foreground">Há 2 dias</p>
              </div>
              <Button variant="outline" size="sm">
                Revogar
              </Button>
            </div>
          </div>

          <Separator />

          <Button variant="destructive" className="w-full">
            Encerrar Todas as Outras Sessões
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};