import {
  applyCors,
  isOptions,
  readJsonBody,
  type VercelRequest,
  type VercelResponse,
} from "./_lib/http";
import { runInstaller, type RunInstallerInput } from "./_lib/run";
import { STEPS, type InstallProgress } from "./_lib/progress";
import type { RunOptions, SseEvent } from "./_lib/steps";

/**
 * POST /api/installer/run
 *
 * Orquestra a instalação completa via SSE (text/event-stream). O cliente abre
 * a conexão e recebe eventos `{ step, status, pct, message?, resumeFrom? }`.
 *
 * Body:
 *  - `vercelToken`, `supabaseToken` (efêmeros, só em memória)
 *  - `options: { orgId, projectName, dbPassword, vercelProjectId?, ... }`
 *  - `progress?: InstallProgress` (resume — cliente reenvia o último progress)
 *  - `reinstall?: boolean` (default false)
 *
 * Respostas:
 *  - 200 + stream SSE (eventos por step; terminal `{ status, progress }`)
 *  - 409 se instalação já concluída e sem `reinstall`
 *  - 400 se body inválido/faltando campos obrigatórios
 *  - 405 se não POST
 *
 * Tokens NUNCA são persistidos, logados ou devolvidos na resposta.
 */
export interface RunRequestBody {
  vercelToken?: string;
  supabaseToken?: string;
  options?: Partial<RunOptions>;
  progress?: InstallProgress;
  reinstall?: boolean;
}

interface SseResponse extends VercelResponse {
  write?: (chunk: string | Buffer) => boolean;
  writeHead?: (statusCode: number, headers?: Record<string, string>) => void;
}

function sendSse(res: SseResponse, event: Record<string, unknown>): void {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  if (typeof res.write === "function") res.write(line);
}

function isFullyDone(progress?: InstallProgress | null): boolean {
  if (!progress) return false;
  return STEPS.every((s) => progress.completedSteps.includes(s));
}

export default async function runHandler(
  req: VercelRequest,
  res: SseResponse,
): Promise<void> {
  applyCors(res);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Connection", "keep-alive");

  if (isOptions(req)) {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  let body: RunRequestBody;
  try {
    body = (await readJsonBody(req)) as RunRequestBody;
  } catch {
    res
      .status(400)
      .json({ error: "Corpo da requisição inválido (JSON esperado)." });
    return;
  }

  const vercelToken = body?.vercelToken;
  const supabaseToken = body?.supabaseToken;
  const options = body?.options ?? {};

  if (!vercelToken || !supabaseToken) {
    res.status(400).json({
      error:
        "Tokens são obrigatórios. Envie { vercelToken, supabaseToken } no corpo.",
    });
    return;
  }
  if (!options.orgId || !options.projectName || !options.dbPassword) {
    res
      .status(400)
      .json({
        error:
          "options.orgId, options.projectName e options.dbPassword são obrigatórios.",
      });
    return;
  }

  // Bloqueio de reinstalação (409) — checa se o progress indica instalação
  // concluída (todos os steps) ou se uma flag externa diz (isAlreadyCompleted).
  if (isFullyDone(body.progress) && !body.reinstall) {
    res.status(409).json({
      error:
        "Instalação já concluída nesta instância. Use ?reinstall=1 para reinstalar.",
    });
    return;
  }

  // Abre o stream SSE.
  res.setHeader("Content-Type", "text/event-stream");
  if (typeof res.writeHead === "function") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
  }

  const emit = (event: SseEvent) => {
    sendSse(res, event as unknown as Record<string, unknown>);
  };

  try {
    const result = await runInstaller({
      vercelToken,
      supabaseToken,
      options: options as RunOptions,
      initialProgress: body.progress,
      reinstall: body.reinstall === true,
      onEvent: emit,
    });

    // Evento terminal fecha o stream.
    sendSse(res, {
      step: "global",
      status: result.status,
      pct:
        result.status === "done"
          ? 100
          : Math.round(
              (result.progress.completedSteps.length / STEPS.length) * 100,
            ),
      message:
        result.status === "done"
          ? "Instalação concluída."
          : result.status === "partial"
            ? `Retome a partir de "${result.resumeFrom}".`
            : (result.error?.message ?? "Erro durante a instalação."),
      resumeFrom: result.resumeFrom,
      progress: result.progress,
      done: true,
    });
  } catch (err) {
    sendSse(res, {
      step: "global",
      status: "error",
      pct: 0,
      message:
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Erro inesperado durante a instalação.",
      done: true,
    });
  } finally {
    if (typeof res.end === "function") res.end();
  }
}
