import { createClient } from "@supabase/supabase-js";

export type InstallationReason = "no-env" | "not-installed" | "no-admin";

export interface InstallationStatus {
  configured: boolean;
  reason?: InstallationReason;
}

export interface StatusEnv {
  VITE_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_ANON_KEY?: string;
}

export interface StatusSupabase {
  from: (table: string) => any;
}

export async function computeInstallationStatus(
  env: StatusEnv,
  supabase: StatusSupabase | null,
): Promise<InstallationStatus> {
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (!url || !anonKey || !supabase) {
    return { configured: false, reason: "no-env" };
  }

  let installationCompleted = false;
  try {
    const flagResult = await supabase
      .from("system_config_app")
      .select("installation_completed")
      .eq("id", 1)
      .maybeSingle();
    if (
      !flagResult.error &&
      flagResult.data &&
      flagResult.data.installation_completed === true
    ) {
      installationCompleted = true;
    }
  } catch {
    installationCompleted = false;
  }

  if (!installationCompleted) {
    return { configured: false, reason: "not-installed" };
  }

  let adminCount = 0;
  try {
    const countResult = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    if (!countResult.error) {
      adminCount = countResult.count ?? 0;
    }
  } catch {
    adminCount = 0;
  }

  if (adminCount < 1) {
    return { configured: false, reason: "no-admin" };
  }

  return { configured: true };
}

interface VercelRequest {
  method?: string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const env: StatusEnv = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  };

  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  let supabase: StatusSupabase | null = null;
  if (url && anonKey) {
    supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as StatusSupabase;
  }

  let status: InstallationStatus;
  try {
    status = await computeInstallationStatus(env, supabase);
  } catch {
    status = { configured: false, reason: "not-installed" };
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(status);
}
