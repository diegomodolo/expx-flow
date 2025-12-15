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

// Helper to format currency
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0,00';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper to format percentage
function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0,00';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper to format number
function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return Math.round(value).toLocaleString('pt-BR');
}

// Helper to calculate variation percentage
function calcVariation(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const variation = ((current - previous) / previous) * 100;
  const sign = variation >= 0 ? '+' : '';
  return `${sign}${variation.toFixed(1)}%`;
}

// Helper to replace template variables
function replaceVariables(template: string, data: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value ?? ''));
  }
  return result;
}

// Get current time in São Paulo timezone (UTC-3)
function getSaoPauloTime(): { hour: number; day: number; date: number; month: number; year: number; now: Date } {
  const now = new Date();
  // São Paulo = UTC-3
  const saoPauloOffset = -3;
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();
  const utcDate = now.getUTCDate();
  const utcMonth = now.getUTCMonth();
  const utcYear = now.getUTCFullYear();
  
  // Ajustar para São Paulo
  let spHour = utcHour + saoPauloOffset;
  let spDay = utcDay;
  let spDate = utcDate;
  let spMonth = utcMonth;
  let spYear = utcYear;
  
  // Se passar da meia-noite para trás
  if (spHour < 0) {
    spHour += 24;
    // Calcular o dia anterior corretamente
    const tempDate = new Date(Date.UTC(utcYear, utcMonth, utcDate - 1));
    spDay = tempDate.getUTCDay();
    spDate = tempDate.getUTCDate();
    spMonth = tempDate.getUTCMonth();
    spYear = tempDate.getUTCFullYear();
  }
  
  return { hour: spHour, day: spDay, date: spDate, month: spMonth, year: spYear, now };
}

