import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, texts, targetLanguage = 'pt-BR' } = await req.json();

    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Handle batch translation
    if (texts && Array.isArray(texts)) {
      console.log(`Translating batch of ${texts.length} texts`);
      
      const translations: Record<string, string> = {};
      
      // Process in chunks of 10
      const chunks = [];
      for (let i = 0; i < texts.length; i += 10) {
        chunks.push(texts.slice(i, i + 10));
      }

      for (const chunk of chunks) {
        const prompt = `Translate the following titles from English to Brazilian Portuguese. 
Keep them natural and engaging for YouTube content.
Return ONLY a JSON object where keys are the original texts and values are the translations.
Do not add any explanation or markdown.

Titles to translate:
${chunk.map((t: string, i: number) => `${i + 1}. "${t}"`).join('\n')}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { 
                role: 'system', 
                content: 'You are a professional translator specializing in YouTube content. Translate titles naturally and engagingly.' 
              },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('OpenAI error:', error);
          continue;
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        
        try {
          // Parse JSON from response
          const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
          const chunkTranslations = JSON.parse(cleanContent);
          Object.assign(translations, chunkTranslations);
        } catch (parseError) {
          console.error('Parse error:', parseError, 'Content:', content);
        }
      }

      return new Response(
        JSON.stringify({ success: true, translations }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle single text translation
    if (text) {
      console.log(`Translating single text: ${text.substring(0, 50)}...`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'You are a professional translator. Translate the given text naturally to Brazilian Portuguese. Return only the translation, nothing else.' 
            },
            { role: 'user', content: `Translate this YouTube title to Brazilian Portuguese: "${text}"` }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI error: ${error}`);
      }

      const data = await response.json();
      const translatedText = data.choices[0]?.message?.content?.trim() || '';

      return new Response(
        JSON.stringify({ success: true, translatedText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('No text provided for translation');

  } catch (error: any) {
    console.error('Error in translate-text:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
