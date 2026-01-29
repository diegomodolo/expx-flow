import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  userId: string;
  newPassword: string;
  employeeName: string;
  employeeEmail: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verificar autenticação do usuário que está fazendo a requisição
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    // Criar cliente com token do usuário para verificar permissões
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !requestingUser) {
      throw new Error("Usuário não autenticado");
    }

    const { userId, newPassword, employeeName, employeeEmail }: ResetPasswordRequest = await req.json();

    if (!userId || !newPassword) {
      throw new Error("userId e newPassword são obrigatórios");
    }

    if (newPassword.length < 8) {
      throw new Error("A senha deve ter pelo menos 8 caracteres");
    }

    // Verificar se o usuário que está fazendo a requisição é owner ou admin de alguma empresa
    // que contenha o employee a ser atualizado
    const { data: memberCheck, error: memberError } = await supabaseUser
      .from('company_members')
      .select('role, company_id')
      .eq('user_id', requestingUser.id)
      .in('role', ['owner', 'admin']);

    if (memberError || !memberCheck || memberCheck.length === 0) {
      throw new Error("Você não tem permissão para redefinir senhas");
    }

    // Verificar se o employee pertence a uma empresa que o usuário administra
    const companyIds = memberCheck.map(m => m.company_id);
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: employeeCheck, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, company_id')
      .eq('user_id', userId)
      .in('company_id', companyIds)
      .limit(1);

    if (empError || !employeeCheck || employeeCheck.length === 0) {
      throw new Error("Colaborador não encontrado ou você não tem permissão para gerenciá-lo");
    }

    // Atualizar a senha usando Admin API
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Erro ao atualizar senha:", updateError);
      throw new Error(`Erro ao atualizar senha: ${updateError.message}`);
    }

    console.log(`Senha atualizada com sucesso para: ${employeeEmail} (${employeeName})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Senha de ${employeeName} redefinida com sucesso` 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro ao redefinir senha:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
