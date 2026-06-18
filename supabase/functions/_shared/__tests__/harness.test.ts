// Smoke test para o mock do Supabase
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mockSupabase } from "./mockSupabase.ts";

Deno.test("mockSupabase: select * maybeSingle retorna seed", async () => {
  const mock = mockSupabase({
    system_config_ai: {
      id: 1,
      openrouter_api_key: "x",
    },
  });
  const { data } = await mock
    .from("system_config_ai")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  assertEquals(data?.openrouter_api_key, "x");
});

Deno.test("mockSupabase: select vazio retorna null", async () => {
  const mock = mockSupabase({});
  const { data } = await mock
    .from("system_config_ai")
    .select("*")
    .maybeSingle();
  assertEquals(data, null);
});

Deno.test("mockSupabase: update atualiza seed", async () => {
  const mock = mockSupabase({
    system_config_email: { id: 1, from_email: "old@x.com" },
  });
  await mock
    .from("system_config_email")
    .update({ from_email: "new@x.com" })
    .eq("id", 1);
  const { data } = await mock
    .from("system_config_email")
    .select("*")
    .maybeSingle();
  assertEquals(data?.from_email, "new@x.com");
});

Deno.test("mockSupabase: select com colunas específicas", async () => {
  const mock = mockSupabase({
    system_config_facebook: {
      id: 1,
      app_id: "fb-id",
      app_secret: "fb-secret",
      graph_api_version: "v21.0",
    },
  });
  const { data } = await mock
    .from("system_config_facebook")
    .select("app_id, graph_api_version")
    .maybeSingle();
  assertEquals(data?.app_id, "fb-id");
  assertEquals(data?.graph_api_version, "v21.0");
  // app_secret não foi pedido
  if ("app_secret" in (data || {})) {
    throw new Error("não deveria trazer app_secret");
  }
});

Deno.test("mockSupabase: insert cria linha se não existia", async () => {
  const mock = mockSupabase({});
  await mock.from("system_config_ai").insert({
    id: 1,
    openrouter_api_key: "inserida",
  });
  const { data } = await mock
    .from("system_config_ai")
    .select("*")
    .maybeSingle();
  assertEquals(data?.openrouter_api_key, "inserida");
});
