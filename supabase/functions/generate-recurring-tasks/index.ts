import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringTaskTemplate {
  id: string;
  company_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  assigned_to: string | null;
  recurrence_type: string;
  recurrence_interval: number;
  days_before_visible: number;
  days_to_complete: number;
  day_of_week: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  next_generation_date: string;
  is_active: boolean;
}

function calculateNextGenerationDate(
  currentDate: Date,
  recurrenceType: string,
  recurrenceInterval: number,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  monthOfYear: number | null
): Date {
  const nextDate = new Date(currentDate);
  
  switch (recurrenceType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + recurrenceInterval);
      break;
    case 'weekly':
      // Move forward by the interval weeks
      nextDate.setDate(nextDate.getDate() + (7 * recurrenceInterval));
      // Adjust to the specified day of week if set
      if (dayOfWeek !== null) {
        const currentDay = nextDate.getDay();
        const diff = dayOfWeek - currentDay;
        nextDate.setDate(nextDate.getDate() + diff);
      }
      break;
    case 'monthly':
      // Move forward by the interval months
      nextDate.setMonth(nextDate.getMonth() + recurrenceInterval);
      // Set to the specified day of month if set
      if (dayOfMonth !== null) {
        // Handle months with fewer days
        const maxDays = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(dayOfMonth, maxDays));
      }
      break;
    case 'yearly':
      // Move forward by the interval years
      nextDate.setFullYear(nextDate.getFullYear() + recurrenceInterval);
      // Set to the specified month and day if set
      if (monthOfYear !== null) {
        nextDate.setMonth(monthOfYear - 1); // monthOfYear is 1-12, setMonth expects 0-11
      }
      if (dayOfMonth !== null) {
        const maxDays = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(dayOfMonth, maxDays));
      }
      break;
    default:
      nextDate.setDate(nextDate.getDate() + 1);
  }
  
  return nextDate;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const now = new Date();
  console.log('============================================');
  console.log('=== RECURRING TASKS GENERATION STARTED ===');
  console.log('============================================');
  console.log('Execution timestamp (UTC):', now.toISOString());
  console.log('Execution timestamp (ISO Date):', now.toISOString().split('T')[0]);
  
  // Log timezone info for debugging
  const saoPauloTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  console.log('São Paulo time:', saoPauloTime.toISOString());

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in YYYY-MM-DD format (UTC)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log('');
    console.log('=== QUERY PARAMETERS ===');
    console.log('Looking for templates where:');
    console.log('  - is_active = true');
    console.log('  - next_generation_date <=', todayStr);

    // First, fetch ALL active templates to see what exists
    const { data: allActiveTemplates, error: allFetchError } = await supabase
      .from('recurring_task_templates')
      .select('id, title, next_generation_date, is_active, last_generated_at')
      .eq('is_active', true);

    console.log('');
    console.log('=== ALL ACTIVE TEMPLATES ===');
    if (allFetchError) {
      console.error('Error fetching all templates:', allFetchError);
    } else if (!allActiveTemplates || allActiveTemplates.length === 0) {
      console.log('No active templates found in database');
    } else {
      console.log(`Found ${allActiveTemplates.length} active templates total:`);
      allActiveTemplates.forEach((t, i) => {
        const shouldGenerate = t.next_generation_date <= todayStr;
        console.log(`  ${i + 1}. "${t.title}"`);
        console.log(`     - next_generation_date: ${t.next_generation_date}`);
        console.log(`     - last_generated_at: ${t.last_generated_at || 'never'}`);
        console.log(`     - should_generate_today: ${shouldGenerate} (${t.next_generation_date} <= ${todayStr})`);
      });
    }

    // Fetch active templates that are due for generation
    const { data: templates, error: fetchError } = await supabase
      .from('recurring_task_templates')
      .select('*')
      .eq('is_active', true)
      .lte('next_generation_date', todayStr);

    if (fetchError) {
      console.error('Error fetching templates:', fetchError);
      throw fetchError;
    }

    console.log('');
    console.log('=== TEMPLATES TO PROCESS ===');
    console.log(`Found ${templates?.length || 0} templates due for generation`);

    const results = {
      processed: 0,
      created: 0,
      errors: [] as string[],
      details: [] as { templateId: string; title: string; status: string; taskId?: string; error?: string }[],
    };

    if (!templates || templates.length === 0) {
      console.log('No templates need processing at this time');
      console.log('============================================');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No templates to process',
        results,
        debug: {
          executionTime: now.toISOString(),
          todayStr,
          activeTemplatesCount: allActiveTemplates?.length || 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('');
    for (const template of templates as RecurringTaskTemplate[]) {
      console.log('-------------------------------------------');
      console.log(`Processing template: "${template.title}" (${template.id})`);
      console.log(`  - recurrence_type: ${template.recurrence_type}`);
      console.log(`  - recurrence_interval: ${template.recurrence_interval}`);
      console.log(`  - next_generation_date: ${template.next_generation_date}`);
      console.log(`  - assigned_to: ${template.assigned_to || 'not assigned'}`);
      results.processed++;

      try {
        // Calculate visibility date and deadline
        const generationDate = new Date(template.next_generation_date);
        
        const visibilityDate = new Date(generationDate);
        visibilityDate.setDate(visibilityDate.getDate() - template.days_before_visible);
        
        const deadline = new Date(generationDate);
        deadline.setDate(deadline.getDate() + template.days_to_complete);

        console.log(`  - Calculated visibility_date: ${visibilityDate.toISOString().split('T')[0]}`);
        console.log(`  - Calculated deadline: ${deadline.toISOString().split('T')[0]}`);

        // Get the team_id from the employee assigned to this task
        let teamId: string | null = null;
        let responsibleName = 'Não atribuído';
        let responsibleAvatar: string | null = null;

        if (template.assigned_to) {
          const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .select('team_id, name, avatar')
            .eq('user_id', template.assigned_to)
            .eq('company_id', template.company_id)
            .maybeSingle();

          if (employeeError) {
            console.log(`  - Warning: Could not fetch employee data: ${employeeError.message}`);
          } else if (employeeData) {
            teamId = employeeData.team_id;
            responsibleName = employeeData.name || responsibleName;
            responsibleAvatar = employeeData.avatar;
            console.log(`  - Found employee: ${responsibleName}, team_id: ${teamId}`);
          }
        }

        // If no team_id from employee, get the first team of the company
        if (!teamId) {
          const { data: defaultTeam, error: teamError } = await supabase
            .from('teams')
            .select('id')
            .eq('company_id', template.company_id)
            .limit(1)
            .maybeSingle();

          if (teamError) {
            console.log(`  - Warning: Could not fetch default team: ${teamError.message}`);
          } else if (defaultTeam) {
            teamId = defaultTeam.id;
            console.log(`  - Using default team: ${teamId}`);
          }
        }

        if (!teamId) {
          console.error(`  ERROR: No team_id available for template`);
          results.errors.push(`Template ${template.id}: No team_id available`);
          results.details.push({
            templateId: template.id,
            title: template.title,
            status: 'error',
            error: 'No team_id available'
          });
          continue;
        }

        // Create the task
        const taskData = {
          company_id: template.company_id,
          related_client_id: template.client_id,
          title: template.title,
          description: template.description,
          priority: template.priority,
          status: 'todo',
          deadline: deadline.toISOString().split('T')[0],
          due_date: deadline.toISOString(),
          visibility_date: visibilityDate.toISOString().split('T')[0],
          user_id: template.assigned_to,
          recurring_template_id: template.id,
          team_id: teamId,
          responsible_name: responsibleName,
          responsible_avatar: responsibleAvatar || '',
        };

        console.log('  Creating task...');

        const { data: newTask, error: createError } = await supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();

        if (createError) {
          console.error(`  ERROR creating task:`, createError);
          results.errors.push(`Template ${template.id}: ${createError.message}`);
          results.details.push({
            templateId: template.id,
            title: template.title,
            status: 'error',
            error: createError.message
          });
          continue;
        }

        console.log(`  SUCCESS - Task created: ${newTask.id}`);

        // Calculate next generation date
        const nextGenDate = calculateNextGenerationDate(
          generationDate,
          template.recurrence_type,
          template.recurrence_interval,
          template.day_of_week,
          template.day_of_month,
          template.month_of_year
        );

        console.log(`  - Next generation date calculated: ${nextGenDate.toISOString().split('T')[0]}`);

        // Update template with next generation date
        const { error: updateError } = await supabase
          .from('recurring_task_templates')
          .update({
            next_generation_date: nextGenDate.toISOString().split('T')[0],
            last_generated_at: new Date().toISOString(),
          })
          .eq('id', template.id);

        if (updateError) {
          console.error(`  ERROR updating template:`, updateError);
          results.errors.push(`Template ${template.id} update: ${updateError.message}`);
        } else {
          console.log(`  Template updated successfully`);
          results.created++;
          results.details.push({
            templateId: template.id,
            title: template.title,
            status: 'created',
            taskId: newTask.id
          });
        }

      } catch (templateError) {
        console.error(`  EXCEPTION processing template:`, templateError);
        results.errors.push(`Template ${template.id}: ${String(templateError)}`);
        results.details.push({
          templateId: template.id,
          title: template.title,
          status: 'exception',
          error: String(templateError)
        });
      }
    }

    console.log('');
    console.log('============================================');
    console.log('=== GENERATION COMPLETE ===');
    console.log('============================================');
    console.log(`Processed: ${results.processed}`);
    console.log(`Created: ${results.created}`);
    console.log(`Errors: ${results.errors.length}`);
    if (results.errors.length > 0) {
      console.log('Error details:', results.errors);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('============================================');
    console.error('FATAL ERROR in generate-recurring-tasks:', error);
    console.error('============================================');
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
