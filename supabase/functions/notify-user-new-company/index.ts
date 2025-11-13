import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  email: string;
  userName: string;
  companyName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userName, companyName }: NotificationRequest = await req.json();

    console.log(`Enviando notificação de nova empresa para: ${email}`);

    const emailResponse = await resend.emails.send({
      from: "Sistema <onboarding@resend.dev>",
      to: [email],
      subject: `Você foi adicionado à empresa ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Olá ${userName}!</h1>
          
          <p>Você foi adicionado como colaborador na empresa <strong>${companyName}</strong>.</p>
          
          <p>Agora você pode alternar entre suas empresas no painel de seleção do sistema.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Como alternar entre empresas:</h3>
            <ol>
              <li>Faça login no sistema</li>
              <li>Clique no seletor de empresas no canto superior</li>
              <li>Escolha a empresa que deseja acessar</li>
            </ol>
          </div>
          
          <p>Bem-vindo à equipe!</p>
          
          <p style="color: #666; font-size: 12px;">
            Esta é uma notificação automática do sistema.
          </p>
        </div>
      `,
    });

    console.log("Email de nova empresa enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Notificação enviada com sucesso",
      email_id: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Erro ao enviar notificação de nova empresa:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);