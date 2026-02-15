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
  requires_client?: boolean;
}

const LOOKUP_CLIENT_TOOL = {
  type: 'function' as const,
  function: {
    name: '_lookup_client',
    description: 'Busca um cliente pelo nome na base de dados da empresa. Use quando precisar identificar qual cliente o usuário está se referindo. Retorna id, nome e empresa do cliente.',
    parameters: {
      type: 'object',
      properties: {
        search_query: {
          type: 'string',
          description: 'Nome ou parte do nome do cliente para buscar',
        },
      },
      required: ['search_query'],
    },
  },
};

function buildToolsFromSkills(skills: SkillRecord[], hasFixedClient: boolean) {
  const skillTools = skills.map((skill) => {
    const params = JSON.parse(JSON.stringify(skill.tool_parameters || { type: 'object', properties: {} }));
    // Inject client_id parameter for skills that require a client (when no fixed client)
    if (!hasFixedClient && skill.requires_client !== false) {
      if (!params.properties) params.properties = {};
      params.properties.client_id = {
        type: 'string',
        description: 'ID UUID do cliente. OBRIGATÓRIO. Use o client_id obtido via _lookup_client ou data_clients.',
      };
      if (!params.required) params.required = [];
      if (!params.required.includes('client_id')) params.required.push('client_id');
    }
    return {
      type: 'function' as const,
      function: {
        name: skill.id,
        description: skill.description,
        parameters: params,
      },
    };
  });

  if (!hasFixedClient && skills.some(s => s.requires_client !== false)) {
    skillTools.push(LOOKUP_CLIENT_TOOL);
  }

  return skillTools;
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
    console.log(`executeSkill ${skillId} with client_id=${agentContext.client_id}, company_id=${agentContext.company_id}`);
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

async function handleLookupClient(
  args: Record<string, unknown>,
  companyId: string
): Promise<Record<string, unknown>> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const query = (args.search_query as string || '').trim();
  if (!query) return { error: 'Nenhum termo de busca informado' };

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, company, sector, status')
    .eq('company_id', companyId)
    .or(`name.ilike.%${query}%,company.ilike.%${query}%`)
    .limit(5);

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { clients: [], message: 'Nenhum cliente encontrado. Peça ao usuário para informar o nome correto.' };

  return { clients: data };
}

