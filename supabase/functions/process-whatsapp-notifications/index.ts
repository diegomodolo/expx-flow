import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TriggerSchedule {
  id: string;
  trigger_id: string;
  frequency_type: string;
  times_per_day: number;
  execution_hours: number[];
  days_of_week: number[];
  day_of_month: number | null;
  respect_quiet_hours: boolean;
  last_executed_at: string | null;
  next_execution_at: string | null;
}

interface NotificationTrigger {
  id: string;
  company_id: string;
  trigger_type: string;
  trigger_name: string;
  is_active: boolean;
  conditions: Record<string, any>;
  schedule?: TriggerSchedule;
}

interface MessageTemplate {
  recipient_profile: string;
  message_template: string;
}

interface ClientContact {
  id: string;
  client_id: string;
  contact_name: string;
  phone: string;
  profile_type: string;
  receives_alerts: boolean;
  receives_reports: boolean;
}

// Helper to replace template variables
function replaceVariables(template: string, data: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value ?? ''));
  }
  return result;
}

// Check if current hour is in quiet hours
function isQuietHour(quietHours: { start: string; end: string } | null): boolean {
  if (!quietHours) return false;
  
  const now = new Date();
  const currentHour = now.getHours();
  const startHour = parseInt(quietHours.start.split(':')[0]);
  const endHour = parseInt(quietHours.end.split(':')[0]);
  
  if (startHour < endHour) {
    return currentHour >= startHour && currentHour < endHour;
  } else {
    return currentHour >= startHour || currentHour < endHour;
  }
}

// Send message via Z-API
async function sendZAPIMessage(
  instanceId: string,
  token: string,
  phone: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message }),
      }
    );
    
    const result = await response.json();
    console.log(`Z-API response for ${phone}:`, result);
    return response.ok;
  } catch (error) {
    console.error(`Error sending to ${phone}:`, error);
    return false;
  }
}

