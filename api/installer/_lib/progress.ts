/**
 * Estado resumível da instalação (`install_progress`).
 *
 * Princípios:
 *  - **Token é efêmero**: o snapshot NUNCA contém tokens, service_role key ou
 *    senha do DB. Esses valores ficam só em memória da request (no `ctx`).
 *    O que pode ser persistido: `projectRef`, `projectAnonKey` (chave pública
 *    do frontend), IDs de deploy da Vercel, listas de steps/functions.
 *  - **Idempotente**: `markStep` e `markFunctionDeployed` não duplicam.
 *  - **Persistência abstraída por um `ProgressStore`**:
 *      * `createInMemoryProgressStore` — default quando o Supabase do cliente
 *        ainda não existe (primeira invocação, antes de `create-project`).
 *      * `createSupabaseProgressStore` — usado após `apply-schema` garantir o
 *        schema base; persiste em `system_config_app.install_progress` (JSONB)
 *        no Supabase do cliente. Sobrevive ao redeploy (risco §8).
 *
 * Referência: docs/onboarding-installer/00-ORQUESTRADOR.md §8 (risco redeploy).
 */

export const STEPS = [
  "create-project",
  "apply-schema",
  "deploy-functions",
  "set-secrets",
  "write-vercel-env",
  "trigger-redeploy",
] as const;

export type StepName = (typeof STEPS)[number];

export interface InstallProgress {
  /** Steps concluídos (ordem de conclusão). Sem duplicatas. */
  completedSteps: StepName[];
  /** Nomes das Edge Functions já deployadas com sucesso. Sem duplicatas. */
  functions: string[];
  /** ref do projeto Supabase recém-criado (para resume + write-vercel-env). */
  projectRef?: string;
  /**
   * Anon key do projeto novo (chave pública do frontend).
   * Necessária para `write-vercel-env` sobreviver a reinvocações.
   * serviceRoleKey/dbPassword NÃO entram aqui — só em memória do `ctx`.
   */
  projectAnonKey?: string;
  /** ID do último deploy da Vercel disparado (para resume do trigger-redeploy). */
  vercelDeploymentId?: string;
  /** ID do projeto Vercel sob o qual o instalador roda. */
  vercelProjectId?: string;
  /** Timestamp (ms) da primeira carga do progress nesta invocação. */
  startedAt: number;
  /** Timestamp (ms) da última mutação. */
  updatedAt: number;
}

export function createInitialProgress(): InstallProgress {
  const now = Date.now();
  return {
    completedSteps: [],
    functions: [],
    startedAt: now,
    updatedAt: now,
  };
}

/**
 * Store de persistência. A implementação padrão (`InMemoryProgressStore`)
 * mantém o estado em memória. A implementação Supabase (construída em `run`
 * após `apply-schema`) persiste em `system_config_app.install_progress`.
 */
export interface ProgressStore {
  load(): Promise<InstallProgress | null>;
  save(progress: InstallProgress): Promise<void>;
}

export function createInMemoryProgressStore(
  initial?: InstallProgress | null,
): ProgressStore {
  let state: InstallProgress | null = initial ? structuredClone(initial) : null;
  return {
    async load() {
      return state ? structuredClone(state) : null;
    },
    async save(progress: InstallProgress) {
      state = structuredClone(progress);
    },
  };
}

/**
 * Store persistente no Supabase do cliente.
 *
 * Coluna `install_progress JSONB` em `public.system_config_app (id=1)`.
 * Essa coluna é garantida pelo step `apply-schema` (ALTER TABLE ... ADD
 * COLUMN IF NOT EXISTS). A persistência usa upsert idempotente.
 *
 * Leitura/escrita usam a service_role key (bypass RLS) — por isso o client
 * deve ser construído com a service_role key do projeto novo (em memória).
 */
export function createSupabaseProgressStore(opts: {
  /** Client supabase-js já autenticado com service_role do projeto novo. */
  client: {
    from: (table: string) => any;
  };
}): ProgressStore {
  const { client } = opts;
  const TABLE = "system_config_app";
  const ID = 1;
  const COLUMN = "install_progress";

  return {
    async load() {
      try {
        const result = await client
          .from(TABLE)
          .select(COLUMN)
          .eq("id", ID)
          .maybeSingle();
        if (result?.error) return null;
        const raw = result?.data?.[COLUMN];
        if (!raw || typeof raw !== "object") return null;
        return normalizeProgress(raw as Partial<InstallProgress>);
      } catch {
        return null;
      }
    },
    async save(progress: InstallProgress) {
      const result = await client
        .from(TABLE)
        .upsert({ id: ID, [COLUMN]: progress }, { onConflict: "id" });
      if (result?.error) {
        // Persistência é best-effort: se falhar (ex.: RLS, coluna ausente),
        // o progress segue em memória da invocação. Log sem expor segredos.
        // Não relançar — instalação não pode parar por isso.
      }
    },
  };
}

