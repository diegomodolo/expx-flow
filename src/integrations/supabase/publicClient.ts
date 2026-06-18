import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { extractProjectRef } from "./client";

// Public (no-session) client for publicly accessible pages.
// This prevents session recovery/refresh (which can hang public views when a stale session exists).

// Self-host: lê apenas de env vars; mesmo ref extraction do client principal.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Configuração ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.",
  );
}

// Re-exporta para consumidores que eventualmente importam do publicClient.
export { extractProjectRef };

export const supabasePublic = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
