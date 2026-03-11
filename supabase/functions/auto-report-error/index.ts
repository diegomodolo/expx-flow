const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ErrorReport {
  message: string;
  stack: string | null;
  url: string;
  userAgent: string;
  timestamp: string;
  componentStack?: string | null;
}

function sanitizeStack(stack: string | null): string {
  if (!stack) return "Sem stack trace";
  // Remove query params and hashes from URLs to improve deduplication
  return stack.replace(/\?[^\s)]+/g, "").replace(/#[^\s)]+/g, "");
}

function generateFingerprint(message: string, stack: string | null): string {
  // Create a fingerprint from error message + first 2 lines of stack
  const stackLines = sanitizeStack(stack).split("\n").slice(0, 3).join("\n");
  const raw = `${message}|||${stackLines}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
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
      throw new Error("GITHUB_PAT not configured");
    }

    const body: ErrorReport = await req.json();
    const { message, stack, url, userAgent, timestamp, componentStack } = body;

    const fingerprint = generateFingerprint(message, stack);
    const issueTitle = `[Auto-Bug] ${message.substring(0, 120)}`;

    // Check if similar issue already exists (open issues only)
    const searchQuery = encodeURIComponent(
      `repo:${repoOwner}/${repoName} is:issue is:open label:auto-reported "${fingerprint}" in:body`
    );
    const searchResponse = await fetch(
      `https://api.github.com/search/issues?q=${searchQuery}&per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.total_count > 0) {
        // Issue already exists — add a comment with occurrence count
        const existingIssue = searchData.items[0];
        await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${existingIssue.number}/comments`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${githubPat}`,
              Accept: "application/vnd.github+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              body: `**Nova ocorrencia deste erro**\n\n- **Quando:** ${timestamp}\n- **URL:** ${url}\n- **User Agent:** ${userAgent}`,
            }),
          }
        );

        return new Response(
          JSON.stringify({ success: true, duplicate: true, issue_number: existingIssue.number }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Build issue body
    let issueBody = `> Erro capturado automaticamente pelo sistema\n\n`;
    issueBody += `**Fingerprint:** \`${fingerprint}\`\n\n`;
    issueBody += `### Erro\n\`\`\`\n${message}\n\`\`\`\n\n`;

    if (stack) {
      issueBody += `### Stack Trace\n\`\`\`\n${sanitizeStack(stack)}\n\`\`\`\n\n`;
    }

    if (componentStack) {
      issueBody += `### Component Stack (React)\n\`\`\`\n${componentStack}\n\`\`\`\n\n`;
    }

    issueBody += `### Contexto\n`;
    issueBody += `- **URL:** ${url}\n`;
    issueBody += `- **Quando:** ${timestamp}\n`;
    issueBody += `- **User Agent:** ${userAgent}\n\n`;

    issueBody += `### Instrucoes para Claude Code\n`;
    issueBody += `Analise o stack trace acima, identifique o arquivo e linha do erro, `;
    issueBody += `investigue a causa raiz e proponha um fix.\n`;

    const ghResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: "application/vnd.github+npm+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: ["bug", "auto-reported", "claude-analyze"],
        }),
      }
    );

    if (!ghResponse.ok) {
      const ghError = await ghResponse.text();
      console.error("GitHub API error:", ghError);
      throw new Error("Failed to create GitHub issue");
    }

    const ghData = await ghResponse.json();

    return new Response(
      JSON.stringify({ success: true, issue_number: ghData.number, issue_url: ghData.html_url }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Auto-report error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
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
