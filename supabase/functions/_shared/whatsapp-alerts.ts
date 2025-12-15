import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WhatsAppAlertOptions {
  companyId: string;
  notificationType: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  filterAlerts?: boolean; // Use receive_alerts filter
  filterReports?: boolean; // Use receive_reports filter
}

/**
 * Helper function to send WhatsApp notifications to all configured recipients
 * This function checks preferences, fetches recipients, and sends notifications
 */
export async function sendWhatsAppAlerts(
  supabase: ReturnType<typeof createClient>,
  options: WhatsAppAlertOptions
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  const {
    companyId,
    notificationType,
    message,
    relatedEntityType,
    relatedEntityId,
    filterAlerts = true,
    filterReports = false,
  } = options;

  const errors: string[] = [];
  let sentCount = 0;

  try {
    console.log(`[WhatsApp Alert] Sending ${notificationType} alert for company:`, companyId);

    // Check if company has active WhatsApp config
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .eq("is_connected", true)
      .maybeSingle();

    if (configError) {
      console.error("[WhatsApp Alert] Config error:", configError);
      return { success: false, sentCount: 0, errors: [configError.message] };
    }

    if (!config) {
      console.log("[WhatsApp Alert] No active/connected config found for company");
      return { success: true, sentCount: 0, errors: [] }; // Not an error, just not configured
    }

    // Check notification preferences
    const { data: prefs } = await supabase
      .from("whatsapp_notification_preferences")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    // Check if this notification type is enabled
    const prefKey = `notify_${notificationType.replace(/-/g, "_")}`;
    if (prefs && prefs[prefKey] === false) {
      console.log(`[WhatsApp Alert] Notification type ${notificationType} is disabled`);
      return { success: true, sentCount: 0, errors: [] };
    }

    // Check quiet hours
    if (prefs?.quiet_hours_start && prefs?.quiet_hours_end) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      if (currentTime >= prefs.quiet_hours_start && currentTime <= prefs.quiet_hours_end) {
        console.log("[WhatsApp Alert] Quiet hours active, skipping notification");
        return { success: true, sentCount: 0, errors: [] };
      }
    }

    // Fetch recipients
    let recipientsQuery = supabase
      .from("whatsapp_recipients")
      .select("*")
      .eq("company_id", companyId);

    if (filterAlerts) {
      recipientsQuery = recipientsQuery.eq("receive_alerts", true);
    }
    if (filterReports) {
      recipientsQuery = recipientsQuery.eq("receive_reports", true);
    }

    const { data: recipients, error: recipientsError } = await recipientsQuery;

    if (recipientsError) {
      console.error("[WhatsApp Alert] Recipients error:", recipientsError);
      return { success: false, sentCount: 0, errors: [recipientsError.message] };
    }

    if (!recipients || recipients.length === 0) {
      console.log("[WhatsApp Alert] No recipients configured");
      return { success: true, sentCount: 0, errors: [] };
    }

    console.log(`[WhatsApp Alert] Sending to ${recipients.length} recipients`);

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        // Format phone number
        let phone = recipient.phone.replace(/\D/g, "");
        if (!phone.startsWith("55")) {
          phone = "55" + phone;
        }

        // Create log entry
        const { data: logEntry } = await supabase
          .from("whatsapp_notification_log")
          .insert({
            company_id: companyId,
            recipient_phone: phone,
            notification_type: notificationType,
            message_content: message,
            status: "pending",
            related_entity_type: relatedEntityType,
            related_entity_id: relatedEntityId,
          })
          .select()
          .single();

        // Send via Z-API
        const zapiUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/send-text`;

        const zapiResponse = await fetch(zapiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.client_token ? { "Client-Token": config.client_token } : {}),
          },
          body: JSON.stringify({
            phone: phone,
            message: message,
          }),
        });

        const zapiData = await zapiResponse.json();

        // Update log
        if (logEntry) {
          await supabase
            .from("whatsapp_notification_log")
            .update({
              status: zapiResponse.ok ? "sent" : "failed",
              zapi_message_id: zapiData.messageId || zapiData.zapiMessageId || null,
              error_message: zapiResponse.ok ? null : (zapiData.message || zapiData.error || "Unknown error"),
            })
            .eq("id", logEntry.id);
        }

        if (zapiResponse.ok) {
          sentCount++;
          console.log(`[WhatsApp Alert] Sent to ${recipient.name} (${phone})`);
        } else {
          errors.push(`Failed to send to ${recipient.name}: ${zapiData.message || "Unknown error"}`);
          console.error(`[WhatsApp Alert] Failed to send to ${recipient.name}:`, zapiData);
        }
      } catch (err: any) {
        errors.push(`Error sending to ${recipient.name}: ${err.message}`);
        console.error(`[WhatsApp Alert] Error sending to ${recipient.name}:`, err);
      }
    }

    console.log(`[WhatsApp Alert] Completed: ${sentCount}/${recipients.length} sent`);
    return { success: true, sentCount, errors };

  } catch (error: any) {
    console.error("[WhatsApp Alert] General error:", error);
    return { success: false, sentCount: 0, errors: [error.message] };
  }
}

/**
 * Build formatted alert messages for different notification types
 */
export function buildAlertMessage(
  type: "high_cpa" | "low_balance" | "disabled_account" | "post_published" | "post_failed",
  data: Record<string, any>
): string {
  switch (type) {
    case "high_cpa":
      return `⚠️ *Alerta de CPA Alto*

Cliente: *${data.clientName}*
Campanha: ${data.campaignName}
CPA Atual: R$ ${data.currentCpa?.toFixed(2) || "0,00"}
CPA Médio: R$ ${data.averageCpa?.toFixed(2) || "0,00"}
Variação: +${data.percentageAbove?.toFixed(0) || "0"}%

📊 Recomendação: Revisar segmentação e criativos`;

    case "low_balance":
      return `💰 *Alerta de Saldo Baixo*

Cliente: *${data.clientName}*
Saldo Atual: R$ ${data.balance?.toFixed(2) || "0,00"}
Gasto Médio/Dia: R$ ${data.dailySpend?.toFixed(2) || "0,00"}
Previsão de Duração: ${data.daysRemaining || 0} dias

⚠️ Ação necessária: Adicionar fundos`;

    case "disabled_account":
      return `🚨 *Conta de Anúncios Desabilitada*

Cliente: *${data.clientName}*
Conta: ${data.accountName}
${data.reason ? `Motivo: ${data.reason}` : ""}

📍 Acesse o Business Manager para resolver`;

    case "post_published":
      return `✅ *Post Publicado com Sucesso*

Cliente: *${data.clientName}*
Plataformas: ${data.platforms}
Horário: ${data.publishedAt}

${data.caption ? `Legenda: ${data.caption.substring(0, 100)}...` : ""}`;

    case "post_failed":
      return `❌ *Falha na Publicação*

Cliente: *${data.clientName}*
Plataformas: ${data.platforms}
Erro: ${data.error}

📌 Verifique as configurações e tente novamente`;

    default:
      return data.message || "Notificação do sistema";
  }
}