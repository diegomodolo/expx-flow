import {
  createSupabaseMgmtClient,
  SupabaseMgmtError,
} from "./_lib/supabase-mgmt";
import { createVercelClient, VercelApiError } from "./_lib/vercel-api";
import {
  applyCors,
  isOptions,
  readJsonBody,
  type VercelRequest,
  type VercelResponse,
} from "./_lib/http";

export interface ValidateTokensBody {
  vercelToken?: string;
  supabaseToken?: string;
}

export interface ValidateTokensResult {
  vercel: boolean;
  supabase: boolean;
  error?: string;
}

/**
 * POST /api/installer/validate-tokens
 *
 * Recebe `{ vercelToken, supabaseToken }` no body e valida ambos em paralelo
 * (`Promise.allSettled`). Tokens **só em memória** da request — nunca
 * persistidos, logados ou devolvidos na resposta.
 *
 * Resposta 200 sempre que chega aos wrappers (nunca 500):
 *  - ambos válidos → `{ vercel: true, supabase: true }`
 *  - algum inválido → `{ vercel, supabase, error: "msg PT-BR" }`
 *  - body ausente/malformado → 400 com erro PT-BR.
 */
export default async function validateTokensHandler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  applyCors(res);
  res.setHeader("Cache-Control", "no-store");

  if (isOptions(req)) {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  let body: ValidateTokensBody;
  try {
    body = (await readJsonBody(req)) as ValidateTokensBody;
  } catch {
    res
      .status(400)
      .json({ error: "Corpo da requisição inválido (JSON esperado)." });
    return;
  }

  const vercelToken = body?.vercelToken;
  const supabaseToken = body?.supabaseToken;
  // Permite validar apenas UM token (wizard tem passos separados por token).
  // Rejeita 400 somente quando AMBOS estão ausentes — mantém o contrato
  // existente (unit test "tokens ausentes → 400").
  if (!vercelToken && !supabaseToken) {
    res.status(400).json({
      error:
        "Tokens são obrigatórios. Envie { vercelToken, supabaseToken } no corpo.",
    });
    return;
  }

  const vercelClient = vercelToken
    ? createVercelClient({ token: vercelToken })
    : null;
  const supabaseClient = supabaseToken
    ? createSupabaseMgmtClient({ token: supabaseToken })
    : null;

  const [vercelResult, supabaseResult] = await Promise.allSettled([
    vercelClient ? vercelClient.validateToken() : Promise.resolve(null),
    supabaseClient ? supabaseClient.listOrgs() : Promise.resolve(null),
  ]);

  // Token não-enviado (null) → considerado válido neutro (não bloqueia o
  // passo do token que foi validado). Cada passo do wizard revalida o seu.
  const vercelOk = vercelClient ? vercelResult.status === "fulfilled" : true;
  const supabaseOk = supabaseClient
    ? supabaseResult.status === "fulfilled"
    : true;

  const errors: string[] = [];
  if (vercelClient && !vercelOk) {
    const reason = (vercelResult as PromiseRejectedResult).reason;
    const status = reason instanceof VercelApiError ? reason.status : 0;
    errors.push(
      status === 401
        ? "Token da Vercel inválido ou expirado."
        : "Não foi possível validar o token da Vercel. Verifique e tente novamente.",
    );
  }
  if (supabaseClient && !supabaseOk) {
    const reason = (supabaseResult as PromiseRejectedResult).reason;
    const status = reason instanceof SupabaseMgmtError ? reason.status : 0;
    errors.push(
      status === 401
        ? "Token do Supabase inválido ou expirado."
        : "Não foi possível validar o token do Supabase. Verifique e tente novamente.",
    );
  }

  const result: ValidateTokensResult = {
    vercel: vercelOk,
    supabase: supabaseOk,
  };
  if (errors.length > 0) result.error = errors.join(" ");

  res.status(200).json(result);
}
