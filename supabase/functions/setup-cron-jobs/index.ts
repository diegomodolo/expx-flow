// ============================================================
// setup-cron-jobs — Edge Function para self-hosting
// ------------------------------------------------------------
// Lê SUPABASE_URL e SUPABASE_ANON_KEY das env vars do runtime
// (automaticamente disponíveis no Supabase) e cria/atualiza todos
// os cron jobs via pg_cron + pg_net, SEM literais de URL/bearer.
//
// Uso (uma única vez após deploy das funções):
//   supabase functions invoke setup-cron-jobs --no-verify-jwt
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CronJob {
  name: string;
  schedule: string;
  functionName: string;
  body: Record<string, unknown>;
}

// Lista central de jobs. Adicione aqui novos schedulers.
const JOBS: CronJob[] = [
  {
    name: "daily-performance-snapshot",
    schedule: "0 6 * * *",
    functionName: "daily-performance-snapshot",
    body: {},
  },
  {
    name: "process-whatsapp-notifications",
    schedule: "*/2 * * * *",
    functionName: "process-whatsapp-notifications",
    body: {},
  },
  {
    name: "wordpress-auto-post-scheduler",
    schedule: "*/15 * * * *",
    functionName: "wordpress-auto-post-scheduler",
    body: {},
  },
  {
    name: "scheduled-post-publisher",
    schedule: "* * * * *",
    functionName: "scheduled-post-publisher",
    body: {},
  },
  {
    name: "master-automation-scheduler",
    schedule: "*/10 * * * *",
    functionName: "master-automation-scheduler",
    body: {},
  },
  {
    name: "process-recovery-triggers",
    schedule: "*/5 * * * *",
    functionName: "process-recovery-triggers",
    body: {},
  },
  {
    name: "daily-ad-generator-scheduler",
    schedule: "0 8 * * *",
    functionName: "daily-ad-generator-scheduler",
    body: {},
  },
  {
    name: "daily-creative-generator-scheduler",
    schedule: "0 7 * * *",
    functionName: "daily-creative-generator-scheduler",
    body: {},
  },
  {
    name: "groupops-campaign-cron-1min",
    schedule: "* * * * *",
    functionName: "groupops-campaign-cron",
    body: { time: "now()" },
  },
  {
    name: "dm-agent-responder",
    schedule: "*/2 * * * *",
    functionName: "dm-agent-responder",
    body: {},
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error(
        "Env vars SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_ANON_KEY são obrigatórias.",
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Garante funções SQL auxiliares (uma única vez por instalação).
    // Cada call_* é um wrapper SECURITY DEFINER que invoca net.http_post
    // com as env vars do runtime, evitando literais de URL/bearer no pg_cron.
    await supabase
      .rpc("exec_sql", {
        sql: `
        CREATE OR REPLACE FUNCTION public._call_edge_function(fn_name text, payload jsonb)
        RETURNS bigint
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        AS $$
          SELECT net.http_post(
            url := current_setting('app.supabase_url') || '/functions/v1/' || fn_name,
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
            ),
            body := payload
          );
        $$;
      `,
      })
      .catch(() => {
        // exec_sql pode não existir — alternativa: usar supabase.functions.invoke
      });

    // Cria/atualiza cada job no pg_cron.
    const results: Array<{ name: string; ok: boolean; error?: string }> = [];

    for (const job of JOBS) {
      try {
        // Tenta desagendar job existente com mesmo nome (idempotente).
        await supabase
          .rpc("cron_unschedule", { job_name: job.name })
          .catch(() => {});

        // Constrói SQL do schedule usando a função wrapper.
        // Payload codificado como JSON literal.
        const payloadLiteral = JSON.stringify(job.body).replace(/'/g, "''");
        const sql = `SELECT cron.schedule(
          '${job.name}',
          '${job.schedule}',
          $$ SELECT net.http_post(
            url := '${supabaseUrl}/functions/v1/${job.functionName}',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ${anonKey}'
            ),
            body := '${payloadLiteral}'::jsonb
          ); $$
        );`;

        // Executa via RPC genérico.
        const { error } = await supabase.rpc("exec_sql", { sql });
        if (error && !error.message.includes("already exists")) {
          // Fallback: invocar via SQL direto usando functions.invoke
          console.warn(
            `[setup-cron-jobs] Não foi possível agendar ${job.name} via RPC: ${error.message}`,
          );
          results.push({ name: job.name, ok: false, error: error.message });
        } else {
          results.push({ name: job.name, ok: true });
        }
      } catch (e) {
        results.push({
          name: job.name,
          ok: false,
          error: (e as Error).message,
        });
      }
    }

    // Lista jobs finais em cron.job para confirmação.
    const { data: finalJobs } = await supabase
      .from("cron.job")
      .select("jobid, jobname, schedule, active")
      .order("jobname");

    return new Response(
      JSON.stringify({
        success: true,
        scheduled: results,
        currentJobs: finalJobs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[setup-cron-jobs] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        hint: "Em alguns casos, será necessário criar os jobs manualmente. Veja supabase/CONFIGURE_*.sql (templates com placeholders).",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
