import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, botToken, action } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user has access to this agent
    const { data: agent, error: agentError } = await supabaseClient
      .from('ia_agents')
      .select('id, agent_name')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error('Agente não encontrado ou sem permissão');
    }

    if (action === 'disconnect') {
      // Remove webhook from Telegram
      const currentAgent = await supabaseClient
        .from('ia_agents')
        .select('telegram_bot_token')
        .eq('id', agentId)
        .single();

      if (currentAgent.data?.telegram_bot_token) {
        await fetch(`https://api.telegram.org/bot${currentAgent.data.telegram_bot_token}/deleteWebhook`);
      }

      // Clear token from database
      const { error: updateError } = await supabaseClient
        .from('ia_agents')
        .update({ telegram_bot_token: null, telegram_bot_name: null })
        .eq('id', agentId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Bot desconectado com sucesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: connect
    if (!botToken) {
      throw new Error('Token do bot não informado');
    }

    // Validate token by calling getMe
    const getMeResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const getMeData = await getMeResponse.json();

    if (!getMeData.ok) {
      throw new Error('Token inválido. Verifique o token gerado pelo @BotFather.');
    }

    const botName = getMeData.result.username;
    const botFirstName = getMeData.result.first_name;

    // Set webhook URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-agent-webhook?agent_id=${agentId}`;

    const setWebhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
      }),
    });

    const webhookResult = await setWebhookResponse.json();

    if (!webhookResult.ok) {
      throw new Error(`Erro ao configurar webhook: ${webhookResult.description}`);
    }

    // Save token and bot name to agent
    const { error: updateError } = await supabaseClient
      .from('ia_agents')
      .update({
        telegram_bot_token: botToken,
        telegram_bot_name: botName,
      })
      .eq('id', agentId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        botName,
        botFirstName,
        message: `Bot @${botName} conectado com sucesso!`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in configure-telegram-webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