async function handleBuiltinQuery(
  skillId: string,
  args: Record<string, unknown>,
  companyId: string,
  clientId?: string
): Promise<Record<string, unknown>> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const limit = Math.min(Number(args.limit) || 20, 50);

  try {
    switch (skillId) {
      case 'data_clients': {
        let q = supabase.from('clients').select('id, name, company, sector, status, monthly_budget, leads_generated, last_sync_at, ai_briefing').eq('company_id', companyId);
        if (args.search) q = q.or(`name.ilike.%${args.search}%,company.ilike.%${args.search}%`);
        if (args.status) q = q.eq('status', args.status);
        const { data, error } = await q.order('name').limit(limit);
        if (error) return { error: error.message };
        return { clients: data, total: data?.length };
      }
      case 'data_client_details': {
        const cid = clientId || args.client_id as string;
        if (!cid && args.client_name) {
          const { data } = await supabase.from('clients').select('id').eq('company_id', companyId).ilike('name', `%${args.client_name}%`).limit(1);
          if (data?.[0]) return handleBuiltinQuery(skillId, { ...args, client_id: data[0].id }, companyId, data[0].id);
          return { error: 'Cliente não encontrado' };
        }
        if (!cid) return { error: 'client_id necessário' };
        const [clientRes, campaignsRes] = await Promise.all([
          supabase.from('clients').select('*').eq('id', cid).single(),
          supabase.from('campaigns').select('id, name, status, spend, cpc, ctr, conversions, cpa').eq('client_id', cid).eq('status', 'active').order('spend', { ascending: false }).limit(10),
        ]);
        const clientData = clientRes.data;
        // Include reference image URLs explicitly so the agent can share them
        const referenceImages: string[] = [];
        if (clientData) {
          for (const key of ['ai_reference_image_1', 'ai_reference_image_2', 'ai_reference_image_3']) {
            const url = (clientData as any)[key];
            if (url && typeof url === 'string' && url.startsWith('http')) {
              referenceImages.push(url);
            }
          }
        }
        return { client: clientData, active_campaigns: campaignsRes.data, reference_images: referenceImages };
      }
      case 'data_campaigns': {
        if (!clientId) return { error: 'client_id necessário' };
        let q = supabase.from('campaigns').select('id, name, status, objective, spend, cpc, ctr, conversions, cpa, impressions, clicks, daily_budget').eq('client_id', clientId);
        if (args.status) q = q.eq('status', args.status);
        const { data, error } = await q.order('spend', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { campaigns: data, total: data?.length };
      }
      case 'data_ads': {
        if (!clientId) return { error: 'client_id necessário' };
        let q = supabase.from('ads').select('id, name, status, spend, cpc, ctr, impressions, clicks, conversions, cpa, creative_title, creative_body, image_url').eq('client_id', clientId);
        if (args.campaign_id) q = q.eq('campaign_id', args.campaign_id as string);
        const { data, error } = await q.order('spend', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { ads: data, total: data?.length };
      }
      case 'data_client_health': {
        if (!clientId) return { error: 'client_id necessário' };
        const { data, error } = await supabase.from('client_health_config').select('*').eq('client_id', clientId).single();
        if (error) return { error: error.message };
        return { health: data };
      }
      case 'data_client_milestones': {
        if (!clientId) return { error: 'client_id necessário' };
        const { data, error } = await supabase.from('client_milestones').select('*').eq('client_id', clientId).order('milestone_order');
        if (error) return { error: error.message };
        return { milestones: data };
      }
      case 'data_leads': {
        let q = supabase.from('lead_master_pool').select('id, full_name, email, phone, city, state, lead_score, conversion_status, created_at').eq('company_id', companyId);
        if (args.min_score) q = q.gte('lead_score', args.min_score);
        const { data, error } = await q.order('lead_score', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { leads: data, total: data?.length };
      }
      case 'data_lead_segments': {
        const { data, error } = await supabase.from('lead_segments').select('*').eq('company_id', companyId).order('name');
        if (error) return { error: error.message };
        return { segments: data };
      }
      case 'data_automation_rules': {
        let q = supabase.from('campaign_automation_rules').select('id, rule_name, rule_description, entity_type, action_type, is_active, execution_count, last_execution_at').eq('company_id', companyId);
        if (args.is_active !== undefined) q = q.eq('is_active', args.is_active);
        const { data, error } = await q.order('rule_order').limit(limit);
        if (error) return { error: error.message };
        return { rules: data, total: data?.length };
      }
      case 'data_automation_logs': {
        let q = supabase.from('campaign_automation_logs').select('id, rule_id, action_type, action_result, entity_type, old_status, new_status, executed_at, error_message').eq('company_id', companyId);
        const { data, error } = await q.order('executed_at', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { logs: data, total: data?.length };
      }
      case 'data_competitors': {
        if (!clientId) return { error: 'client_id necessário' };
        const { data, error } = await supabase.from('competitors').select('*').eq('client_id', clientId);
        if (error) return { error: error.message };
        return { competitors: data };
      }
      case 'data_scheduled_posts': {
        if (!clientId) return { error: 'client_id necessário' };
        let q = supabase.from('scheduled_posts').select('id, title, platform, status, scheduled_for, published_at, post_type, caption').eq('client_id', clientId);
        if (args.status) q = q.eq('status', args.status as string);
        const { data, error } = await q.order('scheduled_for', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { posts: data, total: data?.length };
      }
      case 'data_activity_feed': {
        const { data, error } = await supabase.from('activity_feed').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { activities: data };
      }
      case 'data_benchmarks': {
        if (!clientId) return { error: 'client_id necessário' };
        const { data, error } = await supabase.from('client_metric_benchmarks').select('*').eq('client_id', clientId);
        if (error) return { error: error.message };
        return { benchmarks: data };
      }
      default:
        return { error: `Query builtin "${skillId}" não reconhecida` };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }
}

async function chatWithToolCalling(
  messages: Array<{ role: string; content: string }>,
  tools: ReturnType<typeof buildToolsFromSkills>,
  skills: SkillRecord[],
  agentContext: { client_id?: string; company_id?: string; user_id?: string },
  model: string
): Promise<{ text: string; images: string[] }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const maxIterations = 5;
  let currentMessages = [...messages];
  const mutableContext = { ...agentContext };
  const collectedImages: string[] = [];

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
      return { text: choice.message.content || '', images: collectedImages };
    }

    currentMessages.push(choice.message);

    for (const toolCall of choice.message.tool_calls) {
      const fnName = toolCall.function.name;
      let fnArgs: Record<string, unknown> = {};
      try {
        fnArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch { /* empty */ }

      console.log(`Executing tool: ${fnName}`, fnArgs);

      let result: Record<string, unknown>;

      if (fnName === '_lookup_client') {
        result = await handleLookupClient(fnArgs, mutableContext.company_id || '');
        const clients = result.clients as Array<{ id: string }> | undefined;
        if (clients && clients.length === 1) {
          mutableContext.client_id = clients[0].id;
          console.log('Client auto-set from lookup:', mutableContext.client_id);
        }
      } else if (fnName.startsWith('data_')) {
        if (fnArgs.client_id) {
          mutableContext.client_id = fnArgs.client_id as string;
        }
        result = await handleBuiltinQuery(fnName, fnArgs, mutableContext.company_id || '', mutableContext.client_id);
      } else {
        // Always pick up client_id from args (model may pass it explicitly)
        if (fnArgs.client_id) {
          mutableContext.client_id = fnArgs.client_id as string;
        }
        result = await executeSkill(fnName, skills, fnArgs, mutableContext);
        // Collect generated images
        if (result.success && result.image_url && typeof result.image_url === 'string') {
          collectedImages.push(result.image_url as string);
        }
      }

      currentMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      } as any);
    }
  }

  // Write back resolved client_id to the original context
  if (mutableContext.client_id) {
    agentContext.client_id = mutableContext.client_id;
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
  return { text: finalData.choices[0].message.content || '', images: collectedImages };
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
      .select('id, messages, resolved_client_id')
      .eq('agent_id', agentId)
      .eq('telegram_chat_id', chatId)
      .single();

    let conversationMessages: Array<{ role: string; content: string }> = [];
    let resolvedClientId: string | null = null;
    if (existingConv) {
      conversationMessages = (existingConv.messages as Array<{ role: string; content: string }>) || [];
      resolvedClientId = (existingConv as any).resolved_client_id || null;
    }
    conversationMessages.push({ role: 'user', content: userText });
    if (conversationMessages.length > 20) {
      conversationMessages = conversationMessages.slice(-20);
    }

    // Build enabled skills
    const enabledSkills: SkillRecord[] = (enabledSkillsResult.data || [])
      .map((row: any) => row.ia_agent_skills)
      .filter(Boolean);

    const hasFixedClient = !!agent.client_id;
    const tools = buildToolsFromSkills(enabledSkills, hasFixedClient);

    const clientLookupInstruction = !hasFixedClient && enabledSkills.length > 0
      ? `\n- IMPORTANTE: Quando uma skill precisar de um cliente e nenhum cliente foi definido, use a ferramenta _lookup_client para buscar o cliente pelo nome. Se o usuário não informou qual cliente, PERGUNTE antes de executar a skill. Após encontrar o cliente, passe o client_id dele nas chamadas subsequentes.`
      : '';

    const skillList = enabledSkills.map(s => `  - ${s.id}: ${s.name} — ${s.description || ''}`).join('\n');
    const hasImageSkill = enabledSkills.some(s => s.id === 'generate_image_ai');
    const imageInstruction = hasImageSkill
      ? `\n- GERAÇÃO DE IMAGENS: Você TEM a capacidade de gerar imagens reais usando a ferramenta generate_image_ai. Quando o usuário pedir uma imagem, criativo visual, banner ou arte, USE esta ferramenta. NÃO diga que não pode gerar imagens.`
      : '';

    const skillInstructions = enabledSkills.length > 0
      ? `\n\n[SKILLS DISPONÍVEIS]\nVocê tem acesso a ${enabledSkills.length} ferramentas que DEVE usar quando o usuário solicitar. Liste de ferramentas:\n${skillList}\n${clientLookupInstruction}${imageInstruction}\n\n- REGRA CRÍTICA: Se uma ferramenta está listada acima, você PODE e DEVE usá-la. Nunca diga que não consegue fazer algo se existe uma ferramenta disponível para isso.`
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

    const agentContext = {
      client_id: agent.client_id || resolvedClientId || undefined,
      company_id: agent.company_id,
    };

    // Send "typing..." indicator and keep it alive during processing
    const sendTyping = () => fetch(`https://api.telegram.org/bot${agent.telegram_bot_token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    }).catch(() => {});

    await sendTyping();
    const typingInterval = setInterval(sendTyping, 4000);

    let aiResult: { text: string; images: string[] };
    try {
      aiResult = await chatWithToolCalling(
        aiMessages,
        tools,
        enabledSkills,
        agentContext,
        agent.model || 'google/gemini-2.5-flash'
      );
    } finally {
      clearInterval(typingInterval);
    }

    const assistantMessage = aiResult.text;
    const generatedImages = aiResult.images;

    // Persist resolved client_id if it was discovered during tool calling
    const finalClientId = agentContext.client_id || null;

    conversationMessages.push({ role: 'assistant', content: assistantMessage });

    await supabaseClient
      .from('ia_agent_telegram_conversations')
      .upsert({
        agent_id: agentId,
        telegram_chat_id: chatId,
        messages: conversationMessages,
        resolved_client_id: finalClientId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agent_id,telegram_chat_id' });

    // Send generated images first via sendPhoto
    for (const imgBase64 of generatedImages) {
      try {
        // Extract raw base64 data (remove data:image/...;base64, prefix if present)
        const base64Data = imgBase64.includes(',') ? imgBase64.split(',')[1] : imgBase64;
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const blob = new Blob([binaryData], { type: 'image/png' });

        const formData = new FormData();
        formData.append('chat_id', String(chatId));
        formData.append('photo', blob, 'generated_image.png');

        const photoResp = await fetch(`https://api.telegram.org/bot${agent.telegram_bot_token}/sendPhoto`, {
          method: 'POST',
          body: formData,
        });
        if (!photoResp.ok) {
          console.error('Telegram sendPhoto failed:', await photoResp.text());
        }
      } catch (imgErr) {
        console.error('Error sending image to Telegram:', imgErr);
      }
    }

    // Send text message
    const sendMessage = async (text: string, parseMode?: string) => {
      const body: Record<string, unknown> = { chat_id: chatId, text };
      if (parseMode) body.parse_mode = parseMode;
      
      const resp = await fetch(`https://api.telegram.org/bot${agent.telegram_bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return resp;
    };

    // Try with Markdown first
    const tgResponse = await sendMessage(assistantMessage, 'Markdown');
    if (!tgResponse.ok) {
      const errBody = await tgResponse.text();
      console.error('Telegram sendMessage failed with Markdown:', errBody);
      const retryResponse = await sendMessage(assistantMessage);
      if (!retryResponse.ok) {
        const maxLen = 4096;
        if (assistantMessage.length > maxLen) {
          for (let i = 0; i < assistantMessage.length; i += maxLen) {
            await sendMessage(assistantMessage.slice(i, i + maxLen));
          }
        } else {
          console.error('Telegram sendMessage failed even without Markdown:', await retryResponse.text());
        }
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Error in telegram-agent-webhook:', error);
    return new Response('Internal error', { status: 500 });
  }
});
