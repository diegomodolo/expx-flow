import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error("Image is required");
    }

    console.log("Extracting text from image...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and extract ALL text that appears in it. 

IMPORTANT INSTRUCTIONS:
- Extract only the visible text from the image
- Maintain the original text structure (headlines, subheadlines, body text)
- If there are multiple text elements, separate them with line breaks
- If no text is found, respond with exactly: NO_TEXT_FOUND
- Do not add any explanation or commentary, just return the extracted text
- Preserve the original language of the text (Portuguese, English, etc.)

Return ONLY the extracted text, nothing else.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content?.trim() || "";

    console.log("Text extracted:", extractedText.substring(0, 100) + "...");

    // Check if no text was found
    if (extractedText === "NO_TEXT_FOUND" || !extractedText) {
      return new Response(
        JSON.stringify({
          success: true,
          text: "",
          hasText: false,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        hasText: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error extracting text:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
