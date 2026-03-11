import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FetchStatusRequest {
  report_id: string;
  github_issue_number: number;
}

function determineStatus(
  issueState: string,
  labels: string[],
  hasClaudeComment: boolean
): string {
  if (issueState === "open") {
    return hasClaudeComment ? "em_analise" : "aberto";
  }
  if (labels.includes("wontfix")) {
    return "recusado";
  }
  return "implementado";
}

interface GitHubComment {
  user?: { login?: string; type?: string };
  body?: string;
}

interface GitHubLabel {
  name?: string;
}

function extractClaudeResponse(comments: GitHubComment[]): string | null {
  const claudeComments = comments.filter((c) =>
    c.user?.login?.includes("github-actions") ||
    c.user?.login?.includes("claude") ||
    c.user?.type === "Bot"
  );

  if (claudeComments.length === 0) return null;
  return claudeComments[claudeComments.length - 1].body || null;
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

    const { report_id, github_issue_number }: FetchStatusRequest = await req.json();

    const issueRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${github_issue_number}`,
      {
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!issueRes.ok) {
      if (issueRes.status === 404) {
        const { data: cached } = await supabase
          .from("user_reports")
          .select("*")
          .eq("id", report_id)
          .single();
        return new Response(
          JSON.stringify({ success: true, data: cached, from_cache: true }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      throw new Error("Não foi possível consultar o GitHub");
    }

    const issueData = await issueRes.json();

    const commentsRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${github_issue_number}/comments`,
      {
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    const comments = commentsRes.ok ? await commentsRes.json() : [];

    const labels = (issueData.labels || []).map((l: string | GitHubLabel) =>
      typeof l === "string" ? l : l.name
    );
    const hasClaudeComment = (comments as GitHubComment[]).some(
      (c) =>
        c.user?.login?.includes("github-actions") ||
        c.user?.login?.includes("claude") ||
        c.user?.type === "Bot"
    );

    const newStatus = determineStatus(issueData.state, labels, hasClaudeComment);
    const claudeResponse = extractClaudeResponse(comments as GitHubComment[]);

    const { data: updated, error: updateError } = await supabase
      .from("user_reports")
      .update({
        status: newStatus,
        claude_response: claudeResponse,
      })
      .eq("id", report_id)
      .select()
      .single();

    if (updateError) {
      console.error("Supabase update error:", updateError);
      throw new Error("Erro ao atualizar status do reporte");
    }

    return new Response(
      JSON.stringify({ success: true, data: updated }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Erro ao buscar status:", error);
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
