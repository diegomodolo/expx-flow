import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, MessageSquare, Users, Calendar } from "lucide-react";

export const NotificationSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    email_marketing: true,
    email_security: true,
    email_updates: false,
    push_tasks: true,
    push_campaigns: true,
    push_mentions: true,
    sms_alerts: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Preferências salvas!",
        description: "Suas configurações de notificação foram atualizadas.",
      });
      setLoading(false);
    }, 1000);
  };

  const updateNotification = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações de Notificação
          </CardTitle>
          <CardDescription>
            Gerencie como e quando você deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <h3 className="text-lg font-medium">Notificações por Email</h3>
            </div>
            
            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email_marketing">Marketing e Promoções</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba emails sobre novos recursos e ofertas especiais
                  </p>
                </div>
                <Switch
                  id="email_marketing"
                  checked={notifications.email_marketing}
                  onCheckedChange={(checked) => updateNotification('email_marketing', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email_security">Segurança</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertas importantes sobre sua conta e segurança
                  </p>
                </div>
                <Switch
                  id="email_security"
                  checked={notifications.email_security}
                  onCheckedChange={(checked) => updateNotification('email_security', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email_updates">Atualizações do Sistema</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificações sobre atualizações e manutenções
                  </p>
                </div>
                <Switch
                  id="email_updates"
                  checked={notifications.email_updates}
                  onCheckedChange={(checked) => updateNotification('email_updates', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Push Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <h3 className="text-lg font-medium">Notificações Push</h3>
            </div>
            
            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_tasks">Tarefas</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando uma tarefa é atribuída ou atualizada
                  </p>
                </div>
                <Switch
                  id="push_tasks"
                  checked={notifications.push_tasks}
                  onCheckedChange={(checked) => updateNotification('push_tasks', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_campaigns">Campanhas</Label>
                  <p className="text-sm text-muted-foreground">
                    Atualizações sobre campanhas em andamento
                  </p>
                </div>
                <Switch
                  id="push_campaigns"
                  checked={notifications.push_campaigns}
                  onCheckedChange={(checked) => updateNotification('push_campaigns', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_mentions">Menções</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando você é mencionado em comentários
                  </p>
                </div>
                <Switch
                  id="push_mentions"
                  checked={notifications.push_mentions}
                  onCheckedChange={(checked) => updateNotification('push_mentions', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* SMS Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <h3 className="text-lg font-medium">SMS</h3>
            </div>
            
            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms_alerts">Alertas Críticos</Label>
                  <p className="text-sm text-muted-foreground">
                    Apenas para alertas de segurança e emergências
                  </p>
                </div>
                <Switch
                  id="sms_alerts"
                  checked={notifications.sms_alerts}
                  onCheckedChange={(checked) => updateNotification('sms_alerts', checked)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNotifications({
                email_marketing: true,
                email_security: true,
                email_updates: false,
                push_tasks: true,
                push_campaigns: true,
                push_mentions: true,
                sms_alerts: false,
              })}
            >
              Restaurar Padrões
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Preferências"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};