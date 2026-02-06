import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MediaPayload {
  company_id: string;
  recipient_phone: string;
  type: "image" | "video" | "document" | "audio" | "ptt" | "sticker";
  file: string; // URL or base64
  caption?: string;
  doc_name?: string;
  instance_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: MediaPayload = await req.json();
    const { 
      company_id, 
      recipient_phone, 
      type,
      file,
      caption,
      doc_name,
      instance_id,
    } = payload;

    console.log("[send-whatsapp-media] Sending media for company:", company_id);
    console.log("[send-whatsapp-media] Type:", type);
    console.log("[send-whatsapp-media] Recipient:", recipient_phone);
    console.log("[send-whatsapp-media] Instance ID:", instance_id || "default");

    if (!company_id || !recipient_phone || !type || !file) {
      console.error("[send-whatsapp-media] Missing required fields");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "company_id, recipient_phone, type e file são obrigatórios" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get WhatsApp config for company
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_active", true)
      .single();

    if (configError || !config) {
      console.error("[send-whatsapp-media] Config not found:", configError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Configuração do WhatsApp não encontrada ou inativa" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Format phone number
    let formattedPhone = recipient_phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    let apiResponse;
    let apiData;

    const provider = config.provider || "zapi";
    console.log("[send-whatsapp-media] Using provider:", provider);

    if (provider === "meta") {
      // Send via Meta Cloud API
      let metaPhoneNumberId = config.meta_phone_number_id;
      let metaAccessToken = config.meta_access_token;
      
      if (instance_id) {
        // Get instance-specific Meta credentials
        const { data: instance, error: instanceError } = await supabase
          .from("whatsapp_instances")
          .select("meta_phone_number_id, meta_access_token, is_connected")
          .eq("id", instance_id)
          .eq("is_active", true)
          .single();
        
        if (instanceError || !instance) {
          console.error("[send-whatsapp-media] Meta instance not found:", instanceError);
          return new Response(
            JSON.stringify({ success: false, error: "Instância Meta não encontrada ou inativa" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!instance.is_connected) {
          return new Response(
            JSON.stringify({ success: false, error: "Instância Meta não está conectada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (instance.meta_phone_number_id) {
          metaPhoneNumberId = instance.meta_phone_number_id;
          metaAccessToken = instance.meta_access_token;
        }
      }

      if (!metaPhoneNumberId || !metaAccessToken) {
        return new Response(
          JSON.stringify({ success: false, error: "Credenciais Meta não configuradas" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // For Meta, we need to first upload the media, then send it
      // Step 1: Upload media to Meta's servers if it's a URL
      let mediaId: string | null = null;
      
      if (file.startsWith("http://") || file.startsWith("https://")) {
        // Download the file first, then upload to Meta
        console.log("[send-whatsapp-media] Downloading file for Meta upload:", file);
        
        const fileResponse = await fetch(file);
        const fileBlob = await fileResponse.blob();
        
        const formData = new FormData();
        formData.append("file", fileBlob);
        formData.append("messaging_product", "whatsapp");
        formData.append("type", type === "ptt" ? "audio" : type);
        
        const uploadResponse = await fetch(
          `https://graph.facebook.com/v18.0/${metaPhoneNumberId}/media`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${metaAccessToken}`,
            },
            body: formData,
          }
        );
        
        const uploadData = await uploadResponse.json();
        console.log("[send-whatsapp-media] Meta upload response:", uploadData);
        
        if (uploadData.id) {
          mediaId = uploadData.id;
        } else {
          return new Response(
            JSON.stringify({ success: false, error: uploadData.error?.message || "Erro ao fazer upload da mídia" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      // Step 2: Send the media message
      const metaUrl = `https://graph.facebook.com/v18.0/${metaPhoneNumberId}/messages`;
      
      // Map our type to Meta's type
      const metaType = type === "ptt" ? "audio" : type;
      
      const metaBody: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: metaType,
      };
      
      // Add media content based on type
      if (mediaId) {
        metaBody[metaType] = { id: mediaId };
      } else if (file.startsWith("http://") || file.startsWith("https://")) {
        metaBody[metaType] = { link: file };
      }
      
      // Add caption for supported types
      if (caption && (metaType === "image" || metaType === "video" || metaType === "document")) {
        metaBody[metaType].caption = caption;
      }
      
      // Add filename for documents
      if (doc_name && metaType === "document") {
        metaBody[metaType].filename = doc_name;
      }

      console.log("[send-whatsapp-media] Calling Meta Graph API:", metaUrl);

      apiResponse = await fetch(metaUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${metaAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(metaBody),
      });

      apiData = await apiResponse.json();
      console.log("[send-whatsapp-media] Meta response:", apiData);

      // Extract message ID from Meta response
      if (apiData.messages?.[0]?.id) {
        apiData.messageId = apiData.messages[0].id;
      }
    } else if (provider === "uazapi") {
      // Find instance token
      let instanceToken: string | null = null;
      
      if (instance_id) {
        const { data: instance, error: instanceError } = await supabase
          .from("whatsapp_instances")
          .select("id, uazapi_token, is_connected")
          .eq("id", instance_id)
          .eq("is_active", true)
          .single();
        
        if (instanceError || !instance) {
          console.error("[send-whatsapp-media] Instance not found:", instanceError);
          return new Response(
            JSON.stringify({ success: false, error: "Instância não encontrada ou inativa" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!instance.is_connected) {
          return new Response(
            JSON.stringify({ success: false, error: "Instância não está conectada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        instanceToken = instance.uazapi_token;
      } else {
        const { data: instance, error: instanceError } = await supabase
          .from("whatsapp_instances")
          .select("id, uazapi_token")
          .eq("company_id", company_id)
          .eq("is_active", true)
          .eq("is_connected", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        
        if (instanceError || !instance) {
          console.error("[send-whatsapp-media] No active connected instance found:", instanceError);
          return new Response(
            JSON.stringify({ success: false, error: "Nenhuma instância ativa e conectada encontrada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        instanceToken = instance.uazapi_token;
      }

      if (!instanceToken) {
        return new Response(
          JSON.stringify({ success: false, error: "Token da instância não encontrado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send via UazapiGO v2 API - POST /send/media
      const cleanEndpoint = config.uazapi_endpoint?.replace(/\/$/, "");
      const uazapiUrl = `${cleanEndpoint}/send/media`;
      console.log("[send-whatsapp-media] Calling UazapiGO:", uazapiUrl);

      const body: any = {
        number: formattedPhone,
        type: type,
        file: file,
      };

      if (caption) {
        body.text = caption;
      }

      if (doc_name && type === "document") {
        body.docName = doc_name;
      }

      apiResponse = await fetch(uazapiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "token": instanceToken,
        },
        body: JSON.stringify(body),
      });

      apiData = await apiResponse.json();
      console.log("[send-whatsapp-media] UazapiGO response:", apiData);
    } else {
      // Z-API uses different endpoints per media type
      let endpoint: string;
      let requestBody: any;

      switch (type) {
        case "image":
          endpoint = "send-image";
          requestBody = { phone: formattedPhone, image: file, caption };
          break;
        case "video":
          endpoint = "send-video";
          requestBody = { phone: formattedPhone, video: file, caption };
          break;
        case "audio":
        case "ptt":
          endpoint = "send-audio";
          requestBody = { phone: formattedPhone, audio: file };
          break;
        case "document":
          endpoint = "send-document/pdf";
          requestBody = { phone: formattedPhone, document: file, fileName: doc_name };
          break;
        case "sticker":
          endpoint = "send-sticker";
          requestBody = { phone: formattedPhone, sticker: file };
          break;
        default:
          endpoint = "send-image";
          requestBody = { phone: formattedPhone, image: file, caption };
      }

      const zapiUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/${endpoint}`;
      console.log("[send-whatsapp-media] Calling Z-API:", zapiUrl);

      apiResponse = await fetch(zapiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.client_token ? { "Client-Token": config.client_token } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      apiData = await apiResponse.json();
      console.log("[send-whatsapp-media] Z-API response:", apiData);
    }

    if (!apiResponse.ok) {
      console.error("[send-whatsapp-media] API error:", apiData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiData.message || apiData.error || "Erro ao enviar mídia" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("[send-whatsapp-media] Media sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message_id: apiData.messageId || apiData.zapiMessageId || apiData.id || apiData.key?.id,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("[send-whatsapp-media] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro interno ao enviar mídia" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
