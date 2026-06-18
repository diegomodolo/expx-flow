/**
 * Helpers para self-hosting.
 * Centraliza leitura de env vars do Supabase e construção de URLs de Edge Functions.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/** Retorna a URL base do Supabase (do env). */
export function getSupabaseUrl(): string {
  if (!SUPABASE_URL) {
    throw new Error("VITE_SUPABASE_URL não configurada. Verifique seu .env.");
  }
  return SUPABASE_URL.replace(/\/+$/, "");
}

/** Anon key (publishable) do Supabase. Padronizada em VITE_SUPABASE_ANON_KEY. */
export function getSupabaseAnonKey(): string {
  const v =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined);
  if (!v) {
    throw new Error(
      "VITE_SUPABASE_ANON_KEY não configurada. Verifique seu .env.",
    );
  }
  return v;
}

/**
 * Constrói a URL completa de uma Edge Function a partir da VITE_SUPABASE_URL.
 * Ex.: functionUrl("whatsapp-webhook") → "https://xyz.supabase.co/functions/v1/whatsapp-webhook"
 */
export function functionUrl(name: string): string {
  return `${getSupabaseUrl()}/functions/v1/${name}`;
}