function normalizeProgress(raw: Partial<InstallProgress>): InstallProgress {
  const now = Date.now();
  const completedSteps = Array.isArray(raw.completedSteps)
    ? (raw.completedSteps.filter((s) =>
        STEPS.includes(s as StepName),
      ) as StepName[])
    : [];
  const functions = Array.isArray(raw.functions) ? raw.functions : [];
  // Dedupe preservando ordem.
  return {
    completedSteps: dedupe(completedSteps),
    functions: dedupe(functions),
    projectRef: typeof raw.projectRef === "string" ? raw.projectRef : undefined,
    projectAnonKey:
      typeof raw.projectAnonKey === "string" ? raw.projectAnonKey : undefined,
    vercelDeploymentId:
      typeof raw.vercelDeploymentId === "string"
        ? raw.vercelDeploymentId
        : undefined,
    vercelProjectId:
      typeof raw.vercelProjectId === "string" ? raw.vercelProjectId : undefined,
    startedAt: typeof raw.startedAt === "number" ? raw.startedAt : now,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
  };
}

function dedupe<T>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const key = String(x);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return out;
}

export interface ProgressService {
  /** Carrega do store (ou estado inicial) e popula o snapshot em memória. */
  loadProgress(): Promise<InstallProgress>;
  /** Marca step concluído + mescla patch (idempotente). */
  markStep(name: StepName, patch?: Partial<InstallProgress>): Promise<void>;
  /** Marca function como deployada (idempotente). */
  markFunctionDeployed(name: string): Promise<void>;
  isStepDone(name: StepName): boolean;
  isFunctionDeployed(name: string): boolean;
  /** Snapshot congelado do estado atual. */
  snapshot(): InstallProgress;
  /** Substitui o snapshot inteiro (usado no resume via body). */
  replace(progress: InstallProgress): void;
  /**
   * Troca o store de persistência para um store persistente (ex.: Supabase do
   * cliente após `apply-schema`) e faz um flush imediato do estado atual.
   * Best-effort: se o flush falhar, o snapshot em memória segue válido.
   */
  attachPersistentStore(store: ProgressStore): Promise<void>;
}

export function createProgressService(opts: {
  store?: ProgressStore;
  initial?: InstallProgress;
}): ProgressService {
  let store: ProgressStore = opts.store ?? createInMemoryProgressStore();
  let current: InstallProgress = opts.initial
    ? structuredClone(opts.initial)
    : createInitialProgress();
  let loaded = false;

  function setUpdated(p: InstallProgress): InstallProgress {
    p.updatedAt = Date.now();
    return p;
  }

  async function persist(): Promise<void> {
    try {
      await store.save(structuredClone(current));
    } catch {
      /* best-effort: progress segue válido em memória */
    }
  }

  return {
    async loadProgress() {
      if (!loaded) {
        try {
          const stored = await store.load();
          if (stored) current = stored;
        } catch {
          /* mantém estado inicial */
        }
        loaded = true;
      }
      return current;
    },

    async markStep(name, patch) {
      if (!loaded) await this.loadProgress();
      if (!current.completedSteps.includes(name)) {
        current.completedSteps.push(name);
      }
      if (patch) {
        const target = current as unknown as Record<string, unknown>;
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined) continue;
          target[k] = v;
        }
      }
      setUpdated(current);
      await persist();
    },

    async markFunctionDeployed(name) {
      if (!loaded) await this.loadProgress();
      if (!current.functions.includes(name)) {
        current.functions.push(name);
      }
      setUpdated(current);
      await persist();
    },

    isStepDone(name) {
      return current.completedSteps.includes(name);
    },

    isFunctionDeployed(name) {
      return current.functions.includes(name);
    },

    snapshot() {
      return structuredClone(current);
    },

    replace(progress) {
      current = normalizeProgress(progress);
      current.startedAt = current.startedAt || Date.now();
      setUpdated(current);
      loaded = true;
    },

    async attachPersistentStore(newStore) {
      store = newStore;
      loaded = true; // próximos markSteps não recarregam (usamos o snapshot atual)
      try {
        await store.save(structuredClone(current));
      } catch {
        /* best-effort */
      }
    },
  };
}
