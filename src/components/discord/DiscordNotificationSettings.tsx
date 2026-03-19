import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Save,
  Bell,
  CheckSquare,
  UserPlus,
  AlertTriangle,
  MessageSquare,
  BarChart3,
  Users,
  Megaphone,
  AtSign,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";
import { useDiscordConfig } from "@/hooks/useDiscordConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationOption {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "tarefas" | "equipe" | "clientes";
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  {
    key: "notify_task_created",
    label: "Tarefa criada",
    description: "Notifica quando uma nova tarefa é criada no squad",
    icon: <CheckSquare className="h-4 w-4" />,
    category: "tarefas",
  },
  {
    key: "notify_task_assigned",
    label: "Tarefa atribuída",
    description: "Notifica quando uma tarefa é atribuída a um colaborador",
    icon: <UserPlus className="h-4 w-4" />,
    category: "tarefas",
  },
  {
    key: "notify_task_completed",
    label: "Tarefa concluída",
    description: "Notifica quando uma tarefa é marcada como concluída",
    icon: <CheckSquare className="h-4 w-4" />,
    category: "tarefas",
  },
  {
    key: "notify_task_overdue",
    label: "Tarefa atrasada",
    description: "Alerta quando uma tarefa ultrapassa o prazo de entrega",
    icon: <AlertTriangle className="h-4 w-4" />,
    category: "tarefas",
  },
  {
    key: "notify_task_comment",
    label: "Comentário em tarefa",
    description: "Notifica quando alguém comenta em uma tarefa",
    icon: <MessageSquare className="h-4 w-4" />,
    category: "tarefas",
  },
  {
    key: "notify_task_review",
    label: "Tarefa em revisão",
    description:
      "Notifica o autorizador quando uma tarefa é enviada para revisão",
    icon: <ShieldCheck className="h-4 w-4" />,
    category: "tarefas",
  },
  {
    key: "notify_task_rejected",
    label: "Tarefa rejeitada",
    description:
      "Notifica o responsável quando uma tarefa é rejeitada pelo autorizador",
    icon: <AlertTriangle className="h-4 w-4" />,
    category: "tarefas",
  },
  {
    key: "notify_employee_mentions",
    label: "Menções a colaboradores",
    description: "Envia DM quando um colaborador é mencionado em uma tarefa",
    icon: <AtSign className="h-4 w-4" />,
    category: "equipe",
  },
  {
    key: "notify_squad_updates",
    label: "Atualizações do squad",
    description: "Notifica mudanças na composição ou configuração dos squads",
    icon: <Users className="h-4 w-4" />,
    category: "equipe",
  },
  {
    key: "notify_daily_summary",
    label: "Resumo diário",
    description: "Envia um resumo diário das atividades no canal do squad",
    icon: <CalendarClock className="h-4 w-4" />,
    category: "equipe",
  },
  {
    key: "notify_client_alerts",
    label: "Alertas de clientes",
    description: "Notifica sobre mudanças de status ou alertas de clientes",
    icon: <Megaphone className="h-4 w-4" />,
    category: "clientes",
  },
  {
    key: "notify_campaign_status",
    label: "Status de campanhas",
    description: "Notifica quando campanhas mudam de status ou têm problemas",
    icon: <BarChart3 className="h-4 w-4" />,
    category: "clientes",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  tarefas: "Tarefas",
  equipe: "Equipe & Squad",
  clientes: "Clientes & Campanhas",
};

export const DiscordNotificationSettings = () => {
  const { config, companyId } = useDiscordConfig();
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      const initial: Record<string, boolean> = {};
      NOTIFICATION_OPTIONS.forEach((opt) => {
        initial[opt.key] =
          config[opt.key] ??
          (opt.key.includes("created") ||
            opt.key.includes("completed") ||
            opt.key.includes("assigned") ||
            opt.key.includes("overdue") ||
            opt.key.includes("squad") ||
            opt.key.includes("mentions"));
      });
      setSettings(initial);
      setHasChanges(false);
    }
  }, [config]);

  const handleToggle = (key: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!config?.id) {
      toast.error("Configure o bot do Discord primeiro");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as unknown)
        .from("discord_config")
        .update(settings)
        .eq("id", config.id);
      if (error) throw error;
      toast.success("Configurações de notificação salvas!");
      setHasChanges(false);
    } catch (err: unknown) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const categories = ["tarefas", "equipe", "clientes"] as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#5865F2]/10">
              <Bell className="h-5 w-5 text-[#5865F2]" />
            </div>
            <div>
              <CardTitle className="text-lg">Notificações do Bot</CardTitle>
              <CardDescription>
                Escolha quais tipos de notificação o bot enviará nos canais do
                Discord
              </CardDescription>
            </div>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Salvar
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!config?.is_connected && (
          <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            Conecte o bot ao Discord primeiro para configurar as notificações.
          </div>
        )}

        {categories.map((category) => {
          const options = NOTIFICATION_OPTIONS.filter(
            (o) => o.category === category,
          );
          return (
            <div key={category} className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">
                {CATEGORY_LABELS[category]}
              </h4>
              <div className="space-y-1">
                {options.map((opt) => (
                  <div
                    key={opt.key}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground">{opt.icon}</div>
                      <div>
                        <Label
                          htmlFor={opt.key}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {opt.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {opt.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={opt.key}
                      checked={settings[opt.key] ?? false}
                      onCheckedChange={(v) => handleToggle(opt.key, v)}
                      disabled={!config?.is_connected}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
