import { SupabaseClient } from "@supabase/supabase-js";

export async function invokeWithRetry(
  supabase: SupabaseClient,
  functionName: string,
  options: { body: unknown },
  maxRetries = 1,
) {
  let lastError: Error | null = null;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const { data, error } = await supabase.functions.invoke(
        functionName,
        options,
      );
      if (error) throw error;
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  throw lastError;
}

export function getEdgeFunctionErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes("Failed to send a request") ||
    msg.includes("FunctionsFetchError")
  ) {
    return "Erro de conexão com o servidor. Verifique sua internet e tente novamente.";
  }
  if (
    msg.includes("non-2xx status code") ||
    msg.includes("FunctionsHttpError")
  ) {
    return "O servidor retornou um erro. Tente novamente em alguns segundos.";
  }
  return msg;
}
