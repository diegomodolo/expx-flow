import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract text from image using GPT-4 Vision
async function extractTextFromImage(imageUrl: string): Promise<string> {
  console.log('Extracting text from image:', imageUrl);
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extraia TODO o texto visível em português nesta imagem. 
                     Se não houver texto em português, responda "SEM_TEXTO".
                     Responda APENAS com o texto encontrado, sem explicações.
                     Mantenha a formatação original (quebras de linha, etc).`
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error extracting text:', errorText);
    throw new Error(`Failed to extract text: ${response.status}`);
  }

  const data = await response.json();
  const extractedText = data.choices?.[0]?.message?.content?.trim() || 'SEM_TEXTO';
  console.log('Extracted text:', extractedText.substring(0, 100) + '...');
  
  return extractedText;
}

// Validate text grammar using existing validate-text-grammar function
async function validateGrammar(text: string): Promise<{ hasErrors: boolean; correctedText: string; errors: string[] }> {
  console.log('Validating grammar for text:', text.substring(0, 100) + '...');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Você é um revisor especializado em português brasileiro.
                    Analise o texto e identifique APENAS erros claros de ortografia e gramática.
                    
                    IGNORAR:
                    - Estilo coloquial propositado
                    - Abreviações intencionais
                    - Gírias e expressões informais
                    - Uso criativo de linguagem em marketing
                    - Hashtags
                    - Emojis
                    
                    REPORTAR:
                    - Erros de ortografia evidentes
                    - Concordância verbal/nominal incorreta
                    - Acentuação errada
                    - Palavras escritas incorretamente
                    
                    Responda em JSON:
                    {
                      "hasErrors": boolean,
                      "correctedText": "texto corrigido ou original se não houver erros",
                      "errors": ["lista de erros encontrados com explicação breve"]
                    }`
        },
        {
          role: 'user',
          content: `Verifique este texto:\n\n${text}`
        }
      ]
    }),
  });

  if (!response.ok) {
    console.error('Grammar validation failed:', await response.text());
    return { hasErrors: false, correctedText: text, errors: [] };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        hasErrors: parsed.hasErrors === true,
        correctedText: parsed.correctedText || text,
        errors: parsed.errors || []
      };
    }
  } catch (e) {
    console.error('Failed to parse grammar validation response:', e);
  }
  
  return { hasErrors: false, correctedText: text, errors: [] };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageUrls, postId } = await req.json();
    
    const urlsToValidate = imageUrls || (imageUrl ? [imageUrl] : []);
    
    if (urlsToValidate.length === 0) {
      throw new Error('No image URL(s) provided');
    }

    console.log(`Validating ${urlsToValidate.length} image(s)...`);
    
    const allErrors: string[] = [];
    let hasTextInAnyImage = false;
    
    for (let i = 0; i < urlsToValidate.length; i++) {
      const url = urlsToValidate[i];
      console.log(`Processing image ${i + 1}/${urlsToValidate.length}...`);
      
      try {
        const extractedText = await extractTextFromImage(url);
        
        if (extractedText && extractedText !== 'SEM_TEXTO' && extractedText.length > 3) {
          hasTextInAnyImage = true;
          const validation = await validateGrammar(extractedText);
          
          if (validation.hasErrors) {
            for (const error of validation.errors) {
              allErrors.push(`Imagem ${i + 1}: ${error}`);
            }
          }
        }
      } catch (imgError) {
        console.error(`Error processing image ${i + 1}:`, imgError);
        // Continue with other images
      }
    }

    const result = {
      success: true,
      hasText: hasTextInAnyImage,
      hasErrors: allErrors.length > 0,
      errors: allErrors,
      validatedAt: new Date().toISOString()
    };

    // If postId provided, update the post record
    if (postId) {
      const { error: updateError } = await supabase
        .from('instagram_auto_posts')
        .update({
          grammar_validated: true,
          grammar_errors: allErrors.length > 0 ? allErrors : null
        })
        .eq('id', postId);
      
      if (updateError) {
        console.error('Error updating post:', updateError);
      }
    }

    console.log('Validation result:', result);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in validate-image-text:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
