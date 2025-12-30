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
  next_generation_date: string;
  is_active: boolean;
}

function calculateNextGenerationDate(
  currentDate: Date,
  recurrenceType: string,
  recurrenceInterval: number
): Date {
  const nextDate = new Date(currentDate);
  
  switch (recurrenceType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + recurrenceInterval);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * recurrenceInterval));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + recurrenceInterval);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + recurrenceInterval);
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

  console.log('=== Starting recurring tasks generation ===');
  console.log('Timestamp:', new Date().toISOString());

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log('Looking for templates with next_generation_date <=', todayStr);

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

    console.log(`Found ${templates?.length || 0} templates to process`);

    const results = {
      processed: 0,
      created: 0,
      errors: [] as string[],
    };

    if (!templates || templates.length === 0) {
      console.log('No templates to process');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No templates to process',
        results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const template of templates as RecurringTaskTemplate[]) {
      console.log(`Processing template: ${template.id} - "${template.title}"`);
      results.processed++;

      try {
        // Calculate visibility date and deadline
        const generationDate = new Date(template.next_generation_date);
        
        const visibilityDate = new Date(generationDate);
        visibilityDate.setDate(visibilityDate.getDate() - template.days_before_visible);
        
        const deadline = new Date(generationDate);
        deadline.setDate(deadline.getDate() + template.days_to_complete);

        // Create the task
        const taskData = {
          company_id: template.company_id,
          related_client_id: template.client_id,
          title: template.title,
          description: template.description,
          priority: template.priority,
          status: 'pending',
          deadline: deadline.toISOString().split('T')[0],
          due_date: deadline.toISOString(),
          visibility_date: visibilityDate.toISOString().split('T')[0],
          user_id: template.assigned_to,
          recurring_template_id: template.id,
        };

        console.log('Creating task with data:', JSON.stringify(taskData));

        const { data: newTask, error: createError } = await supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();

        if (createError) {
          console.error(`Error creating task for template ${template.id}:`, createError);
          results.errors.push(`Template ${template.id}: ${createError.message}`);
          continue;
        }

        console.log(`Task created successfully: ${newTask.id}`);

        // Calculate next generation date
        const nextGenDate = calculateNextGenerationDate(
          generationDate,
          template.recurrence_type,
          template.recurrence_interval
        );

        // Update template with next generation date
        const { error: updateError } = await supabase
          .from('recurring_task_templates')
          .update({
            next_generation_date: nextGenDate.toISOString().split('T')[0],
            last_generated_at: new Date().toISOString(),
          })
          .eq('id', template.id);

        if (updateError) {
          console.error(`Error updating template ${template.id}:`, updateError);
          results.errors.push(`Template ${template.id} update: ${updateError.message}`);
        } else {
          console.log(`Template updated. Next generation: ${nextGenDate.toISOString().split('T')[0]}`);
          results.created++;
        }

      } catch (templateError) {
        console.error(`Error processing template ${template.id}:`, templateError);
        results.errors.push(`Template ${template.id}: ${String(templateError)}`);
      }
    }

    console.log('=== Generation complete ===');
    console.log('Results:', JSON.stringify(results));

    return new Response(JSON.stringify({ 
      success: true, 
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Fatal error in generate-recurring-tasks:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
