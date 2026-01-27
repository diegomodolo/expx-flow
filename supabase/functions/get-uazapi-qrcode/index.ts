import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, token, session } = await req.json();

    console.log("[get-uazapi-qrcode] Getting QR Code for session:", session);

    if (!endpoint || !token || !session) {
      console.error("[get-uazapi-qrcode] Missing required credentials");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Endpoint, Token e Session são obrigatórios" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Clean endpoint URL
    const cleanEndpoint = endpoint.replace(/\/$/, "");

    // First, start the session if not already started
    console.log("[get-uazapi-qrcode] Starting session...");
    try {
      const startResponse = await fetch(`${cleanEndpoint}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Token": token,
        },
        body: JSON.stringify({
          session: session,
        }),
      });

      const startText = await startResponse.text();
      console.log("[get-uazapi-qrcode] Start session raw response:", startText);
      
      // Try to parse as JSON for logging, but don't fail if it's not JSON
      try {
        const startData = JSON.parse(startText);
        console.log("[get-uazapi-qrcode] Start session parsed:", startData);
      } catch {
        console.log("[get-uazapi-qrcode] Start response is not JSON, continuing...");
      }
    } catch (startError) {
      console.log("[get-uazapi-qrcode] Start session failed (non-critical):", startError.message);
      // Continue anyway - the session might already be started
    }

    // Get QR Code
    const qrCodeUrl = `${cleanEndpoint}/getQrCode?session=${session}`;
    console.log("[get-uazapi-qrcode] Calling UazapiGO:", qrCodeUrl);

    const response = await fetch(qrCodeUrl, {
      method: "GET",
      headers: {
        "Token": token,
      },
    });

    console.log("[get-uazapi-qrcode] Response status:", response.status);
    console.log("[get-uazapi-qrcode] Response content-type:", response.headers.get("content-type"));

    // Check if response is an image
    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("image")) {
      // Convert image to base64
      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const imageDataUrl = `data:${contentType};base64,${base64}`;

      return new Response(
        JSON.stringify({
          success: true,
          qrcode: imageDataUrl,
          is_image: true,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Try to parse as JSON
    const responseText = await response.text();
    console.log("[get-uazapi-qrcode] Response text:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // If not JSON and not image, return the text as qrcode (might be base64)
      return new Response(
        JSON.stringify({
          success: true,
          qrcode: responseText,
          is_image: false,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check if already connected
    if (data.state === "CONNECTED" || data.status === "CONNECTED") {
      return new Response(
        JSON.stringify({
          success: true,
          is_connected: true,
          message: "Já conectado",
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Return QR code from response
    if (data.qrcode || data.qr || data.base64) {
      return new Response(
        JSON.stringify({
          success: true,
          qrcode: data.qrcode || data.qr || data.base64,
          is_image: false,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Error response
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: data.message || data.error || "Não foi possível obter o QR Code" 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[get-uazapi-qrcode] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro interno ao obter QR Code" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
