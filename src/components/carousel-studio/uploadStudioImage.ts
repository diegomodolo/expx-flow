import { supabase } from "@/integrations/supabase/client";

const BUCKET = "visual-creatives";

// Sobe a imagem para o Storage e retorna a URL publica. NUNCA salvar base64
// (data URL) nas colunas de imagem dos slides/projetos — data URLs de varios MB
// estouram o statement timeout das queries e travam o navegador no editor.
export async function uploadStudioImage(
  file: File,
  folder: string,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
