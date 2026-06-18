import { beforeEach, describe, expect, it } from "vitest";
import {
  createInitialProgress,
  createInMemoryProgressStore,
  createProgressService,
  STEPS,
  type InstallProgress,
  type ProgressStore,
} from "../progress";

/**
 * Store fake que simula persistência (mantém o último estado salvo em memória
 * separada da instância do service — testa que load relê o que foi salvo).
 */
function createFakePersistentStore(): ProgressStore & {
  saved: InstallProgress[];
  raw: InstallProgress | null;
} {
  let raw: InstallProgress | null = null;
  return {
    raw: null as InstallProgress | null,
    saved: [],
    async load() {
      return raw ? structuredClone(raw) : null;
    },
    async save(p) {
      raw = structuredClone(p);
      this.saved.push(structuredClone(p));
    },
  };
}

describe("InstallProgress — estado inicial", () => {
  it("loadProgress em store vazio retorna estado inicial com arrays vazios", async () => {
    const service = createProgressService({
      store: createInMemoryProgressStore(),
    });
    const p = await service.loadProgress();
    expect(p.completedSteps).toEqual([]);
    expect(p.functions).toEqual([]);
    expect(typeof p.startedAt).toBe("number");
    expect(typeof p.updatedAt).toBe("number");
    expect(p.projectRef).toBeUndefined();
  });

  it("createInitialProgress expõe todas as chaves esperadas", () => {
    const p = createInitialProgress();
    expect(p.completedSteps).toEqual([]);
    expect(p.functions).toEqual([]);
    expect(p.startedAt).toBeGreaterThan(0);
    expect(p.updatedAt).toBeGreaterThan(0);
  });
});

describe("InstallProgress — markStep (idempotente)", () => {
  let service: ReturnType<typeof createProgressService>;
  beforeEach(() => {
    service = createProgressService({
      store: createInMemoryProgressStore(),
    });
  });

  it("marca um step concluído e completedSteps contém o step", async () => {
    await service.markStep("create-project");
    expect(service.snapshot().completedSteps).toContain("create-project");
    expect(service.isStepDone("create-project")).toBe(true);
  });

  it("completedSteps acumula vários steps sem duplicar", async () => {
    await service.markStep("create-project");
    await service.markStep("apply-schema");
    await service.markStep("set-secrets");
    const steps = service.snapshot().completedSteps;
    expect(steps).toEqual(["create-project", "apply-schema", "set-secrets"]);
    expect(new Set(steps).size).toBe(steps.length);
  });

  it("marcar o mesmo step 2x NÃO duplica (idempotente)", async () => {
    await service.markStep("apply-schema");
    await service.markStep("apply-schema");
    await service.markStep("apply-schema");
    const steps = service
      .snapshot()
      .completedSteps.filter((s) => s === "apply-schema");
    expect(steps.length).toBe(1);
  });

  it("markStep aceita patch para gravar projectRef e outras chaves", async () => {
    await service.markStep("create-project", {
      projectRef: "ref-123",
      projectAnonKey: "anon-abc",
    });
    const snap = service.snapshot();
    expect(snap.projectRef).toBe("ref-123");
    expect(snap.projectAnonKey).toBe("anon-abc");
  });
});

describe("InstallProgress — markFunctionDeployed (idempotente)", () => {
  let service: ReturnType<typeof createProgressService>;
  beforeEach(() => {
    service = createProgressService({
      store: createInMemoryProgressStore(),
    });
  });

  it("adiciona nome da function e é idempotente", async () => {
    await service.markFunctionDeployed("ai-chat");
    await service.markFunctionDeployed("ai-chat");
    await service.markFunctionDeployed("check-user");
    const fns = service.snapshot().functions;
    expect(fns).toEqual(["ai-chat", "check-user"]);
    expect(new Set(fns).size).toBe(fns.length);
  });

  it("isFunctionDeployed responde corretamente", async () => {
    expect(service.isFunctionDeployed("ai-chat")).toBe(false);
    await service.markFunctionDeployed("ai-chat");
    expect(service.isFunctionDeployed("ai-chat")).toBe(true);
    expect(service.isFunctionDeployed("check-user")).toBe(false);
  });
});

describe("InstallProgress — persistência relê o que foi salvo", () => {
  it("load após save retorna o estado gravado (store persistente fake)", async () => {
    const store = createFakePersistentStore();
    const svc1 = createProgressService({ store });
    await svc1.loadProgress();
    await svc1.markStep("create-project", { projectRef: "ref-xyz" });
    await svc1.markFunctionDeployed("ai-chat");

    // Nova instância APONTANDO PARA O MESMO STORE relê o estado persistido.
    const svc2 = createProgressService({ store });
    const reloaded = await svc2.loadProgress();
    expect(reloaded.completedSteps).toContain("create-project");
    expect(reloaded.functions).toContain("ai-chat");
    expect(reloaded.projectRef).toBe("ref-xyz");
  });

  it("loadProgress em store vazio zera o snapshot (resume limpo)", async () => {
    const store = createFakePersistentStore();
    const svc = createProgressService({ store });
    const p = await svc.loadProgress();
    expect(p.completedSteps).toEqual([]);
    expect(p.functions).toEqual([]);
  });

  it("save NUNCA persiste tokens (campo proibido ausente do snapshot)", async () => {
    const store = createFakePersistentStore();
    const svc = createProgressService({ store });
    await svc.loadProgress();
    await svc.markStep("create-project", { projectRef: "ref-1" });
    const persisted = store.saved.at(-1)!;
    const json = JSON.stringify(persisted);
    // Nenhum nome de campo de token pode aparecer.
    expect(json).not.toMatch(
      /token|supabaseToken|vercelToken|serviceRoleKey|dbPassword/i,
    );
  });
});

describe("InstallProgress — STEPS constant", () => {
  it("contém os 6 steps esperados na ordem do instalador", () => {
    expect(STEPS).toEqual([
      "create-project",
      "apply-schema",
      "deploy-functions",
      "set-secrets",
      "write-vercel-env",
      "trigger-redeploy",
    ]);
  });
});
