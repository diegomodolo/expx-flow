import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateEmployeeUserRequest {
  email: string;
  name: string;
  password: string;
  companyId: string;
  companyName: string;
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

    const { email, name, password, companyId, companyName }: CreateEmployeeUserRequest = await req.json();

    // Criar usuário usando admin (não afeta sessão atual)
    const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
      }
    });

    if (createUserError) {
      throw new Error(`Erro ao criar usuário: ${createUserError.message}`);
    }

    if (!newUser.user) {
      throw new Error("Erro ao criar usuário: dados não retornados");
    }

    const userId = newUser.user.id;

    // Adicionar à tabela company_members
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

    // Enviar email com credenciais se resend estiver configurado
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        await resend.emails.send({
          from: `${companyName} <sistema@controledetrafego.com.br>`,
          to: [email],
          subject: `Bem-vindo(a) à ${companyName}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Bem-vindo(a) à ${companyName}!</h1>
              
              <p>Olá <strong>${name}</strong>,</p>
              
              <p>Você foi convidado(a) para ser colaborador da empresa <strong>${companyName}</strong>.</p>
              
              <p>Suas credenciais de acesso são:</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Senha temporária:</strong> ${password}</p>
              </div>
              
              <p><strong>IMPORTANTE:</strong> Por favor, altere sua senha no primeiro acesso por motivos de segurança.</p>
              
              <p>Atenciosamente,<br>Equipe ${companyName}</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.warn("Erro ao enviar email:", emailError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: userId,
      email_sent: !!resendApiKey
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao criar usuário colaborador:", error);
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