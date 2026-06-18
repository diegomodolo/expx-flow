import {
  createSupabaseMgmtClient,
  SupabaseMgmtError,
} from "./_lib/supabase-mgmt";
import {
  applyCors,
  isOptions,
  readJsonBody,
  type VercelRequest,
  type VercelResponse,
} from "./_lib/http";

export interface ListOrgsBody {
  supabaseToken?: string;
}

export interface ListOrgsResult {
  orgs: Array<{ id: string; name: string }>;
}

/**
 * POST /api/installer/list-orgs
 *
 * Recebe `{ supabaseToken }` no body e retorna as organizações acessíveis:
 * `{ orgs: [{ id, name }] }`. Token **só em memória** da request.
 *
 * - token inválido → 401 com mensagem PT-BR
 * - falha de upstream (5xx/rede) → 502 com mensagem PT-BR (nunca 500)
 * - body ausente → 400 PT-BR.
 */
export default async function listOrgsHandler(
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

  let body: ListOrgsBody;
  try {
    body = (await readJsonBody(req)) as ListOrgsBody;
  } catch {
    res
      .status(400)
      .json({ error: "Corpo da requisição inválido (JSON esperado)." });
    return;
  }

  const supabaseToken = body?.supabaseToken;
  if (!supabaseToken) {
    res.status(400).json({ error: "Token do Supabase é obrigatório." });
    return;
  }

  const client = createSupabaseMgmtClient({ token: supabaseToken });
  try {
    const orgs = await client.listOrgs();
    const result: ListOrgsResult = {
      orgs: orgs.map((o) => ({ id: o.id, name: o.name })),
    };
    res.status(200).json(result);
  } catch (err) {
    const isAuth = err instanceof SupabaseMgmtError && err.status === 401;
    if (isAuth) {
      res
        .status(401)
        .json({ error: "Token do Supabase inválido ou expirado." });
      return;
    }
    res.status(502).json({
      error:
        "Não foi possível listar as organizações do Supabase no momento. Tente novamente.",
    });
  }
}
