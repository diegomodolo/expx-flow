import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SkillRecord {
  id: string;
  name: string;
  description: string;
  edge_function: string;
  tool_parameters: Record<string, unknown>;
}

function buildToolsFromSkills(skills: SkillRecord[]) {
  return skills.map((skill) => ({
    type: 'function' as const,
    function: {
      name: skill.id,
      description: skill.description,
      parameters: skill.tool_parameters || { type: 'object', properties: {} },
    },
  }));
}

async function executeSkill(
  skillId: string,
  skills: SkillRecord[],
  args: Record<string, unknown>,
  agentContext: { client_id?: string; company_id?: string; user_id?: string }
) {
  const skill = skills.find((s) => s.id === skillId);
  if (!skill) return { error: `Skill "${skillId}" não encontrada` };

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${skill.edge_function}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...args,
        client_id: agentContext.client_id,
        company_id: agentContext.company_id,
        user_id: agentContext.user_id,
      }),
    });

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { result: text };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error executing skill ${skillId}:`, message);
    return { error: `Erro ao executar skill: ${message}` };
  }
}

async function chatWithToolCalling(
  messages: Array<{ role: string; content: string }>,
  tools: ReturnType<typeof buildToolsFromSkills>,
  skills: SkillRecord[],
  agentContext: { client_id?: string; company_id?: string; user_id?: string },
  model: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const maxIterations = 5;
  let currentMessages = [...messages];

  for (let i = 0; i < maxIterations; i++) {
    const requestBody: Record<string, unknown> = {
      model,
      messages: currentMessages,
    };

    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices[0];

    if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      return choice.message.content || '';
    }

    currentMessages.push(choice.message);

    for (const toolCall of choice.message.tool_calls) {
      const fnName = toolCall.function.name;
      let fnArgs = {};
      try {
        fnArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch { /* empty */ }

      console.log(`Executing skill: ${fnName}`, fnArgs);
      const result = await executeSkill(fnName, skills, fnArgs, agentContext);

      currentMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      } as any);
    }
  }

  const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages: currentMessages }),
  });

  const finalData = await finalResponse.json();
  return finalData.choices[0].message.content || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agent_id');

    if (!agentId) {
      return new Response('Missing agent_id', { status: 400 });
    }

    const update = await req.json();
    const message = update?.message;

    // Handle /start command
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
      return new Response('OK', { status: 200 });
    }

    const chatId = message.chat.id;
    let userText = message?.text || '';

    // Handle voice/audio messages - transcribe them
    const voiceOrAudio = message?.voice || message?.audio;
    if (voiceOrAudio && !userText) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get agent's bot token
        const { data: agentForToken } = await supabaseClient
          .from('ia_agents')
          .select('telegram_bot_token')
          .eq('id', agentId)
          .single();

        if (!agentForToken?.telegram_bot_token) {
          return new Response('Bot token not found', { status: 400 });
        }

        const botToken = agentForToken.telegram_bot_token;

        // Get file path from Telegram
        const fileResp = await fetch(
          `https://api.telegram.org/bot${botToken}/getFile?file_id=${voiceOrAudio.file_id}`
        );
        const fileData = await fileResp.json();
        const filePath = fileData?.result?.file_path;

        if (!filePath) {
          throw new Error('Could not get file path from Telegram');
        }

        // Download the audio file
        const audioResp = await fetch(
          `https://api.telegram.org/file/bot${botToken}/${filePath}`
        );
        const audioBlob = await audioResp.blob();

        // Transcribe via Lovable AI Gateway (Whisper)
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.ogg');
        formData.append('model', 'whisper-1');

        const transcribeResp = await fetch(
          'https://ai.gateway.lovable.dev/v1/audio/transcriptions',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
            },
            body: formData,
          }
        );

        if (transcribeResp.ok) {
          const transcription = await transcribeResp.json();
          userText = transcription.text || '';
          console.log('Audio transcribed:', userText.substring(0, 100));
        } else {
          console.error('Transcription failed:', transcribeResp.status, await transcribeResp.text());
          userText = '[O usuário enviou um áudio que não pôde ser transcrito]';
        }
      } catch (err) {
        console.error('Error processing audio:', err);
        userText = '[O usuário enviou um áudio que não pôde ser processado]';
      }
    }

    // Skip if no content at all
    if (!userText && !voiceOrAudio) {
      return new Response('OK', { status: 200 });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch agent and enabled skills in parallel
    const [agentResult, enabledSkillsResult] = await Promise.all([
      supabaseClient.from('ia_agents').select('*').eq('id', agentId).single(),
      supabaseClient
        .from('ia_agent_enabled_skills')
        .select('skill_id, ia_agent_skills(*)')
        .eq('agent_id', agentId),
    ]);

    const agent = agentResult.data;
    if (agentResult.error || !agent) {
      console.error('Agent not found:', agentId);
      return new Response('Agent not found', { status: 404 });
    }

    // Fetch knowledge docs
    const { data: knowledgeDocs } = await supabaseClient
      .from('ia_agent_knowledge_documents')
      .select('content_text, file_name')
      .eq('agent_id', agentId);

    const knowledgeContext = knowledgeDocs
      ?.filter(doc => doc.content_text)
      .map(doc => `[Documento: ${doc.file_name}]\n${doc.content_text}`)
      .join('\n\n---\n\n');

    // Client context
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

    // Conversation history
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
    conversationMessages.push({ role: 'user', content: userText });
    if (conversationMessages.length > 20) {
      conversationMessages = conversationMessages.slice(-20);
    }

    // Build enabled skills
    const enabledSkills: SkillRecord[] = (enabledSkillsResult.data || [])
      .map((row: any) => row.ia_agent_skills)
      .filter(Boolean);

    const tools = buildToolsFromSkills(enabledSkills);

    const skillInstructions = enabledSkills.length > 0
      ? `\n\n[SKILLS DISPONÍVEIS]\nVocê tem acesso a ${enabledSkills.length} skills. Use-as chamando as funções disponíveis quando pertinente.\n`
      : '';

    const systemPrompt = `${agent.prompt_base}

${agent.additional_instructions || ''}

${knowledgeContext ? `\n[BIBLIOTECA DE CONHECIMENTO]\n${knowledgeContext}\n` : ''}

${clientContext}
${skillInstructions}
INSTRUÇÕES IMPORTANTES:
- Use as informações da biblioteca de conhecimento quando relevante
- Seja preciso e baseie suas respostas nos dados fornecidos
- Você está respondendo via Telegram, mantenha mensagens concisas e bem formatadas
`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages,
    ];

    const assistantMessage = await chatWithToolCalling(
      aiMessages,
      tools,
      enabledSkills,
      {
        client_id: agent.client_id,
        company_id: agent.company_id,
      },
      agent.model || 'google/gemini-2.5-flash'
    );

    conversationMessages.push({ role: 'assistant', content: assistantMessage });

    await supabaseClient
      .from('ia_agent_telegram_conversations')
      .upsert({
        agent_id: agentId,
        telegram_chat_id: chatId,
        messages: conversationMessages,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agent_id,telegram_chat_id' });

    // Send to Telegram
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
