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
    const { mediaUrl, fileName } = await req.json();

    if (!mediaUrl) {
      return new Response(
        JSON.stringify({ error: "Media URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Downloading media from: ${mediaUrl}`);

    // Fetch the file from the external URL
    const response = await fetch(mediaUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch media: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch media: ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the file content as array buffer
    const fileBuffer = await response.arrayBuffer();
    
    // Determine content type from response or file extension
    let contentType = response.headers.get("content-type") || "application/octet-stream";
    
    // If filename has extension, use that to determine content type
    if (fileName) {
      const ext = fileName.split(".").pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        mp4: "video/mp4",
        webm: "video/webm",
        avi: "video/x-msvideo",
        txt: "text/plain",
        zip: "application/zip",
        rar: "application/x-rar-compressed",
      };
      if (ext && mimeTypes[ext]) {
        contentType = mimeTypes[ext];
      }
    }

    console.log(`Returning file with content-type: ${contentType}, size: ${fileBuffer.byteLength}`);

    // Return the file with proper headers for download
    return new Response(fileBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName || 'download'}"`,
        "Content-Length": fileBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error in download-whatsapp-media:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
