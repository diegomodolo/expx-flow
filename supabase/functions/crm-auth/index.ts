import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { workspaceToken, email, password, action = 'login' } = await req.json();

    console.log('[crm-auth] Action:', action, 'Email:', email);

    // Buscar workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('crm_workspaces')
      .select('*')
      .eq('access_token', workspaceToken)
      .eq('is_active', true)
      .single();

    if (workspaceError || !workspace) {
      console.error('[crm-auth] Workspace not found:', workspaceError);
      return new Response(JSON.stringify({ error: 'Workspace not found or inactive' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'login') {
      // Buscar usuário
      const { data: user, error: userError } = await supabase
        .from('crm_users')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (userError || !user) {
        console.error('[crm-auth] User not found:', userError);
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verificar senha
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Gerar sessão simples (UUID)
      const sessionToken = crypto.randomUUID();

      console.log('[crm-auth] Login successful for user:', user.id);

      return new Response(JSON.stringify({
        success: true,
        session: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          workspace_id: user.workspace_id,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'register') {
      const { fullName } = await req.json();

      // Hash da senha
      const passwordHash = await bcrypt.hash(password);

      // Criar usuário
      const { data: newUser, error: createError } = await supabase
        .from('crm_users')
        .insert({
          workspace_id: workspace.id,
          email,
          password_hash: passwordHash,
          full_name: fullName,
        })
        .select()
        .single();

      if (createError) {
        console.error('[crm-auth] Error creating user:', createError);
        return new Response(JSON.stringify({ error: 'Failed to create user' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sessionToken = crypto.randomUUID();

      console.log('[crm-auth] User registered:', newUser.id);

      return new Response(JSON.stringify({
        success: true,
        session: sessionToken,
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          workspace_id: newUser.workspace_id,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[crm-auth] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
