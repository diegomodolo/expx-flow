import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

interface GitHubPR {
  number: number;
  title: string;
  body: string | null;
  merged_at: string | null;
  merge_commit_sha: string | null;
  html_url: string;
  user: {
    login: string;
  };
}

function categorize(message: string): { category: string; cleanTitle: string } {
  const lower = message.toLowerCase().trim();

  if (/^feat(\(.+?\))?:\s*/i.test(lower)) {
    return { category: "feature", cleanTitle: message.replace(/^feat(\(.+?\))?:\s*/i, "") };
  }
  if (/^fix(\(.+?\))?:\s*/i.test(lower)) {
    return { category: "fix", cleanTitle: message.replace(/^fix(\(.+?\))?:\s*/i, "") };
  }
  if (/^(refactor|perf|chore)(\(.+?\))?:\s*/i.test(lower)) {
    return { category: "improvement", cleanTitle: message.replace(/^(refactor|perf|chore)(\(.+?\))?:\s*/i, "") };
  }
  if (/^(docs|style|test|build|ci)(\(.+?\))?:\s*/i.test(lower)) {
    return { category: "other", cleanTitle: message.replace(/^(docs|style|test|build|ci)(\(.+?\))?:\s*/i, "") };
  }

  return { category: "other", cleanTitle: message };
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

    // Get last published_at from release_notes
    const { data: lastNote } = await supabase
      .from("release_notes")
      .select("published_at")
      .order("published_at", { ascending: false })
      .limit(1)
      .single();

    const sinceDate = lastNote?.published_at
      ? new Date(lastNote.published_at).toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const ghHeaders = {
      Authorization: `Bearer ${githubPat}`,
      Accept: "application/vnd.github+json",
    };

    // Fetch commits from main
    const commitsRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/commits?sha=main&since=${sinceDate}&per_page=100`,
      { headers: ghHeaders }
    );

    if (!commitsRes.ok) {
      const errText = await commitsRes.text();
      console.error("GitHub commits API error:", errText);
      throw new Error("Erro ao buscar commits do GitHub");
    }

    const commits: GitHubCommit[] = await commitsRes.json();

    // Fetch merged PRs
    const prsRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
      { headers: ghHeaders }
    );

    if (!prsRes.ok) {
      const errText = await prsRes.text();
      console.error("GitHub PRs API error:", errText);
      throw new Error("Erro ao buscar PRs do GitHub");
    }

    const allPrs: GitHubPR[] = await prsRes.json();
    const mergedPrs = allPrs.filter(
      (pr) => pr.merged_at && new Date(pr.merged_at) >= new Date(sinceDate)
    );

    // Build set of merge commit SHAs from PRs (to deduplicate)
    const prMergeCommitShas = new Set(
      mergedPrs.map((pr) => pr.merge_commit_sha).filter(Boolean)
    );

    // Process PRs
    const entries: Array<{
      title: string;
      category: string;
      description: string | null;
      source_type: string;
      source_ref: string;
      source_url: string;
      author_name: string;
      published_at: string;
    }> = [];

    for (const pr of mergedPrs) {
      const { category, cleanTitle } = categorize(pr.title);
      entries.push({
        title: cleanTitle,
        category,
        description: pr.body ? pr.body.substring(0, 1000) : null,
        source_type: "pr",
        source_ref: `pr-${pr.number}`,
        source_url: pr.html_url,
        author_name: pr.user.login,
        published_at: pr.merged_at!,
      });
    }

    // Process commits (skip those belonging to PRs)
    for (const commit of commits) {
      if (prMergeCommitShas.has(commit.sha)) continue;

      const firstLine = commit.commit.message.split("\n")[0];
      const { category, cleanTitle } = categorize(firstLine);

      entries.push({
        title: cleanTitle,
        category,
        description: null,
        source_type: "commit",
        source_ref: commit.sha.substring(0, 12),
        source_url: commit.html_url,
        author_name: commit.commit.author.name,
        published_at: commit.commit.author.date,
      });
    }

    if (entries.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert by source_ref
    const { error: upsertError } = await supabase
      .from("release_notes")
      .upsert(entries, { onConflict: "source_ref" });

    if (upsertError) {
      console.error("Upsert error:", JSON.stringify(upsertError));
      throw new Error(`Erro ao salvar release notes: ${upsertError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, synced_count: entries.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro sync-release-notes:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

Deno.serve(handler);
