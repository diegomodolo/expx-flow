// ============================================================
// getSystemConfig.ts — Helper compartilhado para self-hosting
// ------------------------------------------------------------
// Lê configurações globais das tabelas system_config_*.
// Padrão OBRIGATÓRIO em todas as Edge Functions:
//   const cfg = await getSystemConfig(supabase, "facebook");
//   const appId = resolveCredential(
//     Deno.env.get("FACEBOOK_APP_ID"), cfg?.app_id,
//     "Facebook App ID não configurado. Acesse Configurações > Sistema > Facebook."
//   );
// ============================================================

export type SystemConfigProvider =
  | "app"
  | "facebook"
  | "google"
  | "ai"
  | "email"
  | "tools"
  | "discord"
  | "github";

export interface SystemConfigApp {
  app_url: string | null;
  app_name: string | null;
}
export interface SystemConfigFacebook {
  app_id: string | null;
  app_secret: string | null;
  graph_api_version: string;
}
export interface SystemConfigGoogle {
  ads_client_id: string | null;
  ads_client_secret: string | null;
  ads_developer_token: string | null;
  meet_client_id: string | null;
  meet_client_secret: string | null;
  youtube_api_key: string | null;
  gcp_service_account_json: string | null;
}
export interface SystemConfigAI {
  openrouter_api_key: string | null;
  openai_api_key: string | null;
}
export interface SystemConfigEmail {
  resend_api_key: string | null;
  from_email: string | null;
  from_name: string | null;
}
export interface SystemConfigTools {
  apify_api_token: string | null;
  firecrawl_api_key: string | null;
  shotstack_api_key: string | null;
  youtube_proxy_url: string | null;
  api4com_base_url: string;
}
export interface SystemConfigDiscord {
  bot_token: string | null;
}
export interface SystemConfigGithub {
  pat: string | null;
  repo_owner: string | null;
  repo_name: string | null;
}

export type SystemConfigRow =
  | SystemConfigApp
  | SystemConfigFacebook
  | SystemConfigGoogle
  | SystemConfigAI
  | SystemConfigEmail
  | SystemConfigTools
  | SystemConfigDiscord
  | SystemConfigGithub;

/**
 * Lê a configuração singleton (id=1) de uma tabela system_config_*.
 * Retorna `null` quando a tabela está vazia ou quando há erro de banco
 * (nunca lança — logging apenas).
 */
export async function getSystemConfig<
  T extends SystemConfigRow = SystemConfigRow,
>(
  supabase: { from: (t: string) => unknown },
  provider: SystemConfigProvider,
): Promise<T | null> {
  const table = `system_config_${provider}`;
  try {
    const qb = supabase.from(table) as unknown as {
      select: (c: string) => {
        eq: (
          col: string,
          val: unknown,
        ) => {
          maybeSingle: () => Promise<{
            data: T | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    const { data, error } = await qb.select("*").eq("id", 1).maybeSingle();
    if (error) {
      console.warn(`[getSystemConfig] Erro lendo ${table}: ${error.message}`);
      return null;
    }
    return data;
  } catch (e) {
    console.warn(`[getSystemConfig] Exceção lendo ${table}:`, e);
    return null;
  }
}

/**
 * Resolve credencial com prioridade **env var > banco de dados**.
 * Quando ambos ausentes, lança Error com mensagem PT-BR apontando para
 * Configurações > Sistema.
 *
 * Use `resolveCredentialOptional` quando o valor pode ser ausente
 * (integração opcional, ex.: GitHub).
 */
export function resolveCredential(
  envValue: string | undefined,
  dbValue: string | null | undefined,
  errorMessage: string,
): string {
  const v = (envValue && envValue.trim()) || (dbValue && dbValue.trim());
  if (!v) {
    throw Object.assign(new Error(errorMessage), {
      code: "SYSTEM_CONFIG_MISSING",
    });
  }
  return v;
}

/**
 * Mesmo padrão de resolveCredential, mas retorna `null` em vez de lanççar
 * para integrações opcionais (GitHub, Discord, Apify quando feature desligada).
 */
export function resolveCredentialOptional(
  envValue: string | undefined,
  dbValue: string | null | undefined,
): string | null {
  const v = (envValue && envValue.trim()) || (dbValue && dbValue.trim());
  return v || null;
}

/**
 * Resolve a URL pública da instalação.
 * Prioridade: config.app_url > header `origin`/`x-forwarded-host` > fallback.
 * Nunca lança; retorna fallback (que pode ser undefined).
 */
export function getAppUrl(
  appConfig: SystemConfigApp | null,
  req: Request,
  fallback?: string,
): string {
  if (appConfig?.app_url && appConfig.app_url.trim()) {
    return appConfig.app_url.replace(/\/+$/, "");
  }
  try {
    const origin = req.headers.get("origin");
    if (origin) return origin.replace(/\/+$/, "");
    const xfh = req.headers.get("x-forwarded-host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    if (xfh) return `${proto}://${xfh}`.replace(/\/+$/, "");
  } catch {
    // ignore
  }
  return (fallback || "").replace(/\/+$/, "");
}

/**
 * Helper que injeta `app_url` em links de email/notificação.
 * Sem domínio hardcoded — se nada configurado, retorna path relativo.
 */
export function buildAppLink(
  appConfig: SystemConfigApp | null,
  req: Request,
  path: string,
): string {
  const base = getAppUrl(appConfig, req);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return cleanPath;
  return `${base}${cleanPath}`;
}
