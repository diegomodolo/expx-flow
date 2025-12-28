import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch YouTube transcript using unofficial API
async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    // Try to get transcript from YouTube's timedtext API
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // First, get the video page to extract caption track info
    const pageResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!pageResponse.ok) {
      console.log('Failed to fetch video page');
      return null;
    }
    
    const html = await pageResponse.text();
    
    // Extract captions data from page
    const captionMatch = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
    if (!captionMatch) {
      console.log('No captions found for video');
      return null;
    }
    
    let captionTracks;
    try {
      captionTracks = JSON.parse(captionMatch[1]);
    } catch (e) {
      console.log('Failed to parse caption tracks');
      return null;
    }
    
    if (!captionTracks || captionTracks.length === 0) {
      console.log('No caption tracks available');
      return null;
    }
    
    // Prefer Portuguese, then English, then any available
    let selectedTrack = captionTracks.find((t: any) => t.languageCode?.startsWith('pt'));
    if (!selectedTrack) {
      selectedTrack = captionTracks.find((t: any) => t.languageCode?.startsWith('en'));
    }
    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }
    
    const captionUrl = selectedTrack.baseUrl;
    if (!captionUrl) {
      console.log('No caption URL found');
      return null;
    }
    
    // Fetch the actual transcript
    const transcriptResponse = await fetch(captionUrl);
    if (!transcriptResponse.ok) {
      console.log('Failed to fetch transcript');
      return null;
    }
    
    const transcriptXml = await transcriptResponse.text();
    
    // Parse transcript XML and extract text
    const textRegex = /<text[^>]*>([^<]*)<\/text>/g;
    let transcriptText = '';
    let match;
    
    while ((match = textRegex.exec(transcriptXml)) !== null) {
      let text = match[1];
      // Decode HTML entities
      text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, ' ');
      transcriptText += text + ' ';
    }
    
    return transcriptText.trim() || null;
    
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return null;
  }
}

// Generate a summary of the transcript using AI
async function summarizeTranscript(transcript: string, videoTitle: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em resumir conteúdo de vídeos para uso como base de conhecimento.

Crie um resumo estruturado do vídeo contendo:
1. TEMA PRINCIPAL: Uma frase sobre o tema central
2. PONTOS-CHAVE: Lista dos principais pontos abordados
3. INSIGHTS: Informações ou dicas importantes mencionadas
4. CITAÇÕES: Frases marcantes ou quotes do vídeo

O resumo será usado como contexto para gerar posts de Instagram, então extraia informações que possam inspirar conteúdo visual e textual.`
          },
          {
            role: 'user',
            content: `Título do vídeo: ${videoTitle}

Transcrição:
${transcript.substring(0, 15000)}`
          }
        ],
        max_completion_tokens: 1000
      }),
    });

    if (!response.ok) {
      console.error('Failed to summarize transcript');
      return transcript.substring(0, 5000);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error summarizing transcript:', error);
    return transcript.substring(0, 5000);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, knowledgeVideoId, videoTitle } = await req.json();

    console.log('Transcribing YouTube video:', videoId);

    if (!videoId) {
      throw new Error('Video ID is required');
    }

    // Fetch transcript
    let transcript = await fetchTranscript(videoId);
    
    if (!transcript) {
      console.log('No transcript available, returning empty');
      
      // Update record with empty transcription
      if (knowledgeVideoId) {
        await supabase
          .from('instagram_autopost_knowledge_videos')
          .update({ transcription: '[Transcrição não disponível para este vídeo]' })
          .eq('id', knowledgeVideoId);
      }
      
      return new Response(JSON.stringify({
        success: true,
        transcription: null,
        message: 'No transcript available for this video'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Transcript fetched: ${transcript.length} characters`);

    // Summarize if transcript is very long
    let finalTranscription = transcript;
    if (transcript.length > 5000 && videoTitle) {
      console.log('Summarizing long transcript...');
      finalTranscription = await summarizeTranscript(transcript, videoTitle);
      console.log(`Summary created: ${finalTranscription.length} characters`);
    }

    // Update knowledge video record if ID provided
    if (knowledgeVideoId) {
      const { error: updateError } = await supabase
        .from('instagram_autopost_knowledge_videos')
        .update({ transcription: finalTranscription })
        .eq('id', knowledgeVideoId);

      if (updateError) {
        console.error('Error updating transcription:', updateError);
      } else {
        console.log('Transcription saved to database');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      transcription: finalTranscription,
      originalLength: transcript.length,
      summarized: transcript.length > 5000
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in transcribe-youtube-video:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
