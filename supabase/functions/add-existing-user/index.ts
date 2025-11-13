import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AddExistingUserRequest {
  userId: string;
  companyId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, companyId }: AddExistingUserRequest = await req.json();

    // Verificar se o usuário já é membro da empresa
    const { data: existingMember, error: checkError } = await supabase
      .from("company_members")
      .select("id")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Erro ao verificar membro existente: ${checkError.message}`);
    }

    if (existingMember) {
      return new Response(JSON.stringify({ 
        success: true, 
        already_member: true,
        message: "Usuário já é membro desta empresa"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Adicionar usuário à empresa
    const { error: memberError } = await supabase
      .from("company_members")
      .insert({
        user_id: userId,
        company_id: companyId,
        role: 'member',
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      throw new Error(`Erro ao adicionar membro: ${memberError.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      already_member: false,
      message: "Usuário adicionado à empresa com sucesso"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao adicionar usuário existente:", error);
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