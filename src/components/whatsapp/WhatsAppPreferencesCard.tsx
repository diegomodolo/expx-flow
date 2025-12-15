import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bell, AlertTriangle, DollarSign, FileText, Send, XCircle, Moon } from "lucide-react";

interface WhatsAppPreferencesCardProps {
  preferences: {
    notify_high_cpa: boolean;
    notify_low_balance: boolean;
    notify_disabled_account: boolean;
    notify_presentation_summary: boolean;
    notify_post_published: boolean;
    notify_post_failed: boolean;
    cpa_threshold_percentage: number;
    balance_threshold_days: number;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
  } | null;
  onSave: (data: any) => void;
  isSaving: boolean;
  isConnected: boolean;
}

export function WhatsAppPreferencesCard({
  preferences,
  onSave,
  isSaving,
  isConnected,
}: WhatsAppPreferencesCardProps) {
  const [formData, setFormData] = useState({
    notify_high_cpa: preferences?.notify_high_cpa ?? true,
    notify_low_balance: preferences?.notify_low_balance ?? true,
    notify_disabled_account: preferences?.notify_disabled_account ?? true,
    notify_presentation_summary: preferences?.notify_presentation_summary ?? true,
    notify_post_published: preferences?.notify_post_published ?? false,
    notify_post_failed: preferences?.notify_post_failed ?? true,
    cpa_threshold_percentage: preferences?.cpa_threshold_percentage ?? 50,
    balance_threshold_days: preferences?.balance_threshold_days ?? 2,
    quiet_hours_start: preferences?.quiet_hours_start ?? "",
    quiet_hours_end: preferences?.quiet_hours_end ?? "",
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        notify_high_cpa: preferences.notify_high_cpa,
        notify_low_balance: preferences.notify_low_balance,
        notify_disabled_account: preferences.notify_disabled_account,
        notify_presentation_summary: preferences.notify_presentation_summary,
        notify_post_published: preferences.notify_post_published,
        notify_post_failed: preferences.notify_post_failed,
        cpa_threshold_percentage: preferences.cpa_threshold_percentage,
        balance_threshold_days: preferences.balance_threshold_days,
        quiet_hours_start: preferences.quiet_hours_start || "",
        quiet_hours_end: preferences.quiet_hours_end || "",
      });
    }
  }, [preferences]);

  const handleSave = () => {
    onSave(formData);
  };

  const notificationItems = [
    {
      key: "notify_high_cpa",
      icon: AlertTriangle,
      label: "CPA Alto",
      description: "Alerta quando CPA ultrapassa o limite definido",
      color: "text-google-red-500",
    },
    {
      key: "notify_low_balance",
      icon: DollarSign,
      label: "Saldo Baixo",
      description: "Alerta quando saldo está abaixo do limite de dias",
      color: "text-google-yellow-500",
    },
    {
      key: "notify_disabled_account",
      icon: XCircle,
      label: "Conta Desabilitada",
      description: "Alerta quando conta Meta Ads é desabilitada",
      color: "text-google-red-600",
    },
    {
      key: "notify_presentation_summary",
      icon: FileText,
      label: "Resumo de Apresentação",
      description: "Envia resumo ao finalizar reunião de aprovação",
      color: "text-google-blue-500",
    },
    {
      key: "notify_post_published",
      icon: Send,
      label: "Post Publicado",
      description: "Notifica quando post agendado é publicado",
      color: "text-google-green-500",
    },
    {
      key: "notify_post_failed",
      icon: AlertTriangle,
      label: "Falha de Publicação",
      description: "Notifica quando post agendado falha",
      color: "text-google-red-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-google-blue-100 dark:bg-google-blue-600/20 flex items-center justify-center">
            <Bell className="h-5 w-5 text-google-blue-600 dark:text-google-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Preferências de Notificação</CardTitle>
            <CardDescription>Configure quais alertas deseja receber</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected && (
          <div className="p-3 rounded-lg bg-google-yellow-50 dark:bg-google-yellow-600/10 border border-google-yellow-200 dark:border-google-yellow-600/30">
            <p className="text-sm text-google-yellow-700 dark:text-google-yellow-400">
              Configure e conecte sua instância Z-API primeiro para habilitar notificações.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Tipos de Alerta
          </h4>
          {notificationItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Switch
                  checked={formData[item.key as keyof typeof formData] as boolean}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, [item.key]: checked })
                  }
                  disabled={!isConnected}
                />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cpa_threshold">Limite CPA (%)</Label>
            <Input
              id="cpa_threshold"
              type="number"
              min={0}
              max={200}
              value={formData.cpa_threshold_percentage}
              onChange={(e) =>
                setFormData({ ...formData, cpa_threshold_percentage: parseInt(e.target.value) || 0 })
              }
              disabled={!isConnected}
            />
            <p className="text-xs text-muted-foreground">
              Alertar quando CPA ultrapassar X% acima da média
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="balance_threshold">Limite Saldo (dias)</Label>
            <Input
              id="balance_threshold"
              type="number"
              min={1}
              max={30}
              value={formData.balance_threshold_days}
              onChange={(e) =>
                setFormData({ ...formData, balance_threshold_days: parseInt(e.target.value) || 1 })
              }
              disabled={!isConnected}
            />
            <p className="text-xs text-muted-foreground">
              Alertar quando saldo durar menos de X dias
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Horário de Silêncio
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet_start">Início</Label>
              <Input
                id="quiet_start"
                type="time"
                value={formData.quiet_hours_start}
                onChange={(e) =>
                  setFormData({ ...formData, quiet_hours_start: e.target.value })
                }
                disabled={!isConnected}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet_end">Fim</Label>
              <Input
                id="quiet_end"
                type="time"
                value={formData.quiet_hours_end}
                onChange={(e) =>
                  setFormData({ ...formData, quiet_hours_end: e.target.value })
                }
                disabled={!isConnected}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Notificações não serão enviadas durante este período
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={!isConnected || isSaving}
          className="w-full"
        >
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar Preferências
        </Button>
      </CardContent>
    </Card>
  );
}