// Calculate next execution time
function calculateNextExecution(schedule: TriggerSchedule): Date {
  const now = new Date();
  const next = new Date(now);
  
  switch (schedule.frequency_type) {
    case 'realtime':
      // Next hour
      next.setHours(next.getHours() + 1);
      next.setMinutes(0, 0, 0);
      break;
      
    case 'hourly':
      next.setHours(next.getHours() + 1);
      next.setMinutes(0, 0, 0);
      break;
      
    case 'daily':
      // Find next execution hour
      const currentHour = now.getHours();
      const nextHour = schedule.execution_hours.find(h => h > currentHour);
      
      if (nextHour !== undefined) {
        next.setHours(nextHour, 0, 0, 0);
      } else {
        // Next day, first hour
        next.setDate(next.getDate() + 1);
        next.setHours(schedule.execution_hours[0] || 9, 0, 0, 0);
      }
      break;
      
    case 'weekly':
      const currentDay = now.getDay();
      const currentDayHour = now.getHours();
      const execHour = schedule.execution_hours[0] || 9;
      
      // Check if we can still execute today
      if (schedule.days_of_week.includes(currentDay) && currentDayHour < execHour) {
        next.setHours(execHour, 0, 0, 0);
      } else {
        // Find next day
        let daysToAdd = 1;
        for (let i = 1; i <= 7; i++) {
          const checkDay = (currentDay + i) % 7;
          if (schedule.days_of_week.includes(checkDay)) {
            daysToAdd = i;
            break;
          }
        }
        next.setDate(next.getDate() + daysToAdd);
        next.setHours(execHour, 0, 0, 0);
      }
      break;
      
    case 'monthly':
      const targetDay = schedule.day_of_month || 1;
      const monthExecHour = schedule.execution_hours[0] || 9;
      
      if (now.getDate() < targetDay || (now.getDate() === targetDay && now.getHours() < monthExecHour)) {
        next.setDate(targetDay);
        next.setHours(monthExecHour, 0, 0, 0);
      } else {
        next.setMonth(next.getMonth() + 1);
        next.setDate(targetDay);
        next.setHours(monthExecHour, 0, 0, 0);
      }
      break;
  }
  
  return next;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting WhatsApp notifications processing...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Get all active triggers with schedules that should execute
    const { data: triggers, error: triggersError } = await supabase
      .from('whatsapp_notification_triggers')
      .select(`
        *,
        schedule:whatsapp_trigger_schedules(*)
      `)
      .eq('is_active', true);
    
    if (triggersError) {
      console.error('Error fetching triggers:', triggersError);
      throw triggersError;
    }
    
    console.log(`Found ${triggers?.length || 0} active triggers`);
    
    const results: any[] = [];
    
    for (const trigger of triggers || []) {
      const schedule = trigger.schedule?.[0] as TriggerSchedule | undefined;
      if (!schedule) {
        console.log(`Trigger ${trigger.trigger_name} has no schedule, skipping`);
        continue;
      }
      
      // Check if should execute based on schedule
      let shouldExecute = false;
      
      switch (schedule.frequency_type) {
        case 'realtime':
          shouldExecute = true;
          break;
          
        case 'hourly':
          shouldExecute = true;
          break;
          
        case 'daily':
          shouldExecute = schedule.execution_hours?.includes(currentHour) || false;
          break;
          
        case 'weekly':
          const currentDay = now.getDay();
          shouldExecute = 
            (schedule.days_of_week?.includes(currentDay) || false) &&
            (schedule.execution_hours?.includes(currentHour) || false);
          break;
          
        case 'monthly':
          shouldExecute = 
            now.getDate() === schedule.day_of_month &&
            (schedule.execution_hours?.includes(currentHour) || false);
          break;
      }
      
      if (!shouldExecute) {
        console.log(`Trigger ${trigger.trigger_name} not scheduled for now, skipping`);
        continue;
      }
      
      // Check if already executed this hour
      if (schedule.last_executed_at) {
        const lastExec = new Date(schedule.last_executed_at);
        const hoursSinceLastExec = (now.getTime() - lastExec.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastExec < 1) {
          console.log(`Trigger ${trigger.trigger_name} already executed recently, skipping`);
          continue;
        }
      }
      
      console.log(`Processing trigger: ${trigger.trigger_name} (${trigger.trigger_type})`);
      
      // Get WhatsApp config for this company
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('company_id', trigger.company_id)
        .eq('is_active', true)
        .single();
      
      if (!config || !config.is_connected) {
        console.log(`No active WhatsApp config for company ${trigger.company_id}`);
        continue;
      }
      
      // Check quiet hours
      if (schedule.respect_quiet_hours && isQuietHour(config.quiet_hours)) {
        console.log(`Quiet hours active for company ${trigger.company_id}, skipping`);
        continue;
      }
      
      // Get templates for this trigger
      const { data: templates } = await supabase
        .from('whatsapp_message_templates')
        .select('*')
        .eq('trigger_id', trigger.id)
        .eq('is_active', true);
      
      if (!templates || templates.length === 0) {
        console.log(`No templates for trigger ${trigger.trigger_name}`);
        continue;
      }
      
      // Get contacts for this company
      const { data: contacts } = await supabase
        .from('whatsapp_client_contacts')
        .select('*')
        .eq('company_id', trigger.company_id)
        .eq('is_active', true);
      
      if (!contacts || contacts.length === 0) {
        console.log(`No contacts for company ${trigger.company_id}`);
        continue;
      }
      
      // Create execution log
      const { data: logEntry, error: logError } = await supabase
        .from('whatsapp_execution_log')
        .insert({
          company_id: trigger.company_id,
          trigger_id: trigger.id,
          schedule_id: schedule.id,
          status: 'processing',
          started_at: now.toISOString(),
        })
        .select()
        .single();
      
      if (logError) {
        console.error('Error creating log entry:', logError);
        continue;
      }
      
      let messagesSent = 0;
      let messagesFailed = 0;
      const executionDetails: any[] = [];
      
      // Process based on trigger type
      // For now, we'll just send the template message to all relevant contacts
      // In a real implementation, you'd fetch the actual data (high CPA campaigns, low balance clients, etc.)
      
      for (const contact of contacts) {
        // Find the right template for this contact's profile
        const template = templates.find(t => 
          t.recipient_profile === contact.profile_type ||
          (contact.profile_type === 'financeiro' && t.recipient_profile === 'gestor')
        );
        
        if (!template) {
          console.log(`No template for profile ${contact.profile_type}`);
          continue;
        }
        
        // Check if contact should receive this type of notification
        const isAlertType = ['high_cpa', 'low_balance', 'disabled_account', 'post_failed'].includes(trigger.trigger_type);
        const isReportType = ['weekly_report', 'monthly_report'].includes(trigger.trigger_type);
        
        if (isAlertType && !contact.receives_alerts) continue;
        if (isReportType && !contact.receives_reports) continue;
        
        // Get client info
        const { data: client } = await supabase
          .from('clients')
          .select('name, company')
          .eq('id', contact.client_id)
          .single();
        
        // Prepare template variables
        const variables = {
          cliente: client?.name || 'Cliente',
          empresa: client?.company || '',
          gestor: contact.contact_name,
          data: now.toLocaleDateString('pt-BR'),
          hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          link_dashboard: `https://controledetrafego.com.br/dashboard`,
          // Add more variables based on trigger type...
        };
        
        const message = replaceVariables(template.message_template, variables);
        
        // Send message
        const success = await sendZAPIMessage(
          config.instance_id,
          config.token,
          contact.phone,
          message
        );
        
        if (success) {
          messagesSent++;
          executionDetails.push({
            contact_id: contact.id,
            contact_name: contact.contact_name,
            phone: contact.phone,
            status: 'sent',
          });
        } else {
          messagesFailed++;
          executionDetails.push({
            contact_id: contact.id,
            contact_name: contact.contact_name,
            phone: contact.phone,
            status: 'failed',
          });
        }
      }
      
      // Update log entry
      await supabase
        .from('whatsapp_execution_log')
        .update({
          status: messagesFailed === 0 ? 'completed' : (messagesSent === 0 ? 'failed' : 'completed'),
          messages_sent: messagesSent,
          messages_failed: messagesFailed,
          execution_details: { contacts: executionDetails },
          completed_at: new Date().toISOString(),
        })
        .eq('id', logEntry.id);
      
      // Update schedule last/next execution
      const nextExecution = calculateNextExecution(schedule);
      await supabase
        .from('whatsapp_trigger_schedules')
        .update({
          last_executed_at: now.toISOString(),
          next_execution_at: nextExecution.toISOString(),
        })
        .eq('id', schedule.id);
      
      results.push({
        trigger: trigger.trigger_name,
        messagesSent,
        messagesFailed,
      });
      
      console.log(`Trigger ${trigger.trigger_name}: ${messagesSent} sent, ${messagesFailed} failed`);
    }
    
    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing WhatsApp notifications:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
