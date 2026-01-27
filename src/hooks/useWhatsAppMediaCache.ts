import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://ejwpfztkspbvmuwwiwmk.supabase.co";
const BUCKET_NAME = "whatsapp-media-cache";

interface CacheMediaParams {
  messageId: string; // Supabase message ID (not external_id)
  blob: Blob;
  fileExtension: string;
}

/**
 * Upload media to Supabase Storage and update the message with cached URL
 */
export async function cacheWhatsAppMedia({ messageId, blob, fileExtension }: CacheMediaParams): Promise<string | null> {
  try {
    const fileName = `${messageId}.${fileExtension}`;
    const filePath = `media/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        cacheControl: "31536000", // 1 year cache
        upsert: true,
      });

    if (uploadError) {
      console.error("[useWhatsAppMediaCache] Upload error:", uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const cachedUrl = urlData.publicUrl;

    // Update message with cached URL
    const { error: updateError } = await supabase
      .from("whatsapp_messages")
      .update({ cached_media_url: cachedUrl })
      .eq("id", messageId);

    if (updateError) {
      console.error("[useWhatsAppMediaCache] Update message error:", updateError);
      // Still return the URL even if update failed - file is cached
    }

    console.log("[useWhatsAppMediaCache] Media cached successfully:", cachedUrl);
    return cachedUrl;
  } catch (err) {
    console.error("[useWhatsAppMediaCache] Cache failed:", err);
    return null;
  }
}

/**
 * Check if a message has cached media
 */
export function hasCachedMedia(cachedMediaUrl: string | null | undefined): boolean {
  return !!cachedMediaUrl && cachedMediaUrl.length > 0;
}

/**
 * Download media from edge function proxy and optionally cache it
 */
export async function downloadAndCacheMedia({
  instanceId,
  externalMessageId,
  supabaseMessageId,
  fileName,
  shouldCache = true,
}: {
  instanceId: string;
  externalMessageId: string;
  supabaseMessageId: string;
  fileName: string;
  shouldCache?: boolean;
}): Promise<{ blob: Blob; cachedUrl: string | null } | null> {
  try {
    // Get Supabase session for auth
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      console.error("[downloadAndCacheMedia] No session");
      return null;
    }

    const functionUrl = `${SUPABASE_URL}/functions/v1/download-whatsapp-media`;

    console.log("[downloadAndCacheMedia] Downloading media...", { instanceId, externalMessageId });

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        instanceId,
        messageId: externalMessageId,
        fileName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[downloadAndCacheMedia] Download failed:", response.status, errorText);
      return null;
    }

    const blob = await response.blob();

    if (blob.size === 0) {
      console.error("[downloadAndCacheMedia] Empty file");
      return null;
    }

    console.log("[downloadAndCacheMedia] Downloaded, size:", blob.size);

    // Cache the media
    let cachedUrl: string | null = null;
    if (shouldCache && supabaseMessageId) {
      const extension = fileName.split(".").pop() || "bin";
      cachedUrl = await cacheWhatsAppMedia({
        messageId: supabaseMessageId,
        blob,
        fileExtension: extension,
      });
    }

    return { blob, cachedUrl };
  } catch (err) {
    console.error("[downloadAndCacheMedia] Error:", err);
    return null;
  }
}
