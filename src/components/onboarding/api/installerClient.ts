/**
 * Cliente frontend para os endpoints `/api/installer/*` (Vercel Serverless).
 *
 * Tokens de Vercel/Supabase NUNCA são persistidos — ficam só em memória do
 * wizard e são enviados no corpo de cada chamada. service_role do projeto
 * novo também é efêmera (sai do `run` e entra no `create-admin` na mesma
 * sessão, sem tocar localStorage/sessionStorage).
 *
 * Referência: docs/onboarding-installer/SPRINT-3-wizard-admin-e2e.md (Fase 3.1/3.2)
 */

export interface TokenValidationResult {
  vercel: boolean;
  supabase: boolean;
  error?: string;
}

export interface SupabaseOrg {
  id: string;
  name: string;
}

export interface ListOrgsResult {
  orgs: SupabaseOrg[];
}

export interface CreateAdminInput {
  projectRef: string;
  serviceRoleKey: string;
  email: string;
  password: string;
  fullName?: string;
}

export interface CreateAdminResult {
  ok: true;
  userId: string;
}

/**
 * POST /api/installer/validate-tokens — valida `vercelToken` e `supabaseToken`
 * em paralelo. Sempre 200 quando chega aos wrappers (verde/vermelho vem no
 * corpo). 400 somente para body malformado.
 */
export async function validateTokens(input: {
  vercelToken: string;
  supabaseToken: string;
}): Promise<TokenValidationResult> {
  const res = await fetch("/api/installer/validate-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vercelToken: input.vercelToken,
      supabaseToken: input.supabaseToken,
    }),
  });
  return (await res.json()) as TokenValidationResult;
}

/**
 * POST /api/installer/list-orgs — lista organizações Supabase acessíveis
 * pelo token. 401 PT-BR para token inválido; 502 para falha de upstream.
 */
export async function listOrgs(input: {
  supabaseToken: string;
}): Promise<ListOrgsResult> {
  const res = await fetch("/api/installer/list-orgs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ supabaseToken: input.supabaseToken }),
  });
  const data = (await res.json().catch(() => ({}))) as
    | ListOrgsResult
    | { error?: string };
  if (!res.ok) {
    const message =
      (data as { error?: string })?.error ??
      "Não foi possível listar as organizações.";
    throw new InstallerApiError(res.status, message);
  }
  return data as ListOrgsResult;
}

/**
 * POST /api/installer/create-admin — cria o admin (vira owner via trigger)
 * e marca `system_config_app.installation_completed = true`.
 */
export async function createAdmin(
  input: CreateAdminInput,
): Promise<CreateAdminResult> {
  const res = await fetch("/api/installer/create-admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : "Não foi possível criar o administrador.";
    throw new InstallerApiError(res.status, message);
  }
  return {
    ok: true,
    userId: typeof data.userId === "string" ? data.userId : "",
  };
}

export class InstallerApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "InstallerApiError";
    this.status = status;
  }
}
