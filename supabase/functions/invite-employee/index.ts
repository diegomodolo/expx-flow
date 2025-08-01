import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteEmployeeRequest {
  email: string;
  name: string;
  role: string;
  companyName: string;
  tempPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurado");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { email, name, role, companyName, tempPassword }: InviteEmployeeRequest = await req.json();

    // Enviar email com credenciais
    const emailResponse = await resend.emails.send({
      from: "Sistema <onboarding@resend.dev>",
      to: [email],
      subject: `Bem-vindo(a) à ${companyName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Bem-vindo(a) à ${companyName}!</h1>
          
          <p>Olá <strong>${name}</strong>,</p>
          
          <p>Você foi convidado(a) para ser colaborador da empresa <strong>${companyName}</strong> no cargo de <strong>${role}</strong>.</p>
          
          <p>Suas credenciais de acesso são:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Senha temporária:</strong> ${tempPassword}</p>
          </div>
          
          <p><strong>IMPORTANTE:</strong> Por favor, altere sua senha no primeiro acesso por motivos de segurança.</p>
          
          <p>Clique no link abaixo para acessar o sistema:</p>
          <a href="${supabaseUrl.replace('supabase.co', 'lovableproject.com')}" 
             style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Acessar Sistema
          </a>
          
          <p>Se você tiver dúvidas, entre em contato com o administrador da empresa.</p>
          
          <p>Atenciosamente,<br>Equipe ${companyName}</p>
        </div>
      `,
    });

    console.log("Email enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar convite:", error);
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