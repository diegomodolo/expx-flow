import { supabase } from "@/integrations/supabase/client";

type NotificationType =
  | "task_created"
  | "task_completed"
  | "task_assigned"
  | "task_overdue"
  | "task_comment"
  | "task_review"
  | "task_rejected"
  | "squad_updates";

interface TaskNotificationPayload {
  title: string;
  responsible_name?: string;
  priority?: string;
  due_date?: string;
  team_name?: string;
  team_id?: string;
  assigned_user_name?: string;
  client_name?: string;
  authorizer_name?: string;
  rejection_reason?: string;
  quality_score?: number;
}

const PRIORITY_LABELS: Record<string, string> = {
  high: "🔴 Alta",
  medium: "🟡 Média",
  low: "🟢 Baixa",
};

function buildTaskEmbed(
  type: NotificationType,
  payload: TaskNotificationPayload,
) {
  const colorMap: Record<NotificationType, number> = {
    task_created: 0x3b82f6, // blue
    task_completed: 0x10b981, // green
    task_assigned: 0xf59e0b, // amber
    task_overdue: 0xef4444, // red
    task_comment: 0x8b5cf6, // purple
    task_review: 0xf59e0b, // amber – awaiting review
    task_rejected: 0xef4444, // red
    squad_updates: 0x6366f1, // indigo
  };

  const titleMap: Record<NotificationType, string> = {
    task_created: "📋 Nova Tarefa Criada",
    task_completed: "✅ Tarefa Concluída",
    task_assigned: "👤 Tarefa Atribuída",
    task_overdue: "⏰ Tarefa Atrasada",
    task_comment: "💬 Novo Comentário",
    task_review: "📋 Tarefa em Revisão — Aguardando Aprovação",
    task_rejected: "❌ Tarefa Rejeitada",
    squad_updates: "📢 Atualização do Squad",
  };

  const fields: Array<{ name: string; value: string; inline: boolean }> = [];

  fields.push({ name: "Tarefa", value: payload.title, inline: false });

  if (payload.responsible_name) {
    fields.push({
      name: "Responsável",
      value: payload.responsible_name,
      inline: true,
    });
  }
  if (payload.priority) {
    fields.push({
      name: "Prioridade",
      value: PRIORITY_LABELS[payload.priority] || payload.priority,
      inline: true,
    });
  }
  if (payload.due_date) {
    const formatted = new Date(payload.due_date).toLocaleDateString("pt-BR");
    fields.push({ name: "Prazo", value: formatted, inline: true });
  }
  if (payload.client_name) {
    fields.push({ name: "Cliente", value: payload.client_name, inline: true });
  }
  if (payload.team_name) {
    fields.push({ name: "Squad", value: payload.team_name, inline: true });
  }
  if (payload.authorizer_name) {
    fields.push({
      name: "Autorizador",
      value: payload.authorizer_name,
      inline: true,
    });
  }
  if (payload.rejection_reason) {
    fields.push({
      name: "Motivo",
      value: payload.rejection_reason,
      inline: true,
    });
  }
  if (payload.quality_score !== undefined) {
    fields.push({
      name: "Qualidade",
      value: `${payload.quality_score}%`,
      inline: true,
    });
  }

  return {
    title: titleMap[type] || "📋 Notificação",
    color: colorMap[type] || 0x3b82f6,
    fields,
    timestamp: new Date().toISOString(),
  };
}

export async function sendDiscordTaskNotification(
  companyId: string,
  type: NotificationType,
  payload: TaskNotificationPayload,
) {
  try {
    // 1. Check if Discord is configured and this notification type is enabled
    const { data: config } = await (supabase as unknown)
      .from("discord_config")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!config?.is_connected || !config?.enabled) return;

    const configKey = `notify_${type}` as keyof typeof config;
    if (!config[configKey]) return;

    // 2. Find the Discord channel for this squad
    let channelId: string | null = null;

    if (payload.team_id) {
      const { data: team } = await (supabase as unknown)
        .from("teams")
        .select("discord_channel_id, name")
        .eq("id", payload.team_id)
        .maybeSingle();

      if (team?.discord_channel_id) {
        channelId = team.discord_channel_id;
        if (!payload.team_name) payload.team_name = team.name;
      }
    }

    if (!channelId) {
      // No channel mapped for this squad, skip
      return;
    }

    // 3. Build embed and send
    const embed = buildTaskEmbed(type, payload);

    await supabase.functions.invoke("discord-bot", {
      body: {
        action: "send-message",
        channel_id: channelId,
        company_id: companyId,
        embed,
      },
    });
  } catch (err) {
    console.error("[Discord] Failed to send notification:", err);
    // Don't throw - notifications are fire-and-forget
  }
}
