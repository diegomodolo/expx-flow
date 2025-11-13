// Deno.serve is available natively in modern Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Função para hash de senha usando Web Crypto API (compatível com Deno Edge Runtime)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(derivedBits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  
  return btoa(String.fromCharCode(...combined));
}

// Função para verificar senha
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const storedHashArray = combined.slice(16);
    
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      data,
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );
    
    const hashArray = new Uint8Array(derivedBits);
    
    if (hashArray.length !== storedHashArray.length) return false;
    
    for (let i = 0; i < hashArray.length; i++) {
      if (hashArray[i] !== storedHashArray[i]) return false;
    }
    
    return true;
  } catch (error) {
    console.error('[crm-auth] Error verifying password:', error);
    return false;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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
      const passwordMatch = await verifyPassword(password, user.password_hash);

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
      const passwordHash = await hashPassword(password);

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
