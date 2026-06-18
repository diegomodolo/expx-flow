// Tests for getSystemConfig / resolveCredential / getAppUrl
import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  buildAppLink,
  getAppUrl,
  getSystemConfig,
  resolveCredential,
  resolveCredentialOptional,
  type SystemConfigAI,
} from "../getSystemConfig.ts";
import { mockSupabase } from "./mockSupabase.ts";

Deno.test(
  "getSystemConfig: retorna linha do seed quando tabela existe",
  async () => {
    const mock = mockSupabase({
      system_config_ai: {
        id: 1,
        openrouter_api_key: "or-123",
        openai_api_key: null,
      },
    });
    const cfg = await getSystemConfig<SystemConfigAI>(mock, "ai");
    assertEquals(cfg?.openrouter_api_key, "or-123");
    assertEquals(cfg?.openai_api_key, null);
  },
);

Deno.test("getSystemConfig: retorna null quando tabela vazia", async () => {
  const mock = mockSupabase({});
  const cfg = await getSystemConfig(mock, "ai");
  assertEquals(cfg, null);
});

Deno.test(
  "getSystemConfig: retorna null quando select dispara exceção",
  async () => {
    const broken = {
      from() {
        throw new Error("connection refused");
      },
    };
    const cfg = await getSystemConfig(broken, "ai");
    assertEquals(cfg, null);
  },
);

Deno.test("resolveCredential: env vence banco (env > banco)", () => {
  const v = resolveCredential("env-key", "db-key", "erro");
  assertEquals(v, "env-key");
});

Deno.test("resolveCredential: usa banco quando env ausente", () => {
  const v = resolveCredential(undefined, "db-key", "erro");
  assertEquals(v, "db-key");
});

Deno.test(
  "resolveCredential: lança com mensagem PT-BR quando ambos ausentes",
  () => {
    let err: Error | null = null;
    try {
      resolveCredential("", null, "Configure em Configurações > Sistema.");
    } catch (e) {
      err = e as Error;
    }
    if (!err) throw new Error("esperava erro");
    if (!/Configura\u00e7\u00f5es > Sistema/.test(err.message)) {
      throw new Error(`mensagem errada: ${err.message}`);
    }
  },
);

Deno.test("resolveCredential: trim de espaços", () => {
  assertEquals(resolveCredential("  x  ", null, "e"), "x");
  assertEquals(resolveCredential(undefined, "  y ", "e"), "y");
});

Deno.test(
  "resolveCredentialOptional: retorna null quando ambos ausentes",
  () => {
    assertEquals(resolveCredentialOptional("", null), null);
    assertEquals(resolveCredentialOptional(undefined, undefined), null);
  },
);

Deno.test("resolveCredentialOptional: ainda faz env > banco", () => {
  assertEquals(resolveCredentialOptional("env", "db"), "env");
  assertEquals(resolveCredentialOptional(undefined, "db"), "db");
});

Deno.test("getAppUrl: prioriza config.app_url", () => {
  const req = new Request("https://example.com");
  const url = getAppUrl(
    { app_url: "https://app.example.com/", app_name: null },
    req,
  );
  assertEquals(url, "https://app.example.com");
});

Deno.test("getAppUrl: cai para header origin quando config ausente", () => {
  const req = new Request("https://dynamic.example.com", {
    headers: { origin: "https://dynamic.example.com" },
  });
  const url = getAppUrl(null, req);
  assertEquals(url, "https://dynamic.example.com");
});

Deno.test("getAppUrl: cai para fallback quando nada disponível", () => {
  const req = new Request("https://x.com");
  const url = getAppUrl(null, req, "https://fallback.com/");
  assertEquals(url, "https://fallback.com");
});

Deno.test("buildAppLink: junta base + path", () => {
  const req = new Request("https://x.com");
  const link = buildAppLink(
    { app_url: "https://app.com", app_name: null },
    req,
    "/auth/callback",
  );
  assertEquals(link, "https://app.com/auth/callback");
});

Deno.test("buildAppLink: path relativo quando sem base", () => {
  const req = new Request("https://x.com");
  const link = buildAppLink(null, req, "/auth/callback");
  assertEquals(link, "/auth/callback");
});
