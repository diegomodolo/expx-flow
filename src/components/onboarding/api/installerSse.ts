/**
 * Consumidor de SSE via `fetch` + `ReadableStream` para o endpoint
 * `POST /api/installer/run`.
 *
 * Por que não `EventSource`?
 *  - `EventSource` só faz GET, sem corpo. O `run` recebe tokens e opções
 *    sensíveis no corpo do POST (não podem ir em query string — vazam em
 *    logs de proxy/CDN).
 *  - Com `fetch` + `ReadableStream` controlamos o body do POST e parseamos
 *    o stream `text/event-stream` manualmente (formato `data: {...}\n\n`).
 *
 * Referência: docs/onboarding-installer/SPRINT-3-wizard-admin-e2e.md (Fase 3.1.3)
 */

export interface SseEvent {
  step?: string;
  status?: "started" | "completed" | "error" | "skipped" | "partial" | "done";
  pct?: number;
  message?: string;
  resumeFrom?: string;
  progress?: unknown;
  done?: boolean;
  detail?: unknown;
}

export interface RunInput {
  vercelToken: string;
  supabaseToken: string;
  options: {
    orgId: string;
    projectName: string;
    dbPassword: string;
    vercelProjectId?: string;
    region?: string;
    plan?: string;
    functionsBatchSize?: number;
  };
  progress?: unknown;
  reinstall?: boolean;
}

export interface RunHandlers {
  onEvent: (event: SseEvent) => void;
  onError?: (error: Error) => void;
}

/**
 * Abre o stream SSE. Retorna uma função `cancel()` para abortar a conexão.
 *
 * O `run` sempre envia um evento terminal `{ done: true, status }` ao final
 * (done/partial/error). Para `partial`, o chamador deve reinvocar `runStream`
 * enviando `progress` de volta (resume automático até done).
 */
export function runStream(input: RunInput, handlers: RunHandlers): () => void {
  const controller = new AbortController();
  const decoder = new TextDecoder();
  let buffer = "";

  void (async () => {
    try {
      const res = await fetch("/api/installer/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let message = `Erro ${res.status} ao iniciar a instalação.`;
        try {
          const parsed = JSON.parse(text) as { error?: string };
          if (parsed?.error) message = parsed.error;
        } catch {
          /* mantém mensagem default */
        }
        handlers.onError?.(new Error(message));
        handlers.onEvent({
          step: "global",
          status: "error",
          pct: 0,
          message,
          done: true,
        });
        return;
      }

      const body = res.body;
      if (!body) {
        const message = "Resposta sem corpo (stream ausente).";
        handlers.onError?.(new Error(message));
        return;
      }

      const reader = body.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        // Eventos são separados por `\n\n`.
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const event = parseSseBlock(block);
          if (event) handlers.onEvent(event);
        }
      }
      // Flush final (caso o servidor não termine com `\n\n`).
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data:")) {
        const event = parseSseBlock(trimmed);
        if (event) handlers.onEvent(event);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof Error
          ? err.message
          : "Falha de conexão com o instalador.";
      handlers.onError?.(new Error(message));
      handlers.onEvent({
        step: "global",
        status: "error",
        pct: 0,
        message,
        done: true,
      });
    }
  })();

  return () => controller.abort();
}

function parseSseBlock(block: string): SseEvent | null {
  const lines = block.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const raw = trimmed.slice("data:".length).trim();
    if (!raw) continue;
    try {
      return JSON.parse(raw) as SseEvent;
    } catch {
      /* ignora bloco malformado */
    }
  }
  return null;
}
