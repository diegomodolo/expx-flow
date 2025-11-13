// Deno.serve is available natively in modern Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteWithMagicLinkRequest {
  email: string;
  name: string;
  role: string;
  companyId: string;
  companyName: string;
  redirectTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      email, 
      name, 
      role, 
      companyId, 
      companyName, 
      redirectTo 
    }: InviteWithMagicLinkRequest = await req.json();

    // Gerar senha temporária
    const generateTempPassword = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
      let password = '';
      for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };
    
    const tempPassword = generateTempPassword();

    // 1. Criar usuário usando admin (com senha temporária)
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // Não confirmar automaticamente
      user_metadata: {
        full_name: name,
        invited_by_company: companyName,
        role: role,
      }
    });

    if (createUserError) {
      throw new Error(`Erro ao criar usuário: ${createUserError.message}`);
    }

    if (!newUser.user) {
      throw new Error("Erro ao criar usuário: dados não retornados");
    }

    const userId = newUser.user.id;

    // 2. Adicionar à company_members
    const { error: memberError } = await supabase
      .from("company_members")
      .insert({
        user_id: userId,
        company_id: companyId,
        role: 'member',
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      console.warn("Aviso ao adicionar membro da empresa:", memberError);
    }

    // 3. Gerar magic link
    const finalRedirectTo = redirectTo || 'https://controledetrafego.com.br/';
    
    const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: finalRedirectTo,
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

    // 4. Enviar email com magic link
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        await resend.emails.send({
          from: `${companyName} <noreply@controledetrafego.com.br>`,
          to: [email],
          subject: `Bem-vindo(a) à ${companyName}! 🎉`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; overflow: hidden;">
              <!-- Header -->
              <div style="background: white; padding: 40px 30px; text-align: center;">
                <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">
                  Bem-vindo(a) à ${companyName}!
                </h1>
                <p style="color: #666; margin: 15px 0 0 0; font-size: 16px;">
                  Você foi convidado(a) para ser colaborador(a)
                </p>
              </div>
              
              <!-- Content -->
              <div style="background: white; padding: 0 30px 40px 30px;">
                <div style="background: #f8f9ff; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
                  <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.6;">
                    Olá <strong>${name}</strong>,
                  </p>
                  <p style="margin: 15px 0 0 0; color: #333; font-size: 16px; line-height: 1.6;">
                    Você foi convidado(a) para ser <strong>${role}</strong> na empresa <strong>${companyName}</strong>.
                  </p>
                </div>
                
                <!-- Magic Link Section -->
                <div style="text-align: center; margin: 35px 0;">
                  <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">🚀 Opção 1: Acesso Rápido</h3>
                  <a href="${magicLinkData.properties?.action_link}" 
                     style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;">
                    Acessar com Magic Link
                  </a>
                  <p style="color: #666; font-size: 12px; margin: 10px 0 0 0;">
                    Clique no botão acima para acesso direto, sem necessidade de senha
                  </p>
                </div>
                
                <!-- Credentials Section -->
                <div style="background: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 8px; padding: 25px; margin: 30px 0;">
                  <h3 style="color: #2d5e2d; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
                    🔑 Opção 2: Login Tradicional (caso o link não funcione)
                  </h3>
                  <p style="margin: 0 0 15px 0; color: #2d5e2d; font-size: 14px;">
                    Use estas credenciais para fazer login em: <strong>https://controledetrafego.com.br</strong>
                  </p>
                  <div style="background: #fff; padding: 15px; border-radius: 4px; margin: 10px 0;">
                    <p style="margin: 0; color: #333; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 5px 0 0 0; color: #333; font-size: 14px;"><strong>Senha temporária:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${tempPassword}</code></p>
                  </div>
                  <p style="margin: 15px 0 0 0; color: #856404; font-size: 12px; font-style: italic;">
                    ⚠️ Recomendamos alterar a senha no primeiro acesso por motivos de segurança.
                  </p>
                </div>
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                  <p style="margin: 0; color: #856404; font-size: 14px; font-weight: 600;">
                    💡 Dica de Acesso
                  </p>
                  <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px; line-height: 1.5;">
                    • Primeiro, tente o <strong>Magic Link</strong> (mais fácil e seguro)<br>
                    • Se não funcionar, use o <strong>login tradicional</strong> com email e senha<br>
                    • Após o primeiro acesso, você poderá personalizar sua conta
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="margin: 0; color: #6c757d; font-size: 12px;">
                  Se você não esperava este convite ou tem dúvidas, entre em contato com a equipe ${companyName}.
                </p>
                <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 12px;">
                  Este link expira em 24 horas por motivos de segurança.
                </p>
              </div>
            </div>
          `,
        });

        console.log("Email enviado com sucesso para:", email);
      } catch (emailError) {
        console.warn("Erro ao enviar email:", emailError);
        // Não falhar se o email não puder ser enviado
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: userId,
      magic_link: magicLinkData.properties?.action_link,
      temp_password: tempPassword,
      email_sent: !!resendApiKey
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao criar colaborador com magic link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);