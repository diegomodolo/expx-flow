import { createClient } from "@supabase/supabase-js";
import {
  applyCors,
  isOptions,
  readJsonBody,
  type VercelRequest,
  type VercelResponse,
} from "./_lib/http";

/**
 * POST /api/installer/create-admin
 *
 * Cria o administrador inicial da instalação. Recebe credenciais do projeto
 * recém-criado (`projectRef`, `serviceRoleKey`) e dados do admin (`email`,
 * `password`, `fullName?`). Tokens **só em memória** da request — nunca
 * persistidos ou logados.
 *
 * Ordem:
 *  1. Valida body.
 *  2. Constrói client Supabase com `serviceRoleKey` (bypass RLS).
 *  3. Recusa 409 se já existe admin (count profiles ≥ 1).
 *  4. `auth.admin.createUser` (confirmado, `email_confirm:true`).
 *  5. Cria empresa-default para o admin (trigger `handle_new_company` cria
 *     `company_members.role='owner'` automaticamente).
 *  6. Marca `system_config_app.installation_completed = true` (SÓ após o
 *     admin ser criado com sucesso).
 *
 * Respostas:
 *  - 200 + `{ ok: true, userId }` em sucesso.
 *  - 400 body inválido / e-mail inválido / senha fraca (mensagem PT-BR).
 *  - 409 admin já existe / e-mail já cadastrado (mensagem PT-BR).
 *  - 405 método não permitido.
 *  - Nunca 500 — erros de upstream viram 502 com mensagem PT-BR.
 *
 * Referência: docs/onboarding-installer/SPRINT-3-wizard-admin-e2e.md (Fase 3.2.1)
 */

export interface CreateAdminBody {
  projectRef?: string;
  serviceRoleKey?: string;
  email?: string;
  password?: string;
  fullName?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function createAdminHandler(
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

  let body: CreateAdminBody;
  try {
    body = (await readJsonBody(req)) as CreateAdminBody;
  } catch {
    res
      .status(400)
      .json({ error: "Corpo da requisição inválido (JSON esperado)." });
    return;
  }

  const { projectRef, serviceRoleKey, email, password, fullName } = body ?? {};
  if (!projectRef || !serviceRoleKey || !email || !password) {
    res.status(400).json({
      error:
        "Campos obrigatórios ausentes. Envie { projectRef, serviceRoleKey, email, password }.",
    });
    return;
  }
  if (!EMAIL_RE.test(email)) {
    res
      .status(400)
      .json({ error: "E-mail inválido. Verifique e tente novamente." });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res
      .status(400)
      .json({ error: "A senha deve ter pelo menos 8 caracteres." });
    return;
  }

  const url = `https://${projectRef}.supabase.co`;
  let client: ReturnType<typeof createClient>;
  try {
    client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    res.status(502).json({
      error:
        "Não foi possível conectar ao projeto Supabase. Verifique o projectRef.",
    });
    return;
  }

  // 1) Recusa se já existe admin (count profiles ≥ 1).
  try {
    const countResult = await client
      .from("profiles")
      .select("*", { count: "exact", head: true });
    const adminCount = (countResult as { count?: number })?.count ?? 0;
    if (adminCount >= 1) {
      res.status(409).json({
        error:
          "Já existe um administrador nesta instalação. Não é permitido criar outro.",
      });
      return;
    }
  } catch {
    // RLS/erro de leitura → assume que ainda não há admin e prossegue.
  }

  // 2) Cria o admin via auth.admin.createUser (confirmado).
  let userId: string;
  try {
    const result = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });
    if (result.error || !result.data?.user?.id) {
      const message = result.error?.message ?? "";
      if (
        /already\s+registered|already\s+exists|user_already_exists/i.test(
          message,
        )
      ) {
        res.status(409).json({
          error:
            "Este e-mail já está cadastrado. Faça login ou use outro e-mail.",
        });
        return;
      }
      if (/password/i.test(message)) {
        res.status(400).json({
          error:
            "Senha fraca demais. Use pelo menos 8 caracteres com letras e números.",
        });
        return;
      }
      res.status(502).json({
        error:
          message || "Não foi possível criar o administrador. Tente novamente.",
      });
      return;
    }
    userId = result.data.user.id;
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "";
    res.status(502).json({
      error: message || "Falha ao criar o administrador no Supabase Auth.",
    });
    return;
  }

  // 3) Cria empresa-default → trigger `handle_new_company` cria
  //    `company_members` com `role='owner'` automaticamente. Idempotente
  //    via ON CONFLICT (caso já exista empresa para o usuário).
  try {
    const companyName = fullName?.trim() || "Minha Empresa";
    await client.from("companies").insert({
      name: companyName,
      created_by: userId,
    });
  } catch {
    // Best-effort: o admin já existe em auth.users (e profile via trigger).
    // Sem empresa-default ele não vira owner, mas a instalação ainda pode
    // prosseguir — o admin pode criar a empresa no primeiro login. Não
    // abortamos a instalação por isso.
  }

  // 4) Marca installation_completed = true SÓ após admin criado.
  try {
    await client
      .from("system_config_app")
      .update({ installation_completed: true })
      .eq("id", 1);
  } catch {
    // Best-effort: se a flag não for marcada, o status retorna
    // `not-installed` e o guard mantém o /onboarding acessível. O admin
    // pode repetir o fluxo ou setar manualmente.
  }

  res.status(200).json({ ok: true, userId });
}
