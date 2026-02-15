import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      content,
      caption,
      scheduled_for,
      client_id,
      company_id,
      user_id,
      platforms,
      content_type,
      media_urls,
      image_url,
    } = body;

    // Also accept client_name for lookup
    const { client_name } = body;

    console.log(`[schedule-post] Scheduling post for client_id=${client_id}, client_name=${client_name}, company_id=${company_id}`);

    if (!company_id) {
      throw new Error("company_id é obrigatório");
    }

    // Resolve client_id: lookup by name if needed
    let resolvedClientId: string | null = client_id || null;

    if (!resolvedClientId && client_name) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('company_id', company_id)
        .ilike('company_name', `%${client_name}%`)
        .limit(1);
      
      if (clients && clients.length > 0) {
        resolvedClientId = clients[0].id;
        console.log(`[schedule-post] Resolved client "${client_name}" to id=${resolvedClientId}`);
      }
    } else if (resolvedClientId) {
      // Validate the client_id exists
      const { data: clientCheck } = await supabase
        .from('clients')
        .select('id')
        .eq('id', resolvedClientId)
        .eq('company_id', company_id)
        .maybeSingle();
      
      if (!clientCheck) {
        console.warn(`[schedule-post] client_id=${resolvedClientId} not found, trying as name...`);
        // Maybe the agent sent the name instead of UUID
        const { data: clients } = await supabase
          .from('clients')
          .select('id')
          .eq('company_id', company_id)
          .ilike('company_name', `%${resolvedClientId}%`)
          .limit(1);
        
        if (clients && clients.length > 0) {
          resolvedClientId = clients[0].id;
          console.log(`[schedule-post] Resolved client name to id=${resolvedClientId}`);
        } else {
          resolvedClientId = null;
          console.warn(`[schedule-post] Could not resolve client, proceeding without client_id`);
        }
      }
    }

    if (!scheduled_for) {
      throw new Error("scheduled_for (data/hora) é obrigatório");
    }

    // Parse the scheduled date
    let scheduledAt: Date;
    try {
      // Handle various date formats the AI might send
      const dateStr = scheduled_for as string;
      
      // If it's already ISO, use directly
      if (dateStr.includes('T') || dateStr.includes('Z')) {
        scheduledAt = new Date(dateStr);
      } else {
        // Try to parse "15/02/2026 13:10" or "2026-02-15 13:10" format
        // Assume São Paulo timezone (UTC-3)
        const cleaned = dateStr.replace(/\//g, '-');
        // Check if format is DD-MM-YYYY
        const parts = cleaned.split(/[-\s]/);
        if (parts[0]?.length === 2 && parts[2]?.length === 4) {
          // DD-MM-YYYY HH:mm format
          const isoStr = `${parts[2]}-${parts[1]}-${parts[0]}T${parts[3] || '00:00'}:00-03:00`;
          scheduledAt = new Date(isoStr);
        } else {
          // YYYY-MM-DD HH:mm format
          const isoStr = `${parts[0]}-${parts[1]}-${parts[2]}T${parts[3] || '00:00'}:00-03:00`;
          scheduledAt = new Date(isoStr);
        }
      }

      if (isNaN(scheduledAt.getTime())) {
        throw new Error(`Data inválida: ${scheduled_for}`);
      }
    } catch (e) {
      throw new Error(`Erro ao interpretar data "${scheduled_for}": ${e.message}`);
    }

    console.log(`[schedule-post] Parsed date: ${scheduledAt.toISOString()}`);

    // Determine the user_id to use (from params or fallback)
    const createdBy = user_id || '00000000-0000-0000-0000-000000000000';

    // Determine platforms array
    let platformsArray: string[] = [];
    if (platforms) {
      if (Array.isArray(platforms)) {
        platformsArray = platforms;
      } else if (typeof platforms === 'string') {
        platformsArray = platforms.split(',').map((p: string) => p.trim().toLowerCase());
      }
    }
    if (platformsArray.length === 0) {
      platformsArray = ['instagram', 'facebook'];
    }

    // Get facebook page and instagram account for this client/company
    let facebookPageId: string | null = null;
    let instagramAccountId: string | null = null;

    const { data: pages } = await supabase
      .from('facebook_pages')
      .select('id, instagram_business_account_id')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .limit(1);

    if (pages && pages.length > 0) {
      facebookPageId = pages[0].id;
      if (pages[0].instagram_business_account_id) {
        instagramAccountId = pages[0].id; // Same record
      }
    }

    // Build the caption
    const postCaption = caption || content || '';

    // Build media URLs array
    let mediaUrlsArray: string[] = [];
    if (media_urls) {
      mediaUrlsArray = Array.isArray(media_urls) ? media_urls : [media_urls];
    } else if (image_url) {
      mediaUrlsArray = [image_url];
    }

    // Insert the scheduled post
    const { data: newPost, error: insertError } = await supabase
      .from('scheduled_posts')
      .insert({
        company_id,
        client_id: resolvedClientId,
        created_by: createdBy,
        content_type: content_type || 'image',
        caption: postCaption,
        media_urls: mediaUrlsArray,
        platforms: platformsArray,
        facebook_page_id: facebookPageId,
        instagram_account_id: instagramAccountId,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled',
        metadata: {
          created_via: 'ai_agent',
          original_request: {
            content: content?.substring(0, 200),
            scheduled_for,
          },
        },
      })
      .select('id, scheduled_at, status, platforms, caption')
      .single();

    if (insertError) {
      console.error('[schedule-post] Insert error:', insertError);
      throw new Error(`Erro ao criar agendamento: ${insertError.message}`);
    }

    console.log(`[schedule-post] Post scheduled successfully: ${newPost.id}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Postagem agendada com sucesso para ${scheduledAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
      post: {
        id: newPost.id,
        scheduled_at: newPost.scheduled_at,
        status: newPost.status,
        platforms: newPost.platforms,
        caption_preview: (newPost.caption || '').substring(0, 100),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[schedule-post] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