// Check if current hour is in quiet hours
function isQuietHour(quietHours: { start: string; end: string } | null): boolean {
  if (!quietHours) return false;
  
  const sp = getSaoPauloTime();
  const currentHour = sp.hour;
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
  clientToken: string | null,
  phone: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(clientToken ? { 'Client-Token': clientToken } : {}),
        },
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
      next.setHours(next.getHours() + 1);
      next.setMinutes(0, 0, 0);
      break;
      
    case 'hourly':
      next.setHours(next.getHours() + 1);
      next.setMinutes(0, 0, 0);
      break;
      
    case 'daily':
      const currentHour = now.getHours();
      const nextHour = schedule.execution_hours.find(h => h > currentHour);
      
      if (nextHour !== undefined) {
        next.setHours(nextHour, 0, 0, 0);
      } else {
        next.setDate(next.getDate() + 1);
        next.setHours(schedule.execution_hours[0] || 9, 0, 0, 0);
      }
      break;
      
    case 'weekly':
      const currentDay = now.getDay();
      const currentDayHour = now.getHours();
      const execHour = schedule.execution_hours[0] || 9;
      
      if (schedule.days_of_week.includes(currentDay) && currentDayHour < execHour) {
        next.setHours(execHour, 0, 0, 0);
      } else {
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

// Fetch client metrics for reports
async function fetchClientMetrics(supabase: any, clientId: string, periodDays: number) {
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - periodDays);
  
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);

  // Fetch current period campaigns
  const { data: currentCampaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true);

  // Aggregate current metrics
  let current = {
    spend: 0,
    impressions: 0,
    clicks: 0,
    reach: 0,
    conversions: 0,
    frequency: 0,
    count: 0,
    bestCampaign: { name: '-', conversions: 0 }
  };

  if (currentCampaigns && currentCampaigns.length > 0) {
    for (const campaign of currentCampaigns) {
      current.spend += campaign.spend || 0;
      current.impressions += campaign.impressions || 0;
      current.clicks += campaign.clicks || 0;
      current.reach += campaign.reach || 0;
      current.conversions += campaign.conversions || 0;
      current.frequency += campaign.frequency || 0;
      current.count++;

      if ((campaign.conversions || 0) > current.bestCampaign.conversions) {
        current.bestCampaign = { name: campaign.name, conversions: campaign.conversions || 0 };
      }
    }
  }

  // Calculate derived metrics
  const cpm = current.impressions > 0 ? (current.spend / current.impressions) * 1000 : 0;
  const cpc = current.clicks > 0 ? current.spend / current.clicks : 0;
  const cpa = current.conversions > 0 ? current.spend / current.conversions : 0;
  const ctr = current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0;
  const avgFrequency = current.count > 0 ? current.frequency / current.count : 0;

  // Mock previous period for variations (in production, would fetch actual previous period data)
  const previous = {
    spend: current.spend * 0.9,
    conversions: current.conversions * 0.92,
    reach: current.reach * 0.85,
    ctr: ctr * 1.02,
    cpa: cpa * 1.05
  };

  return {
    current: {
      spend: current.spend,
      impressions: current.impressions,
      clicks: current.clicks,
      reach: current.reach,
      conversions: current.conversions,
      frequency: avgFrequency,
      cpm,
      cpc,
      cpa,
      ctr,
      campaignCount: current.count,
      bestCampaign: current.bestCampaign.name
    },
    variations: {
      investimento: calcVariation(current.spend, previous.spend),
      conversoes: calcVariation(current.conversions, previous.conversions),
      alcance: calcVariation(current.reach, previous.reach),
      ctr: calcVariation(ctr, previous.ctr),
      cpa: calcVariation(cpa, previous.cpa)
    },
    periodStart,
    periodEnd: now
  };
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
    const sp = getSaoPauloTime();
    const currentHour = sp.hour;
    const currentDay = sp.day;
    const currentDate = sp.date;
    
    console.log(`Current UTC time: ${now.toISOString()}`);
    console.log(`Current São Paulo time: hour=${currentHour}, day=${currentDay}, date=${currentDate}`);
    
    // Get all active triggers (separate query)
    const { data: triggers, error: triggersError } = await supabase
      .from('whatsapp_notification_triggers')
      .select('*')
      .eq('is_active', true);
    
    if (triggersError) {
      console.error('Error fetching triggers:', triggersError);
      throw triggersError;
    }
    
    console.log(`Found ${triggers?.length || 0} active triggers`);
    
    if (!triggers || triggers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active triggers found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get all schedules for active triggers (separate query)
    const triggerIds = triggers.map(t => t.id);
    const { data: schedules, error: schedulesError } = await supabase
      .from('whatsapp_trigger_schedules')
      .select('*')
      .in('trigger_id', triggerIds);
    
    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      throw schedulesError;
    }
    
    console.log(`Found ${schedules?.length || 0} schedules for triggers`);
    
    // Create a map of schedules by trigger_id
    const scheduleMap = new Map<string, TriggerSchedule>();
    for (const schedule of schedules || []) {
      scheduleMap.set(schedule.trigger_id, schedule as TriggerSchedule);
    }
    
    const results: any[] = [];
    
    for (const trigger of triggers) {
      const schedule = scheduleMap.get(trigger.id);
      
      console.log(`Processing trigger: ${trigger.trigger_name} (${trigger.id})`);
      console.log(`  Schedule found: ${!!schedule}`);
      
      if (!schedule) {
        console.log(`  -> No schedule for trigger ${trigger.trigger_name}, skipping`);
        continue;
      }
      
      console.log(`  Schedule details: type=${schedule.frequency_type}, hours=${JSON.stringify(schedule.execution_hours)}, days_of_week=${JSON.stringify(schedule.days_of_week)}, day_of_month=${schedule.day_of_month}`);
      console.log(`  Last executed: ${schedule.last_executed_at}, Next execution: ${schedule.next_execution_at}`);
      
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
          shouldExecute = Array.isArray(schedule.execution_hours) && schedule.execution_hours.includes(currentHour);
          console.log(`  Daily check: currentHour=${currentHour}, execution_hours=${JSON.stringify(schedule.execution_hours)}, shouldExecute=${shouldExecute}`);
          break;
        case 'weekly':
          const dayMatch = Array.isArray(schedule.days_of_week) && schedule.days_of_week.includes(currentDay);
          const hourMatch = Array.isArray(schedule.execution_hours) && schedule.execution_hours.includes(currentHour);
          shouldExecute = dayMatch && hourMatch;
          console.log(`  Weekly check: currentDay=${currentDay}, currentHour=${currentHour}, dayMatch=${dayMatch}, hourMatch=${hourMatch}, shouldExecute=${shouldExecute}`);
          break;
        case 'monthly':
          shouldExecute = currentDate === schedule.day_of_month && 
            (Array.isArray(schedule.execution_hours) && schedule.execution_hours.includes(currentHour));
          console.log(`  Monthly check: currentDate=${currentDate}, day_of_month=${schedule.day_of_month}, shouldExecute=${shouldExecute}`);
          break;
      }
      
      if (!shouldExecute) {
        console.log(`  -> Trigger ${trigger.trigger_name} not scheduled for now (hour=${currentHour}), skipping`);
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
        .from('whatsapp_configs')
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
        .select('*, client:clients(id, name, company, dashboard_token, ad_account_id)')
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
      
      // Determine period days based on trigger type
      const periodDays = trigger.trigger_type === 'monthly_report' ? 30 : 7;
      
      // Group contacts by client to fetch metrics once per client
      const contactsByClient = contacts.reduce((acc: any, contact: any) => {
        if (!acc[contact.client_id]) {
          acc[contact.client_id] = {
            client: contact.client,
            contacts: []
          };
        }
        acc[contact.client_id].contacts.push(contact);
        return acc;
      }, {});
      
      // Process each client
      for (const clientId of Object.keys(contactsByClient)) {
        const { client, contacts: clientContacts } = contactsByClient[clientId];
        
        if (!client) continue;
        
        // Fetch metrics for this client
        const metrics = await fetchClientMetrics(supabase, clientId, periodDays);
        
        // Get account balance
        let accountBalance = 0;
        let dailySpend = 0;
        let daysRemaining = 0;
        
        if (client.ad_account_id) {
          const { data: adAccount } = await supabase
            .from("facebook_ad_accounts")
            .select("balance")
            .eq("id", client.ad_account_id)
            .single();

          if (adAccount) {
            accountBalance = (adAccount.balance || 0) / 100;
            dailySpend = metrics.current.spend / periodDays;
            daysRemaining = dailySpend > 0 ? Math.floor(accountBalance / dailySpend) : 0;
          }
        }
        
        // Build dashboard link
        const dashboardLink = client.dashboard_token 
          ? `https://controledetrafego.com.br/dashboard-publico/${client.dashboard_token}`
          : 'https://controledetrafego.com.br';
        
        // Build variables for this client
        const variables = {
          // Identification
          cliente: client.name || 'Cliente',
          empresa: client.company || '',
          gestor: '',
          
          // Performance metrics
          investimento: formatCurrency(metrics.current.spend),
          impressoes: formatNumber(metrics.current.impressions),
          cliques: formatNumber(metrics.current.clicks),
          alcance: formatNumber(metrics.current.reach),
          conversoes: formatNumber(metrics.current.conversions),
          frequencia: formatPercentage(metrics.current.frequency),
          
          // Cost metrics
          cpm: formatCurrency(metrics.current.cpm),
          cpc: formatCurrency(metrics.current.cpc),
          cpa_atual: formatCurrency(metrics.current.cpa),
          ctr: formatPercentage(metrics.current.ctr),
          
          // Comparisons
          variacao_investimento: metrics.variations.investimento,
          variacao_conversoes: metrics.variations.conversoes,
          variacao_ctr: metrics.variations.ctr,
          variacao_alcance: metrics.variations.alcance,
          variacao_cpa: metrics.variations.cpa,
          
          // Balance
          saldo: formatCurrency(accountBalance),
          gasto_diario: formatCurrency(dailySpend),
          dias_restantes: String(daysRemaining),
          
          // Period
          data: now.toLocaleDateString('pt-BR'),
          hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          periodo_inicio: metrics.periodStart.toLocaleDateString('pt-BR'),
          periodo_fim: metrics.periodEnd.toLocaleDateString('pt-BR'),
          
          // Campaigns
          campanha: metrics.current.bestCampaign,
          campanhas_ativas: String(metrics.current.campaignCount),
          melhor_campanha: metrics.current.bestCampaign,
          
          // Links
          link_dashboard: dashboardLink,
        };
        
        // Send to each contact
        for (const contact of clientContacts) {
          // Find the right template for this contact's profile
          const template = templates.find((t: any) => 
            t.recipient_profile === contact.profile_type ||
            t.recipient_profile === 'cliente'
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
          
          // Update gestor name in variables
          variables.gestor = contact.contact_name;
          
          const message = replaceVariables(template.message_template, variables);
          
          // Format phone
          let formattedPhone = contact.phone.replace(/\D/g, '');
          if (!formattedPhone.startsWith('55')) {
            formattedPhone = '55' + formattedPhone;
          }
          
          // Send message
          const success = await sendZAPIMessage(
            config.instance_id,
            config.token,
            config.client_token,
            formattedPhone,
            message
          );
          
          if (success) {
            messagesSent++;
            executionDetails.push({
              contact_id: contact.id,
              contact_name: contact.contact_name,
              phone: formattedPhone,
              client_name: client.name,
              status: 'sent',
            });
          } else {
            messagesFailed++;
            executionDetails.push({
              contact_id: contact.id,
              contact_name: contact.contact_name,
              phone: formattedPhone,
              client_name: client.name,
              status: 'failed',
            });
          }
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