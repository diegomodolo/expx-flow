// useSystemConfig — leitura e upsert de credenciais globais (system_config_*).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SystemConfigProvider =
  | "app"
  | "facebook"
  | "google"
  | "ai"
  | "email"
  | "tools"
  | "discord"
  | "github";

export interface SystemConfigBase {
  id?: number;
}

export interface SystemConfigApp extends SystemConfigBase {
  app_url: string | null;
  app_name: string | null;
}
export interface SystemConfigFacebook extends SystemConfigBase {
  app_id: string | null;
  app_secret: string | null;
  graph_api_version: string;
}
export interface SystemConfigGoogle extends SystemConfigBase {
  ads_client_id: string | null;
  ads_client_secret: string | null;
  ads_developer_token: string | null;
  meet_client_id: string | null;
  meet_client_secret: string | null;
  youtube_api_key: string | null;
  gcp_service_account_json: string | null;
}
export interface SystemConfigAI extends SystemConfigBase {
  openrouter_api_key: string | null;
  openai_api_key: string | null;
}
export interface SystemConfigEmail extends SystemConfigBase {
  resend_api_key: string | null;
  from_email: string | null;
  from_name: string | null;
}
export interface SystemConfigTools extends SystemConfigBase {
  apify_api_token: string | null;
  firecrawl_api_key: string | null;
  shotstack_api_key: string | null;
  youtube_proxy_url: string | null;
  api4com_base_url: string;
}
export interface SystemConfigDiscord extends SystemConfigBase {
  bot_token: string | null;
}
export interface SystemConfigGithub extends SystemConfigBase {
  pat: string | null;
  repo_owner: string | null;
  repo_name: string | null;
}

export type SystemConfigMap = {
  app: SystemConfigApp;
  facebook: SystemConfigFacebook;
  google: SystemConfigGoogle;
  ai: SystemConfigAI;
  email: SystemConfigEmail;
  tools: SystemConfigTools;
  discord: SystemConfigDiscord;
  github: SystemConfigGithub;
};

const SECRET_FIELDS: Partial<Record<SystemConfigProvider, string[]>> = {
  facebook: ["app_secret"],
  google: [
    "ads_client_secret",
    "ads_developer_token",
    "meet_client_secret",
    "youtube_api_key",
    "gcp_service_account_json",
  ],
  ai: ["openrouter_api_key", "openai_api_key"],
  email: ["resend_api_key"],
  tools: ["apify_api_token", "firecrawl_api_key", "shotstack_api_key"],
  discord: ["bot_token"],
  github: ["pat"],
};

/**
 * Lê o registro singleton (id=1) de uma tabela system_config_*.
 */
export function useSystemConfig<K extends SystemConfigProvider>(
  provider: K,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["system_config", provider],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(`system_config_${provider}` as never)
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as SystemConfigMap[K];
    },
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Upsert (id=1). Campos secretos vazios são OMITIDOS para não sobrescrever
 * o valor existente com null quando o usuário não preencheu (UX com
 * SecretField que mostra apenas se existe, não o valor real).
 */
export function useUpsertSystemConfig<K extends SystemConfigProvider>(
  provider: K,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<SystemConfigMap[K]>) => {
      const secretFields = SECRET_FIELDS[provider] ?? [];
      const cleaned: Record<string, unknown> = { id: 1 };
      for (const [k, v] of Object.entries(values)) {
        if (
          secretFields.includes(k) &&
          (v === "" || v === null || v === undefined)
        ) {
          continue; // não sobrescreve segredo existente com vazio
        }
        cleaned[k] = v;
      }
      const { data, error } = await supabase
        .from(`system_config_${provider}` as never)
        .upsert(cleaned)
        .select("*")
        .single();
      if (error) throw error;
      return data as SystemConfigMap[K];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system_config", provider] });
      toast.success("Configurações salvas com sucesso.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao salvar.";
      toast.error(`Erro ao salvar: ${msg}`);
    },
  });
}

/**
 * Verifica se o usuário atual é o system owner.
 */
export function useIsSystemOwner() {
  return useQuery({
    queryKey: ["is_system_owner"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_system_owner").single();
      if (error) {
        console.warn("is_system_owner check failed:", error.message);
        return false;
      }
      return Boolean(data);
    },
    staleTime: 60_000,
  });
}
