import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { siteUrl, username, appPassword } = await req.json();

    console.log('Testing WordPress connection for:', siteUrl);

    if (!siteUrl || !username || !appPassword) {
      throw new Error('Site URL, username and app password are required');
    }

    // Normalize URL
    const normalizedUrl = siteUrl.replace(/\/$/, '');
    const apiUrl = `${normalizedUrl}/wp-json/wp/v2/users/me`;

    // Create Basic Auth header
    const credentials = btoa(`${username}:${appPassword}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress API error:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('Credenciais inválidas. Verifique o usuário e a Application Password.');
      } else if (response.status === 404) {
        throw new Error('API REST do WordPress não encontrada. Verifique se a URL está correta.');
      } else {
        throw new Error(`Erro na API do WordPress: ${response.status}`);
      }
    }

    const userData = await response.json();
    console.log('WordPress connection successful. User:', userData.name);

    // Try to fetch categories as well
    const categoriesUrl = `${normalizedUrl}/wp-json/wp/v2/categories`;
    const categoriesResponse = await fetch(categoriesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    let categories: any[] = [];
    if (categoriesResponse.ok) {
      categories = await categoriesResponse.json();
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userData.id,
          name: userData.name,
          slug: userData.slug,
        },
        categories: categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        })),
        message: 'Conexão estabelecida com sucesso!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error testing WordPress connection:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to connect to WordPress'
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
