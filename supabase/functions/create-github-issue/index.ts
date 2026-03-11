import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("FRONTEND_URL") ?? "https://controledetrafego.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateReportRequest {
  type: "bug" | "feature";
  title: string;
  description: string;
  extra_fields: Record<string, string>;
  user_name: string;
  company_id: string;
  user_id: string;
}

function buildBugIssueBody(req: CreateReportRequest): string {
  const ef = req.extra_fields;
  let body = `> Reportado por **${req.user_name}** via sistema\n\n`;
  if (ef.url) body += `### URL onde o erro ocorre\n${ef.url}\n\n`;
  body += `### Descrição do bug\n${req.description}\n\n`;
  if (ef.stack_trace) body += `### Stack trace / erro no console\n\`\`\`\n${ef.stack_trace}\n\`\`\`\n\n`;
  if (ef.steps) body += `### Passos para reproduzir\n${ef.steps}\n\n`;
  if (ef.suspected_file) body += `### Arquivo suspeito\n${ef.suspected_file}\n\n`;
  return body;
}

function buildFeatureIssueBody(req: CreateReportRequest): string {
  const ef = req.extra_fields;
  let body = `> Sugerido por **${req.user_name}** via sistema\n\n`;
  body += `### Nome da Feature\n${req.title}\n\n`;
  if (ef.category) body += `### Categoria\n${ef.category}\n\n`;
  body += `### Problema que resolve\n${ef.problem || req.description}\n\n`;
  if (ef.proposal) body += `### Proposta de implementação\n${ef.proposal}\n\n`;
  if (ef.impact) body += `### Impacto estimado\n${ef.impact}\n\n`;
  if (ef.complexity) body += `### Complexidade estimada\n${ef.complexity}\n\n`;
  if (ef.area) body += `### Área do sistema\n${ef.area}\n\n`;
  return body;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const githubPat = Deno.env.get("GITHUB_PAT");
    const repoOwner = Deno.env.get("GITHUB_REPO_OWNER") || "bittencourtthulio";
    const repoName = Deno.env.get("GITHUB_REPO_NAME") || "controledetrafego";

    if (!githubPat) {
      throw new Error("GITHUB_PAT não configurado");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: CreateReportRequest = await req.json();
    const { type, title, description, extra_fields, user_name, company_id, user_id } = body;

    const issueBody = type === "bug"
      ? buildBugIssueBody(body)
      : buildFeatureIssueBody(body);

    const labels = type === "bug"
      ? ["bug", "claude-analyze"]
      : ["feature-suggestion", "claude-analyze"];

    const ghResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: type === "bug" ? `[Bug] ${title}` : `[Feature] ${title}`,
          body: issueBody,
          labels,
        }),
      }
    );

    if (!ghResponse.ok) {
      const ghError = await ghResponse.text();
      console.error("GitHub API error:", ghError);
      throw new Error("Não foi possível criar a issue no GitHub");
    }

    const ghData = await ghResponse.json();

    const { data: report, error: dbError } = await supabase
      .from("user_reports")
      .insert({
        company_id,
        user_id,
        type,
        title,
        description,
        extra_fields,
        user_name,
        github_issue_number: ghData.number,
        github_issue_url: ghData.html_url,
        status: "aberto",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase insert error:", JSON.stringify(dbError));
      throw new Error(`Issue criada no GitHub mas erro ao salvar: ${dbError.message} (code: ${dbError.code}, details: ${dbError.details})`);
    }

    return new Response(
      JSON.stringify({ success: true, data: report }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Erro ao criar reporte:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
