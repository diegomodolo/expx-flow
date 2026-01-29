import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResendInviteRequest {
  userId: string;
  email: string;
  name: string;
  role: string;
  companyName: string;
  generateNewPassword?: boolean;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !requestingUser) {
      throw new Error("Usuário não autenticado");
    }

    // Verificar se é admin/owner
    const { data: memberCheck } = await supabaseUser
      .from('company_members')
      .select('role, company_id, company:companies(name)')
      .eq('user_id', requestingUser.id)
      .in('role', ['owner', 'admin']);

    if (!memberCheck || memberCheck.length === 0) {
      throw new Error("Você não tem permissão para reenviar convites");
    }

    const { 
      userId, 
      email, 
      name, 
      role, 
      companyName,
      generateNewPassword = true 
    }: ResendInviteRequest = await req.json();

    if (!userId || !email || !name) {
      throw new Error("Dados do colaborador incompletos");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se o colaborador pertence a uma empresa do admin
    const companyIds = memberCheck.map(m => m.company_id);
    const { data: employeeCheck } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('user_id', userId)
      .in('company_id', companyIds)
      .limit(1);

    if (!employeeCheck || employeeCheck.length === 0) {
      throw new Error("Colaborador não encontrado ou você não tem permissão");
    }

    // Gerar nova senha temporária se solicitado
    let tempPassword = '';
    if (generateNewPassword) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
      for (let i = 0; i < 10; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Atualizar senha do usuário
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: tempPassword
      });

      if (updateError) {
        console.warn("Erro ao atualizar senha:", updateError);
        // Continuar mesmo se não conseguir atualizar a senha
        tempPassword = '';
      }
    }

    // Gerar novo magic link
    const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: 'https://controledetrafego.com.br/',
        data: {
          full_name: name,
          company_name: companyName,
          role: role,
        }
      }
    });

    if (magicLinkError) {
      throw new Error(`Erro ao gerar magic link: ${magicLinkError.message}`);
    }

    // Enviar email
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const resend = new Resend(resendApiKey);
    
    const credentialsSection = tempPassword ? `
      <!-- Credentials Section -->
      <div style="background: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 8px; padding: 25px; margin: 30px 0;">
        <h3 style="color: #2d5e2d; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
          🔑 Opção 2: Login Tradicional
        </h3>
        <p style="margin: 0 0 15px 0; color: #2d5e2d; font-size: 14px;">
          Use estas credenciais para fazer login em: <strong>https://controledetrafego.com.br</strong>
        </p>
        <div style="background: #fff; padding: 15px; border-radius: 4px; margin: 10px 0;">
          <p style="margin: 0; color: #333; font-size: 14px;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0 0 0; color: #333; font-size: 14px;"><strong>Nova senha temporária:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${tempPassword}</code></p>
        </div>
        <p style="margin: 15px 0 0 0; color: #856404; font-size: 12px; font-style: italic;">
          ⚠️ Recomendamos alterar a senha após o primeiro acesso.
        </p>
      </div>
    ` : '';

    await resend.emails.send({
      from: `${companyName} <noreply@controledetrafego.com.br>`,
      to: [email],
      subject: `🔄 Reenvio: Seu acesso à ${companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; overflow: hidden;">
          <!-- Header -->
          <div style="background: white; padding: 40px 30px; text-align: center;">
            <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">
              Reenvio de Acesso
            </h1>
            <p style="color: #666; margin: 15px 0 0 0; font-size: 16px;">
              ${companyName}
            </p>
          </div>
          
          <!-- Content -->
          <div style="background: white; padding: 0 30px 40px 30px;">
            <div style="background: #f8f9ff; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
              <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.6;">
                Olá <strong>${name}</strong>,
              </p>
              <p style="margin: 15px 0 0 0; color: #333; font-size: 16px; line-height: 1.6;">
                Reenviamos seu acesso como <strong>${role}</strong> na empresa <strong>${companyName}</strong>.
              </p>
            </div>
            
            <!-- Magic Link Section -->
            <div style="text-align: center; margin: 35px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">🚀 Opção 1: Acesso Rápido</h3>
              <a href="${magicLinkData.properties?.action_link}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                Acessar com Magic Link
              </a>
              <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
                Clique no botão acima para acesso direto, sem necessidade de senha
              </p>
            </div>
            
            ${credentialsSection}
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px; font-weight: 600;">
                💡 Dica
              </p>
              <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px; line-height: 1.5;">
                • O Magic Link é a forma mais fácil e segura de acessar<br>
                • Este link expira em 24 horas
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              Se você não solicitou este reenvio, entre em contato com a equipe ${companyName}.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email de reenvio enviado para:", email);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Convite reenviado para ${email}`,
      passwordGenerated: !!tempPassword
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Erro ao reenviar convite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
