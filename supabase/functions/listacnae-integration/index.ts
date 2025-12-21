import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LISTACNAE_API_URL = "https://api.listacnae.com.br/v1";

interface ListaCnaeSearchParams {
  cnaes?: string[];
  estados?: string[];
  municipios?: string[];
  termo_busca?: string;
  capital_social_min?: number;
  capital_social_max?: number;
  simples_nacional?: boolean;
  mei?: boolean;
  data_abertura_inicio?: string;
  data_abertura_fim?: string;
  telefone_obrigatorio?: boolean;
  email_obrigatorio?: boolean;
  page?: number;
  per_page?: number;
}

interface ListaCnaeEmpresa {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cnae_principal: string;
  cnae_descricao: string;
  telefone: string;
  email: string;
  uf: string;
  municipio: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  capital_social: number;
  simples_nacional: boolean;
  mei: boolean;
  data_abertura: string;
  porte: string;
  situacao_cadastral: string;
  natureza_juridica: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Get company_id from query params or body
    let companyId: string | null = url.searchParams.get("company_id");
    let body: any = {};
    
    if (req.method === "POST") {
      body = await req.json();
      companyId = companyId || body.company_id;
    }

    if (!companyId) {
      return new Response(JSON.stringify({ error: "company_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get ListaCNAE token from company settings
    const { data: settings, error: settingsError } = await supabase
      .from("company_settings")
      .select("listacnae_token")
      .eq("company_id", companyId)
      .single();

    const listacnaeToken = settings?.listacnae_token;

    // Handle different endpoints
    switch (path) {
      case "credits": {
        // Check credits - requires token
        if (!listacnaeToken) {
          return new Response(JSON.stringify({ 
            error: "Token da ListaCNAE não configurado",
            credits: null,
            configured: false
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const response = await fetch(`${LISTACNAE_API_URL}/creditosAtivos`, {
          headers: {
            "Authorization": `Bearer ${listacnaeToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("ListaCNAE credits error:", errorText);
          return new Response(JSON.stringify({ 
            error: "Erro ao consultar créditos. Verifique se o token é válido.",
            credits: null,
            configured: true
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const credits = await response.json();
        return new Response(JSON.stringify({ 
          credits,
          configured: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "cnaes": {
        // List all CNAEs - free endpoint, doesn't need token
        const response = await fetch(`${LISTACNAE_API_URL}/todosCnaes`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Erro ao buscar CNAEs");
        }

        const cnaes = await response.json();
        return new Response(JSON.stringify(cnaes), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "municipios": {
        // List all municipalities - free endpoint
        const response = await fetch(`${LISTACNAE_API_URL}/todosMunicipios`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Erro ao buscar municípios");
        }

        const municipios = await response.json();
        return new Response(JSON.stringify(municipios), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "search": {
        // Search companies - requires token
        if (!listacnaeToken) {
          return new Response(JSON.stringify({ 
            error: "Token da ListaCNAE não configurado" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const searchParams: ListaCnaeSearchParams = body.filters || {};
        const preview = body.preview || false;

        // Build query params
        const queryParams = new URLSearchParams();
        
        if (searchParams.cnaes?.length) {
          queryParams.set("cnaes", searchParams.cnaes.join(","));
        }
        if (searchParams.estados?.length) {
          queryParams.set("estados", searchParams.estados.join(","));
        }
        if (searchParams.municipios?.length) {
          queryParams.set("municipios", searchParams.municipios.join(","));
        }
        if (searchParams.termo_busca) {
          queryParams.set("termo", searchParams.termo_busca);
        }
        if (searchParams.capital_social_min) {
          queryParams.set("capitalMin", searchParams.capital_social_min.toString());
        }
        if (searchParams.capital_social_max) {
          queryParams.set("capitalMax", searchParams.capital_social_max.toString());
        }
        if (searchParams.simples_nacional !== undefined) {
          queryParams.set("simples", searchParams.simples_nacional ? "1" : "0");
        }
        if (searchParams.mei !== undefined) {
          queryParams.set("mei", searchParams.mei ? "1" : "0");
        }
        if (searchParams.data_abertura_inicio) {
          queryParams.set("dataAberturaInicio", searchParams.data_abertura_inicio);
        }
        if (searchParams.data_abertura_fim) {
          queryParams.set("dataAberturaFim", searchParams.data_abertura_fim);
        }
        if (searchParams.telefone_obrigatorio) {
          queryParams.set("telefoneObrigatorio", "1");
        }
        if (searchParams.email_obrigatorio) {
          queryParams.set("emailObrigatorio", "1");
        }

        // For preview, limit to 10 results
        queryParams.set("limite", preview ? "10" : (searchParams.per_page?.toString() || "1000"));
        if (searchParams.page) {
          queryParams.set("pagina", searchParams.page.toString());
        }

        console.log("ListaCNAE search params:", queryParams.toString());

        const response = await fetch(`${LISTACNAE_API_URL}/empresas?${queryParams.toString()}`, {
          headers: {
            "Authorization": `Bearer ${listacnaeToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("ListaCNAE search error:", errorText);
          return new Response(JSON.stringify({ 
            error: "Erro na busca. Verifique os filtros e tente novamente.",
            details: errorText
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const result = await response.json();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "import": {
        // Import companies to segment - requires token
        if (!listacnaeToken) {
          return new Response(JSON.stringify({ 
            error: "Token da ListaCNAE não configurado" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { segment_id, client_id, filters } = body;

        if (!segment_id || !client_id) {
          return new Response(JSON.stringify({ 
            error: "segment_id e client_id são obrigatórios" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Build query params same as search
        const queryParams = new URLSearchParams();
        
        if (filters.cnaes?.length) {
          queryParams.set("cnaes", filters.cnaes.join(","));
        }
        if (filters.estados?.length) {
          queryParams.set("estados", filters.estados.join(","));
        }
        if (filters.municipios?.length) {
          queryParams.set("municipios", filters.municipios.join(","));
        }
        if (filters.termo_busca) {
          queryParams.set("termo", filters.termo_busca);
        }
        if (filters.capital_social_min) {
          queryParams.set("capitalMin", filters.capital_social_min.toString());
        }
        if (filters.capital_social_max) {
          queryParams.set("capitalMax", filters.capital_social_max.toString());
        }
        if (filters.simples_nacional !== undefined) {
          queryParams.set("simples", filters.simples_nacional ? "1" : "0");
        }
        if (filters.mei !== undefined) {
          queryParams.set("mei", filters.mei ? "1" : "0");
        }
        if (filters.data_abertura_inicio) {
          queryParams.set("dataAberturaInicio", filters.data_abertura_inicio);
        }
        if (filters.data_abertura_fim) {
          queryParams.set("dataAberturaFim", filters.data_abertura_fim);
        }
        if (filters.telefone_obrigatorio) {
          queryParams.set("telefoneObrigatorio", "1");
        }
        if (filters.email_obrigatorio) {
          queryParams.set("emailObrigatorio", "1");
        }
        queryParams.set("limite", "1000");

        let page = 1;
        let totalImported = 0;
        let totalDuplicates = 0;
        let hasMore = true;

        while (hasMore) {
          queryParams.set("pagina", page.toString());
          
          console.log(`Fetching page ${page} from ListaCNAE...`);
          
          const response = await fetch(`${LISTACNAE_API_URL}/empresas?${queryParams.toString()}`, {
            headers: {
              "Authorization": `Bearer ${listacnaeToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("ListaCNAE import error:", errorText);
            break;
          }

          const result = await response.json();
          const empresas: ListaCnaeEmpresa[] = result.empresas || result.data || [];

          if (empresas.length === 0) {
            hasMore = false;
            break;
          }

          // Process batch
          for (const empresa of empresas) {
            // Check if CNPJ already exists
            const { data: existing } = await supabase
              .from("lead_master_pool")
              .select("id")
              .eq("company_id", companyId)
              .eq("cnpj", empresa.cnpj)
              .maybeSingle();

            let leadId: string;

            if (existing) {
              leadId = existing.id;
              totalDuplicates++;
            } else {
              // Map ListaCNAE data to lead_master_pool
              const leadData = {
                company_id: companyId,
                client_id,
                cnpj: empresa.cnpj,
                company_name: empresa.razao_social,
                company_trade_name: empresa.nome_fantasia || null,
                cnae: empresa.cnae_principal,
                phone: empresa.telefone || null,
                email: empresa.email || null,
                state: empresa.uf,
                city: empresa.municipio,
                zip_code: empresa.cep || null,
                address: empresa.logradouro ? 
                  `${empresa.logradouro}, ${empresa.numero}${empresa.complemento ? ` - ${empresa.complemento}` : ''} - ${empresa.bairro}` 
                  : null,
                share_capital: empresa.capital_social || null,
                simples_option: empresa.simples_nacional ? "Sim" : "Não",
                mei_option: empresa.mei ? "Sim" : "Não",
                activity_start_date: empresa.data_abertura || null,
                company_size: empresa.porte || null,
                lead_status: "novo",
                primary_source: "ListaCNAE",
                country: "BR",
                full_name: empresa.razao_social, // Use company name as fallback
              };

              const { data: newLead, error: insertError } = await supabase
                .from("lead_master_pool")
                .insert(leadData)
                .select("id")
                .single();

              if (insertError) {
                console.error("Error inserting lead:", insertError);
                continue;
              }

              leadId = newLead.id;
              totalImported++;
            }

            // Create segment assignment if not exists
            const { error: assignError } = await supabase
              .from("lead_segment_assignments")
              .upsert({
                lead_id: leadId,
                segment_id,
                company_id: companyId,
                assigned_at: new Date().toISOString(),
              }, { 
                onConflict: "lead_id,segment_id",
                ignoreDuplicates: true 
              });

            if (assignError) {
              console.error("Error assigning to segment:", assignError);
            }
          }

          // Check if there are more pages
          const totalFromApi = result.total || result.totalRegistros;
          if (totalFromApi && (page * 1000) >= totalFromApi) {
            hasMore = false;
          }
          
          page++;

          // Rate limit: 50 requests per minute
          if (page % 45 === 0) {
            console.log("Approaching rate limit, waiting 60 seconds...");
            await new Promise(resolve => setTimeout(resolve, 60000));
          }
        }

        // Update segment count
        const { count } = await supabase
          .from("lead_segment_assignments")
          .select("*", { count: "exact", head: true })
          .eq("segment_id", segment_id);

        await supabase
          .from("lead_segments")
          .update({ 
            lead_count: count || 0,
            updated_at: new Date().toISOString()
          })
          .eq("id", segment_id);

        return new Response(JSON.stringify({
          success: true,
          imported: totalImported,
          duplicates: totalDuplicates,
          total_in_segment: count
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "save-token": {
        // Save token to company settings
        const { token } = body;

        if (!token) {
          return new Response(JSON.stringify({ error: "Token é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if settings exist
        const { data: existingSettings } = await supabase
          .from("company_settings")
          .select("id")
          .eq("company_id", companyId)
          .maybeSingle();

        if (existingSettings) {
          await supabase
            .from("company_settings")
            .update({ 
              listacnae_token: token,
              updated_at: new Date().toISOString()
            })
            .eq("company_id", companyId);
        } else {
          await supabase
            .from("company_settings")
            .insert({ 
              company_id: companyId,
              listacnae_token: token
            });
        }

        // Validate token by checking credits
        try {
          const response = await fetch(`${LISTACNAE_API_URL}/creditosAtivos`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const credits = await response.json();
            return new Response(JSON.stringify({ 
              success: true, 
              valid: true,
              credits 
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } else {
            return new Response(JSON.stringify({ 
              success: true, 
              valid: false,
              message: "Token salvo, mas não foi possível validar. Verifique se está correto."
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (e) {
          return new Response(JSON.stringify({ 
            success: true, 
            valid: false,
            message: "Token salvo. Não foi possível validar no momento."
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      default:
        return new Response(JSON.stringify({ error: "Endpoint não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("ListaCNAE integration error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Erro interno do servidor" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
