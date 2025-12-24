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

// Helper to build ListaCNAE query string for GET request
// API docs say GET /buscar with parameters passed as query string
function buildListaCnaeQueryString(filters: ListaCnaeSearchParams, inicio: number, quantidade: number): string {
  const params = new URLSearchParams();
  
  // Required params
  params.set("inicio", inicio.toString());
  params.set("quantidade", quantidade.toString());

  // CNAEs as JSON array of numbers
  if (filters.cnaes?.length) {
    const cnaesNumeric = filters.cnaes.map(c => parseInt(c.replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
    params.set("cnaes", JSON.stringify(cnaesNumeric));
  }

  // Estados as JSON array
  if (filters.estados?.length) {
    params.set("estados", JSON.stringify(filters.estados));
  }

  // Municipios as JSON array of numbers
  if (filters.municipios?.length) {
    const munNumeric = filters.municipios.map(m => parseInt(m, 10)).filter(n => !isNaN(n));
    params.set("municipios", JSON.stringify(munNumeric));
  }

  // Boolean filters
  if (filters.telefone_obrigatorio) {
    params.set("telefone_obrigatorio", "true");
  }
  if (filters.email_obrigatorio) {
    params.set("email_obrigatorio", "true");
  }
  if (filters.simples_nacional !== undefined) {
    params.set("simples_nacional", filters.simples_nacional.toString());
  }
  if (filters.mei !== undefined) {
    params.set("mei", filters.mei.toString());
  }

  // Capital social
  if (filters.capital_social_min !== undefined) {
    params.set("capital_social_minimo", filters.capital_social_min.toString());
  }
  if (filters.capital_social_max !== undefined) {
    params.set("capital_social_maximo", filters.capital_social_max.toString());
  }

  // Data abertura
  if (filters.data_abertura_inicio) {
    params.set("data_inicio", filters.data_abertura_inicio);
  }
  if (filters.data_abertura_fim) {
    params.set("data_fim", filters.data_abertura_fim);
  }

  return params.toString();
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
            configured: false,
            hasToken: false
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
            configured: true,
            hasToken: true
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const creditsResponse = await response.json();
        console.log("ListaCNAE credits response:", JSON.stringify(creditsResponse));
        
        // Extract the numeric credits value from the response
        // API returns: { mensagem: "...", creditos: { disponivel: 7018, detalhamento: [...] } }
        let creditsValue: number | null = null;
        
        if (typeof creditsResponse === 'number') {
          creditsValue = creditsResponse;
        } else if (typeof creditsResponse === 'object' && creditsResponse !== null) {
          if (creditsResponse.creditos?.disponivel !== undefined) {
            creditsValue = creditsResponse.creditos.disponivel;
          } else {
            creditsValue = creditsResponse.creditos ?? 
                          creditsResponse.credits ?? 
                          creditsResponse.saldo ?? 
                          creditsResponse.balance ??
                          creditsResponse.disponivel ??
                          creditsResponse.quantidade ??
                          null;
          }
        }
        
        return new Response(JSON.stringify({ 
          credits: creditsValue,
          creditsRaw: creditsResponse,
          configured: true,
          hasToken: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "cnaes": {
        // List all CNAEs - free endpoint
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

        // Build query string - use per_page from filters (respect user's preview count)
        const quantidade = searchParams.per_page || (preview ? 10 : 100);
        const inicio = ((searchParams.page || 1) - 1) * quantidade;
        
        const queryString = buildListaCnaeQueryString(searchParams, inicio, quantidade);
        const searchUrl = `${LISTACNAE_API_URL}/buscar?${queryString}`;
        
        console.log("ListaCNAE search - preview:", preview, "quantidade:", quantidade);

        console.log("ListaCNAE search URL:", searchUrl);

        const response = await fetch(searchUrl, {
          method: "GET",
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
        console.log("ListaCNAE search result:", JSON.stringify(result).substring(0, 500));
        
        // API returns: dados (array), quantidade_encontrada (total)
        return new Response(JSON.stringify({
          empresas: result.dados || result.empresas || result.data || [],
          total: result.quantidade_encontrada || result.total || result.totalRegistros || 0,
        }), {
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

        const maxLeads = filters.per_page || 100;
        let inicio = 0;
        let totalImported = 0;
        let totalDuplicates = 0;
        let hasMore = true;
        const batchSize = Math.min(1000, maxLeads);

        while (hasMore && totalImported + totalDuplicates < maxLeads) {
          const queryString = buildListaCnaeQueryString(filters, inicio, batchSize);
          const searchUrl = `${LISTACNAE_API_URL}/buscar?${queryString}`;
          
          console.log(`Fetching batch from ListaCNAE (inicio=${inicio})...`);
          
          const response = await fetch(searchUrl, {
            method: "GET",
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
          const empresas: ListaCnaeEmpresa[] = result.dados || result.empresas || result.data || [];

          if (empresas.length === 0) {
            hasMore = false;
            break;
          }

          // Process batch
          for (const empresa of empresas) {
            if (totalImported + totalDuplicates >= maxLeads) {
              hasMore = false;
              break;
            }

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
              // Map ListaCNAE data to lead_master_pool (use correct column names)
              const leadData = {
                company_id: companyId,
                first_client_id: client_id,
                cnpj: empresa.cnpj,
                company_name: empresa.razao_social,
                company_trade_name: empresa.nome_fantasia || null,
                cnae: empresa.cnae_principal,
                cnae_code: empresa.cnae_principal,
                cnae_description: empresa.cnae_descricao || null,
                phone: empresa.telefone || null,
                email: empresa.email || null,
                state: empresa.uf,
                city: empresa.municipio,
                zip_code: empresa.cep || null,
                street: empresa.logradouro || null,
                address_number: empresa.numero || null,
                address_complement: empresa.complemento || null,
                neighborhood: empresa.bairro || null,
                share_capital: empresa.capital_social || null,
                simples_option: empresa.simples_nacional ? "Sim" : "Não",
                mei_option: empresa.mei ? "Sim" : "Não",
                activity_start_date: empresa.data_abertura || null,
                company_size: empresa.porte || null,
                lead_status: "novo",
                original_source: "ListaCNAE",
                country: "BR",
                full_name: empresa.razao_social,
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

          // Check if there are more results
          const totalFromApi = result.quantidade_encontrada || result.total || result.totalRegistros || 0;
          if (inicio + empresas.length >= totalFromApi) {
            hasMore = false;
          }
          
          inicio += batchSize;

          // Rate limit: 50 requests per minute
          if (inicio > 0 && inicio % 45000 === 0) {
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
