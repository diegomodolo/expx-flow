import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Agent ID is passed as query param: ?agent_id=xxx
    const agentId = url.searchParams.get('agent_id');

    if (!agentId) {
      return new Response('Missing agent_id', { status: 400 });
    }

    const update = await req.json();

    // Only handle text messages
    const message = update?.message;
    if (!message?.text || message.text.startsWith('/start')) {
      // For /start command, send a welcome message
      if (message?.text?.startsWith('/start')) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: agent } = await supabaseClient
          .from('ia_agents')
          .select('agent_name, telegram_bot_token')
          .eq('id', agentId)
          .single();

        if (agent?.telegram_bot_token) {
          await fetch(`https://api.telegram.org/bot${agent.telegram_bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: message.chat.id,
              text: `👋 Olá! Eu sou o ${agent.agent_name}. Como posso te ajudar?`,
            }),
          });
        }
      }
      return new Response('OK', { status: 200 });
    }

    const chatId = message.chat.id;
    const userText = message.text;

    // Use service role key since webhook has no auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch agent
    const { data: agent, error: agentError } = await supabaseClient
      .from('ia_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found:', agentId);
      return new Response('Agent not found', { status: 404 });
    }

    // Fetch knowledge documents
    const { data: knowledgeDocs } = await supabaseClient
      .from('ia_agent_knowledge_documents')
      .select('content_text, file_name')
      .eq('agent_id', agentId);

    const knowledgeContext = knowledgeDocs
      ?.filter(doc => doc.content_text)
      .map(doc => `[Documento: ${doc.file_name}]\n${doc.content_text}`)
      .join('\n\n---\n\n');

    // Fetch client context if agent has a client_id
    let clientContext = '';
    if (agent.client_id) {
      const { data: client } = await supabaseClient
        .from('clients')
        .select('name, company, sector, website_url, target_audience, product_name, voice_tone, objectives, ai_briefing')
        .eq('id', agent.client_id)
        .single();

      if (client) {
        clientContext = `
[INFORMAÇÕES DO CLIENTE ASSOCIADO]
Nome: ${client.name}
Empresa: ${client.company || 'Não informado'}
Setor: ${client.sector || 'Não informado'}
${client.ai_briefing ? `\n[BRIEFING DETALHADO]\n${client.ai_briefing}\n` : ''}`;
      }
    }

    // Get or create conversation history
    const { data: existingConv } = await supabaseClient
      .from('ia_agent_telegram_conversations')
      .select('id, messages')
      .eq('agent_id', agentId)
      .eq('telegram_chat_id', chatId)
      .single();

    let conversationMessages: Array<{ role: string; content: string }> = [];

    if (existingConv) {
      conversationMessages = (existingConv.messages as Array<{ role: string; content: string }>) || [];
    }

    // Add user message to history
    conversationMessages.push({ role: 'user', content: userText });

    // Keep only last 20 messages to avoid exceeding context
    if (conversationMessages.length > 20) {
      conversationMessages = conversationMessages.slice(-20);
    }

    // Build system prompt
    const systemPrompt = `${agent.prompt_base}

${agent.additional_instructions || ''}

${knowledgeContext ? `\n[BIBLIOTECA DE CONHECIMENTO]\n${knowledgeContext}\n` : ''}

${clientContext}

INSTRUÇÕES IMPORTANTES:
- Use as informações da biblioteca de conhecimento quando relevante
- Seja preciso e baseie suas respostas nos dados fornecidos
- Você está respondendo via Telegram, mantenha mensagens concisas e bem formatadas
`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages,
    ];

    // Call AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agent.model || 'google/gemini-2.5-flash',
        messages: aiMessages,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    // Add assistant message to history
    conversationMessages.push({ role: 'assistant', content: assistantMessage });

    // Upsert conversation
    await supabaseClient
      .from('ia_agent_telegram_conversations')
      .upsert({
        agent_id: agentId,
        telegram_chat_id: chatId,
        messages: conversationMessages,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agent_id,telegram_chat_id' });

    // Send response to Telegram
    await fetch(`https://api.telegram.org/bot${agent.telegram_bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: assistantMessage,
        parse_mode: 'Markdown',
      }),
    });

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Error in telegram-agent-webhook:', error);
    return new Response('Internal error', { status: 500 });
  }
});
