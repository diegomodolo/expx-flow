import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Participant {
  name: string;
  role: string;
  email: string;
}

interface CreativeApproval {
  headline: string | null;
  creativeType: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
}

interface SummaryRequest {
  meetingId: string;
  presentationName: string;
  clientName: string;
  participants: Participant[];
  creatives: CreativeApproval[];
  meetingDate: string;
}

const CREATIVE_TYPE_LABELS: Record<string, string> = {
  post_unico: "Post Único",
  carrossel: "Carrossel",
  reels: "Reels",
  stories: "Stories",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      meetingId, 
      presentationName, 
      clientName, 
      participants, 
      creatives, 
      meetingDate 
    }: SummaryRequest = await req.json();

    console.log(`Enviando resumo da reunião ${meetingId} para ${participants.length} participantes`);

    const approved = creatives.filter(c => c.status === "approved").length;
    const rejected = creatives.filter(c => c.status === "rejected").length;
    const total = creatives.length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    const participantsList = participants
      .map(p => `<li>${p.name}${p.role ? ` (${p.role})` : ''}</li>`)
      .join('');

    const creativesRows = creatives
      .map((c, i) => {
        const typeLabel = CREATIVE_TYPE_LABELS[c.creativeType] || c.creativeType;
        const statusColor = c.status === 'approved' ? '#22c55e' : c.status === 'rejected' ? '#ef4444' : '#f59e0b';
        const statusText = c.status === 'approved' ? '✓ Aprovado' : c.status === 'rejected' ? '✗ Reprovado' : 'Pendente';
        
        return `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px;">${c.headline || `Criativo ${i + 1}`}</td>
            <td style="padding: 12px;">${typeLabel}</td>
            <td style="padding: 12px; color: ${statusColor}; font-weight: 600;">${statusText}</td>
            <td style="padding: 12px; color: #6b7280; font-size: 14px;">${c.rejectionReason || '-'}</td>
          </tr>
        `;
      })
      .join('');

    const formattedDate = new Date(meetingDate).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Resumo da Reunião</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
        <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
          <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1a73e8, #4285f4); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px;">Resumo da Reunião</h1>
              <p style="margin: 0; opacity: 0.9; font-size: 18px;">${presentationName}</p>
              <p style="margin: 10px 0 0 0; opacity: 0.8; font-size: 14px;">${clientName}</p>
            </div>
            
            <!-- Stats -->
            <div style="display: flex; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <div style="flex: 1; padding: 20px; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 32px; font-weight: 700; color: #22c55e;">${approved}</div>
                <div style="font-size: 14px; color: #6b7280;">Aprovados</div>
              </div>
              <div style="flex: 1; padding: 20px; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 32px; font-weight: 700; color: #ef4444;">${rejected}</div>
                <div style="font-size: 14px; color: #6b7280;">Reprovados</div>
              </div>
              <div style="flex: 1; padding: 20px;">
                <div style="font-size: 32px; font-weight: 700; color: #1a73e8;">${approvalRate}%</div>
                <div style="font-size: 14px; color: #6b7280;">Taxa de Aprovação</div>
              </div>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <!-- Meeting info -->
              <div style="margin-bottom: 25px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">📅 Data da Reunião</p>
                <p style="margin: 0; font-size: 16px; color: #111827;">${formattedDate}</p>
              </div>
              
              <!-- Participants -->
              <div style="margin-bottom: 25px;">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">👥 Participantes</p>
                <ul style="margin: 0; padding-left: 20px; color: #111827;">
                  ${participantsList}
                </ul>
              </div>
              
              <!-- Creatives table -->
              <div>
                <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">📋 Status dos Criativos</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <thead>
                    <tr style="background-color: #f9fafb;">
                      <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Criativo</th>
                      <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Tipo</th>
                      <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Status</th>
                      <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${creativesRows}
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Este é um email automático gerado pelo sistema de apresentações.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const emails = participants.map(p => p.email);
    
    const emailResponse = await resend.emails.send({
      from: "Controle de Tráfego <noreply@controledetrafego.com.br>",
      to: emails,
      subject: `Resumo da Reunião: ${presentationName} - ${clientName}`,
      html: htmlContent,
    });

    console.log("Email de resumo enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Resumo enviado com sucesso",
      email_id: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Erro ao enviar resumo da reunião:", error);
    
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
