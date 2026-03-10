import { vi } from "vitest";

export function createMockSupabaseChain(
  resolvedValue: { data: unknown; error: unknown } = {
    data: null,
    error: null,
  },
) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  const terminalMethods = ["single", "maybeSingle"];
  for (const method of terminalMethods) {
    chain[method] = vi.fn().mockResolvedValue(resolvedValue);
  }

  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "is",
    "not",
    "or",
    "filter",
    "match",
    "order",
    "limit",
    "range",
    "textSearch",
  ];

  for (const method of chainMethods) {
    chain[method] = vi.fn().mockReturnValue(
      new Proxy(chain, {
        get(target, prop) {
          if (prop === "then") {
            return (resolve: (value: unknown) => void) =>
              resolve(resolvedValue);
          }
          return target[prop as string];
        },
      }),
    );
  }

  return chain;
}

export function createMockSupabase() {
  const chain = createMockSupabaseChain();

  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      startAutoRefresh: vi.fn().mockResolvedValue(undefined),
      stopAutoRefresh: vi.fn().mockResolvedValue(undefined),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    _chain: chain,
  };
}
