import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "list-users" | "remove-from-company" | "delete-user" | "check-super-admin";
  userId?: string;
  companyId?: string;
}

const describeError = (err: unknown) => {
  try {
    if (!err) return { raw: err };
    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack,
        // deno-lint-ignore no-explicit-any
        cause: (err as any).cause,
      };
    }

    // Supabase errors sometimes have non-enumerable props -> JSON.stringify becomes {}
    // deno-lint-ignore no-explicit-any
    const e: any = err;
    const keys = Object.getOwnPropertyNames(e);
    const picked: Record<string, unknown> = {};
    for (const k of keys) picked[k] = e[k];

    return {
      type: typeof err,
      keys,
      picked,
      toString: typeof e?.toString === "function" ? e.toString() : undefined,
    };
  } catch (e) {
    return { fallback: String(err), describeErrorError: String(e) };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Extrair usuário do token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verificar se é super admin
    const { data: superAdminCheck } = await supabase
      .from("super_admins")
      .select("id")
      .eq("email", user.email)
      .single();

    const { action, userId, companyId }: RequestBody = await req.json();

    // Check super admin - não precisa ser super admin pra verificar
    if (action === "check-super-admin") {
      return new Response(JSON.stringify({
        isSuperAdmin: !!superAdminCheck,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Todas as outras ações precisam ser super admin
    if (!superAdminCheck) {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas super admins." }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "list-users") {
      // Listar todos os usuários com suas empresas
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        throw new Error(`Erro ao listar usuários: ${authError.message}`);
      }

      // Buscar profiles
      const userIds = authUsers.users.map(u => u.id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Buscar membros de empresas
      const { data: memberships } = await supabase
        .from("company_members")
        .select("user_id, company_id, role, companies!inner(id, name)")
        .in("user_id", userIds);

      // Buscar todas as empresas
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name");

      const companiesMap = new Map(companies?.map(c => [c.id, c.name]) || []);

      // Montar resposta
      const usersWithCompanies = authUsers.users.map(u => {
        const profile = profilesMap.get(u.id);
        const userMemberships = memberships?.filter(m => m.user_id === u.id) || [];
        
        return {
          id: u.id,
          email: u.email,
          full_name: profile?.full_name || "Sem nome",
          avatar_url: profile?.avatar_url,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          companies: userMemberships.map(m => ({
            id: m.company_id,
            name: companiesMap.get(m.company_id) || "Empresa desconhecida",
            role: m.role,
          })),
        };
      });

      return new Response(JSON.stringify({
        users: usersWithCompanies,
        totalUsers: usersWithCompanies.length,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "remove-from-company") {
      if (!userId || !companyId) {
        return new Response(JSON.stringify({ error: "userId e companyId são obrigatórios" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Remover de company_members
      const { error: memberError } = await supabase
        .from("company_members")
        .delete()
        .eq("user_id", userId)
        .eq("company_id", companyId);

      if (memberError) {
        throw new Error(`Erro ao remover membro: ${memberError.message}`);
      }

      // Também remover de employees se existir
      await supabase
        .from("employees")
        .delete()
        .eq("user_id", userId)
        .eq("company_id", companyId);

      return new Response(JSON.stringify({
        success: true,
        message: "Usuário removido da empresa com sucesso",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "delete-user") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId é obrigatório" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Sanity-check: user exists in Auth
      const { data: userLookup, error: userLookupError } = await supabase.auth.admin.getUserById(userId);
      if (userLookupError) {
        console.error("Erro no super-admin: getUserById falhou", describeError(userLookupError));
        return new Response(
          JSON.stringify({ error: "Erro ao buscar usuário no Auth", details: describeError(userLookupError) }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
      if (!userLookup?.user) {
        return new Response(JSON.stringify({ error: "Usuário não encontrado no Auth" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // As FKs agora têm ON DELETE CASCADE ou SET NULL, então só precisamos limpar
      // tabelas que não têm FK direta ao auth.users mas têm user_id como referência lógica.
      // 1. Remover de company_members
      await supabase
        .from("company_members")
        .delete()
        .eq("user_id", userId);

      // 2. Remover de employees
      await supabase
        .from("employees")
        .delete()
        .eq("user_id", userId);

      // 3. Remover profile
      await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId);

      // 4. Deletar usuário do auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
      
      if (deleteError) {
        const details = describeError(deleteError);
        console.error("Erro no super-admin: deleteUser falhou", details);
        return new Response(
          JSON.stringify({ error: "Erro ao deletar usuário", details }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Usuário deletado completamente do sistema",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Erro no super-admin:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
