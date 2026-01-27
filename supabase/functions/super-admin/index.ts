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

      // IMPORTANTE:
      // O supabase.auth.admin.deleteUser pode falhar com "Database error deleting user"
      // quando existem FKs em tabelas do schema public apontando para auth.users sem ON DELETE CASCADE.
      // Então, antes de deletar o usuário no Auth, limpamos/neutralizamos essas referências.
      const safeUpdateNull = async (table: string, column: string) => {
        const payload: Record<string, null> = { [column]: null };
        const { error } = await supabase.from(table).update(payload).eq(column, userId);
        if (error) {
          console.warn(`Aviso: falha ao NULL em ${table}.${column} para user ${userId}:`, error);
        }
      };

      const safeDeleteWhere = async (table: string, column: string) => {
        const { error } = await supabase.from(table).delete().eq(column, userId);
        if (error) {
          console.warn(`Aviso: falha ao deletar em ${table} onde ${column}=${userId}:`, error);
        }
      };

      // Colunas NULLABLE com FK NO ACTION => setar NULL para preservar registros
      await safeUpdateNull("super_admins", "created_by");
      await safeUpdateNull("client_health_config", "cs_manager_id");
      await safeUpdateNull("client_touchpoints", "created_by");
      await safeUpdateNull("creative_versions", "replaced_by");
      await safeUpdateNull("crm_boards", "created_by");
      await safeUpdateNull("crm_contacts", "created_by");
      await safeUpdateNull("crm_deal_activities", "created_by");
      await safeUpdateNull("crm_deals", "created_by");
      await safeUpdateNull("crm_lead_links", "created_by");
      await safeUpdateNull("crm_workspace_goals", "created_by");
      await safeUpdateNull("crm_workspaces", "created_by");
      await safeUpdateNull("editor_element_library", "created_by");
      await safeUpdateNull("instagram_autopost_knowledge_files", "created_by");
      await safeUpdateNull("instagram_autopost_knowledge_videos", "created_by");

      // Colunas NOT NULL com FK NO ACTION => precisa deletar para liberar a exclusão do Auth
      await safeDeleteWhere("acquisition_funnels", "user_id");
      await safeDeleteWhere("change_audit_log", "changed_by");
      await safeDeleteWhere("ia_agent_knowledge_documents", "uploaded_by");
      await safeDeleteWhere("wordpress_auto_post_configs", "created_by");
      await safeDeleteWhere("wordpress_sites", "created_by");

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
        const details = typeof deleteError === "object" ? JSON.stringify(deleteError) : String(deleteError);
        throw new Error(`Erro ao deletar usuário: ${deleteError.message || details}`);
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
