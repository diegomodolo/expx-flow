import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestNotificationPayload {
  triggerId: string;
  clientId: string;
  destination: 'gestor' | 'cliente' | 'ambos';
  companyId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: TestNotificationPayload = await req.json();
    const { triggerId, clientId, destination, companyId } = payload;

    console.log("[test-send-notification] Testing notification");
    console.log("[test-send-notification] Trigger:", triggerId);
    console.log("[test-send-notification] Client:", clientId);
    console.log("[test-send-notification] Destination:", destination);

    if (!triggerId || !clientId || !companyId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "triggerId, clientId e companyId são obrigatórios" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get trigger details
    const { data: trigger, error: triggerError } = await supabase
      .from("whatsapp_notification_triggers")
      .select(`
        *,
        templates:whatsapp_message_templates(*)
      `)
      .eq("id", triggerId)
      .single();

    if (triggerError || !trigger) {
      console.error("[test-send-notification] Trigger not found:", triggerError);
      return new Response(
        JSON.stringify({ success: false, error: "Gatilho não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, company, email")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("[test-send-notification] Client not found:", clientError);
      return new Response(
        JSON.stringify({ success: false, error: "Cliente não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get WhatsApp config
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      console.error("[test-send-notification] Config not found:", configError);
      return new Response(
        JSON.stringify({ success: false, error: "Configuração do WhatsApp não encontrada ou inativa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.is_connected) {
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp não está conectado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipients: { phone: string; profile: string; name: string }[] = [];

    // Get gestor if needed
    if (destination === 'gestor' || destination === 'ambos') {
      const { data: settings } = await supabase
        .from("whatsapp_client_notification_settings")
        .select(`
          gestor:employees(id, name, phone)
        `)
        .eq("company_id", companyId)
        .eq("client_id", clientId)
        .single();

      if (settings?.gestor?.phone) {
        recipients.push({
          phone: settings.gestor.phone,
          profile: 'gestor',
          name: settings.gestor.name,
        });
      }
    }

    // Get client contacts if needed
    if (destination === 'cliente' || destination === 'ambos') {
      // First try whatsapp_client_contacts
      const { data: whatsappContacts } = await supabase
        .from("whatsapp_client_contacts")
        .select("*")
        .eq("company_id", companyId)
        .eq("client_id", clientId)
        .eq("is_active", true);

      if (whatsappContacts && whatsappContacts.length > 0) {
        for (const contact of whatsappContacts) {
          recipients.push({
            phone: contact.phone,
            profile: 'cliente',
            name: contact.contact_name,
          });
        }
      }

      // Also check client_contacts table (centralized contacts)
      const { data: clientContacts } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true);

      if (clientContacts) {
        for (const contact of clientContacts) {
          // Only add if phone exists and not already added
          if (contact.phone && !recipients.some(r => r.phone.replace(/\D/g, '') === contact.phone.replace(/\D/g, ''))) {
            recipients.push({
              phone: contact.phone,
              profile: 'cliente',
              name: contact.name,
            });
          }
        }
      }
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Nenhum destinatário encontrado. Cadastre contatos para este cliente ou associe um gestor." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get templates
    const templates = trigger.templates || [];
    const gestorTemplate = templates.find((t: any) => t.recipient_profile === 'gestor' && t.is_active);
    const clienteTemplate = templates.find((t: any) => t.recipient_profile === 'cliente' && t.is_active);

    // Replace variables in message
    const replaceVariables = (template: string, vars: Record<string, string>) => {
      let result = template;
      for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
      return result;
    };

    const now = new Date();
    const variables = {
      cliente: client.name,
      empresa: client.company,
      data: now.toLocaleDateString('pt-BR'),
      hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      gatilho: trigger.trigger_name,
    };

    const results: any[] = [];

    for (const recipient of recipients) {
      const template = recipient.profile === 'gestor' ? gestorTemplate : clienteTemplate;
      
      if (!template) {
        console.log(`[test-send-notification] No template for profile ${recipient.profile}`);
        continue;
      }

      const message = replaceVariables(template.message_template, variables);
      const testMessage = `🧪 *TESTE DE RELATÓRIO*\n\n${message}\n\n_Esta é uma mensagem de teste enviada manualmente._`;

      // Format phone
      let formattedPhone = recipient.phone.replace(/\D/g, "");
      if (!formattedPhone.startsWith("55")) {
        formattedPhone = "55" + formattedPhone;
      }

      console.log(`[test-send-notification] Sending to ${recipient.name} (${recipient.profile}): ${formattedPhone}`);

      // Create log entry
      const { data: logEntry } = await supabase
        .from("whatsapp_notification_log")
        .insert({
          company_id: companyId,
          recipient_phone: formattedPhone,
          notification_type: `test_${trigger.trigger_type}`,
          message_content: testMessage,
          status: "pending",
          related_entity_type: "trigger",
          related_entity_id: triggerId,
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
          phone: formattedPhone,
          message: testMessage,
        }),
      });

      const zapiData = await zapiResponse.json();
      console.log(`[test-send-notification] Z-API response for ${recipient.name}:`, zapiData);

      // Update log
      if (logEntry) {
        await supabase
          .from("whatsapp_notification_log")
          .update({
            status: zapiResponse.ok ? "sent" : "failed",
            zapi_message_id: zapiData.messageId || zapiData.zapiMessageId || null,
            error_message: !zapiResponse.ok ? (zapiData.message || "Erro desconhecido") : null,
          })
          .eq("id", logEntry.id);
      }

      results.push({
        recipient: recipient.name,
        phone: formattedPhone,
        profile: recipient.profile,
        success: zapiResponse.ok,
        error: !zapiResponse.ok ? zapiData.message : null,
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[test-send-notification] Completed. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        success: failCount === 0,
        results,
        summary: {
          sent: successCount,
          failed: failCount,
          total: results.length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[test-send-notification] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
