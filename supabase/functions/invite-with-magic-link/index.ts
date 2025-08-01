import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    // 1. Criar usuário usando admin (sem confirmação por email)
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
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
    const finalRedirectTo = redirectTo || `${supabaseUrl.replace('supabase.co', 'lovableproject.com')}/`;
    
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
          from: `${companyName} <onboarding@resend.dev>`,
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
                
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${magicLinkData.properties?.action_link}" 
                     style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;">
                    🚀 Acessar Plataforma
                  </a>
                </div>
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                  <p style="margin: 0; color: #856404; font-size: 14px; font-weight: 600;">
                    ⚡ Link de acesso rápido (Magic Link)
                  </p>
                  <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px; line-height: 1.5;">
                    Este link permite acesso direto sem necessidade de senha. Após o primeiro acesso, você poderá configurar sua conta e definir suas preferências.
                  </p>
                </div>
                
                <div style="margin: 30px 0; text-align: center;">
                  <p style="color: #666; font-size: 14px; margin: 0;">
                    Ou copie e cole este link no seu navegador:
                  </p>
                  <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; font-size: 12px; color: #333; word-break: break-all;">
                    ${magicLinkData.properties?.action_link}
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