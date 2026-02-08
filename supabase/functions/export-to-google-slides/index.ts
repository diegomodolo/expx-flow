import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SlideData {
  id: string;
  title: string;
  image_url: string | null;
  slide_order: number;
}

interface RequestBody {
  scriptId: string;
  scriptTitle: string;
  slides: SlideData[];
  shareWithEmail?: string;
}

async function getGoogleAccessToken(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claim = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: exp,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const claimB64 = btoa(JSON.stringify(claim)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const unsignedToken = `${headerB64}.${claimB64}`;

  // Import the private key
  const pemContents = credentials.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Token exchange error:", errorText);
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { scriptId, scriptTitle, slides, shareWithEmail } = await req.json() as RequestBody;

    if (!scriptId || !slides || slides.length === 0) {
      return new Response(JSON.stringify({ error: "scriptId and slides are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter slides that have images
    const slidesWithImages = slides.filter(s => s.image_url).sort((a, b) => a.slide_order - b.slide_order);

    if (slidesWithImages.length === 0) {
      return new Response(JSON.stringify({ error: "No slides with images to export" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Exporting ${slidesWithImages.length} slides to Google Slides for script: ${scriptTitle}`);

    // Get GCP credentials
    const gcpCredentialsJson = Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
    if (!gcpCredentialsJson) {
      return new Response(JSON.stringify({ error: "GCP credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const credentials = JSON.parse(gcpCredentialsJson);
    const accessToken = await getGoogleAccessToken(credentials);

    console.log("Got access token, creating presentation...");

    // Create a new presentation
    const createResponse = await fetch("https://slides.googleapis.com/v1/presentations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: scriptTitle || "Apresentação sem título",
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("Create presentation error:", errorText);
      throw new Error(`Failed to create presentation: ${errorText}`);
    }

    const presentation = await createResponse.json();
    const presentationId = presentation.presentationId;
    console.log(`Created presentation: ${presentationId}`);

    // Build batch update requests
    // First, delete the default slide
    const defaultSlideId = presentation.slides?.[0]?.objectId;
    const requests: any[] = [];

    // Create new slides with images
    for (let i = 0; i < slidesWithImages.length; i++) {
      const slide = slidesWithImages[i];
      const slideObjectId = `slide_${i}`;
      const imageObjectId = `image_${i}`;

      // Create slide
      requests.push({
        createSlide: {
          objectId: slideObjectId,
          insertionIndex: i,
          slideLayoutReference: {
            predefinedLayout: "BLANK",
          },
        },
      });

      // Add image to slide (full slide 16:9)
      requests.push({
        createImage: {
          objectId: imageObjectId,
          url: slide.image_url,
          elementProperties: {
            pageObjectId: slideObjectId,
            size: {
              width: { magnitude: 9144000, unit: "EMU" }, // Full width (10 inches in EMU)
              height: { magnitude: 5143500, unit: "EMU" }, // Full height (5.625 inches in EMU for 16:9)
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 0,
              translateY: 0,
              unit: "EMU",
            },
          },
        },
      });
    }

    // Delete default slide after creating new ones
    if (defaultSlideId) {
      requests.push({
        deleteObject: {
          objectId: defaultSlideId,
        },
      });
    }

    console.log(`Executing ${requests.length} batch requests...`);

    // Execute batch update
    const batchResponse = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!batchResponse.ok) {
      const errorText = await batchResponse.text();
      console.error("Batch update error:", errorText);
      throw new Error(`Failed to add slides: ${errorText}`);
    }

    console.log("Slides added successfully");

    // If shareWithEmail is provided, share the presentation
    if (shareWithEmail) {
      console.log(`Sharing presentation with: ${shareWithEmail}`);
      
      const shareResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${presentationId}/permissions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "user",
            role: "writer",
            emailAddress: shareWithEmail,
          }),
        }
      );

      if (!shareResponse.ok) {
        console.warn("Failed to share presentation:", await shareResponse.text());
        // Don't fail the whole request, just log the warning
      } else {
        console.log("Presentation shared successfully");
      }
    }

    // Make the presentation viewable by anyone with the link
    const publicShareResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${presentationId}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "anyone",
          role: "reader",
        }),
      }
    );

    if (!publicShareResponse.ok) {
      console.warn("Failed to make presentation public:", await publicShareResponse.text());
    }

    const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;
    console.log(`Presentation ready: ${presentationUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        presentationId,
        presentationUrl,
        slidesCount: slidesWithImages.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error exporting to Google Slides:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to export to Google Slides" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
