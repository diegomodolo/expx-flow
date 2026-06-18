/**
 * Estado compartilhado do wizard `/onboarding` — uma fonte única de verdade
 * para os 7 passos. Cada passo lê/escreve campos deste estado via props.
 *
 * O `projectRef` e a `serviceRoleKey` do projeto novo saem do SSE `run`
 * (em `progress.projectRef` + credenciais em memória) e entram no passo
 * admin para chamar `create-admin`. Esses campos **não** são persistidos
 * em localStorage/sessionStorage — só o `progress` (resumível) é.
 */
export interface OnboardingData {
  vercelToken: string;
  supabaseToken: string;
  orgId: string;
  orgName: string;
  projectName: string;
  dbPassword: string;
  /** projectRef do projeto novo — populado pelo evento SSE done/partial. */
  projectRef?: string;
  /** service_role key do projeto novo — efêmera, só em memória. */
  serviceRoleKey?: string;
  /** Último progress recebido do `run` — guardado em sessionStorage (resume). */
  progress?: unknown;
  /** Email do admin criado no passo 5 (mostrado no passo 6). */
  adminEmail?: string;
}

export const ONBOARDING_INITIAL_DATA: OnboardingData = {
  vercelToken: "",
  supabaseToken: "",
  orgId: "",
  orgName: "",
  projectName: "expx-flow",
  dbPassword: "",
};

/** Mapa step técnico → rótulo amigável PT-BR (leigo). */
export const STEP_LABELS_PTBR: Record<string, string> = {
  "create-project": "Criando projeto Supabase",
  "apply-schema": "Aplicando estrutura do banco",
  "deploy-functions": "Publicando funções",
  "set-secrets": "Configurando secrets",
  "write-vercel-env": "Configurando variáveis na Vercel",
  "trigger-redeploy": "Reiniciando a aplicação",
  global: "Instalação",
};

export const TOTAL_ONBOARDING_STEPS = 7;

/** Chave do sessionStorage para o `progress` do `run` (resume ao recarregar). */
export const ONBOARDING_PROGRESS_KEY = "expx_onboarding_progress";

export function loadStoredProgress(): unknown {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeProgress(progress: unknown): void {
  try {
    if (progress) {
      sessionStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(progress));
    } else {
      sessionStorage.removeItem(ONBOARDING_PROGRESS_KEY);
    }
  } catch {
    /* sessionStorage indisponível (modo privado) — seguem sem resume */
  }
}

export function clearStoredProgress(): void {
  try {
    sessionStorage.removeItem(ONBOARDING_PROGRESS_KEY);
  } catch {
    /* noop */
  }
}
