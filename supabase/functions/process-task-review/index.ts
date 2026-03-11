import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":
    Deno.env.get("FRONTEND_URL") ?? "https://controledetrafego.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const QUALITY_REDUCTION: Record<string, number> = {
  very_bad: 20,
  bad: 10,
  adjustments: 5,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { taskId, action, rejectionReason, comment, companyId } = body;

    if (!taskId || !action || !companyId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!["approved", "rejected"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "rejected" && !rejectionReason) {
      return new Response(
        JSON.stringify({ error: "Rejection reason required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get reviewer employee record
    const { data: reviewer, error: reviewerError } = await supabase
      .from("employees")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .single();

    if (reviewerError || !reviewer) {
      return new Response(JSON.stringify({ error: "Reviewer not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the reviewer is an authorizer for this task
    const { data: authMember } = await supabase
      .from("task_members" as unknown)
      .select("id")
      .eq("task_id", taskId)
      .eq("employee_id", reviewer.id)
      .eq("role", "authorizer")
      .maybeSingle();

    if (!authMember) {
      return new Response(
        JSON.stringify({ error: "Not authorized to review this task" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get task current state
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        "id, title, status, task_quality_score, team_id, responsible_name, related_client_id, assigned_user_id, user_id, rejection_count",
      )
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (task.status !== "review") {
      return new Response(
        JSON.stringify({ error: "Task is not in review status" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const qualityBefore = Number(task.task_quality_score ?? 100);
    let qualityAfter = qualityBefore;
    let newStatus: string;
    let todoColumnId: string | null = null;

    if (action === "approved") {
      newStatus = "done";
      qualityAfter = qualityBefore;
    } else {
      const reduction = QUALITY_REDUCTION[rejectionReason] ?? 10;
      qualityAfter = Math.max(0, qualityBefore - reduction);
      newStatus = "todo";

      // Find the "todo" column for the responsible user's board so the card
      // goes back to the "Pendente" column visually on their Kanban board.
      // Use assigned_user_id first, fallback to user_id
      const targetUserId = task.assigned_user_id || task.user_id;
      if (targetUserId) {
        const { data: todoCols } = await supabase
          .from("task_board_columns")
          .select("id")
          .eq("user_id", targetUserId)
          .eq("status", "todo")
          .order("order_index", { ascending: true })
          .limit(1);

        if (todoCols && todoCols.length > 0) {
          todoColumnId = todoCols[0].id;
        }
      }
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      task_quality_score: qualityAfter,
      completed_at: action === "approved" ? new Date().toISOString() : null,
    };

    if (action === "approved") {
      updatePayload.progress = 100;
      // Clear rejection signal on approval
      updatePayload.last_rejected_at = null;
    } else {
      updatePayload.last_rejected_at = new Date().toISOString();
      updatePayload.rejection_count = Number(task.rejection_count ?? 0) + 1;
      if (todoColumnId) {
        updatePayload.quadro_column_id = todoColumnId;
      }
    }

    // Update task
    const { error: updateError } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", taskId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update task" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert review history
    await supabase.from("task_review_history" as unknown).insert({
      task_id: taskId,
      company_id: companyId,
      reviewer_employee_id: reviewer.id,
      action,
      rejection_reason: action === "rejected" ? rejectionReason : null,
      quality_before: qualityBefore,
      quality_after: qualityAfter,
      comment: comment || null,
    });

    // Send Discord notification for rejection
    if (action === "rejected") {
      try {
        const { data: config } = await supabase
          .from("discord_config" as unknown)
          .select("*")
          .eq("company_id", companyId)
          .maybeSingle();

        if (
          config?.is_connected &&
          config?.enabled &&
          config?.notify_task_rejected
        ) {
          const { data: team } = await supabase
            .from("teams")
            .select("discord_channel_id, name")
            .eq("id", task.team_id)
            .maybeSingle();

          if (team?.discord_channel_id) {
            const reasonLabels: Record<string, string> = {
              very_bad: "Muito ruim (-20%)",
              bad: "Ruim (-10%)",
              adjustments: "Só ajustes (-5%)",
            };

            await supabase.functions.invoke("discord-bot", {
              body: {
                action: "send-message",
                channel_id: team.discord_channel_id,
                company_id: companyId,
                embed: {
                  title: "❌ Tarefa Rejeitada",
                  color: 0xef4444,
                  fields: [
                    { name: "Tarefa", value: task.title, inline: false },
                    {
                      name: "Responsável",
                      value: task.responsible_name || "—",
                      inline: true,
                    },
                    { name: "Autorizador", value: reviewer.name, inline: true },
                    {
                      name: "Motivo",
                      value: reasonLabels[rejectionReason] || rejectionReason,
                      inline: true,
                    },
                    {
                      name: "Qualidade",
                      value: `${qualityBefore}% → ${qualityAfter}%`,
                      inline: true,
                    },
                    ...(comment
                      ? [{ name: "Comentário", value: comment, inline: false }]
                      : []),
                  ],
                  timestamp: new Date().toISOString(),
                },
              },
            });
          }
        }
      } catch (discordErr) {
        console.error("Discord notification error:", discordErr);
      }
    }

    // ── Fase 6: Notificação in-app para o responsável pela tarefa ──
    try {
      const targetUserId = task.assigned_user_id || task.user_id;
      if (targetUserId) {
        const reasonLabels: Record<string, string> = {
          very_bad: "Muito ruim",
          bad: "Ruim",
          adjustments: "Precisa de ajustes",
        };

        await supabase.from("user_notifications").insert({
          company_id: companyId,
          user_id: targetUserId,
          type: action === "approved" ? "task_review" : "task_review",
          title:
            action === "approved"
              ? `✅ Tarefa aprovada — ${task.title}`
              : `❌ Tarefa rejeitada — ${task.title}`,
          body:
            action === "approved"
              ? `Aprovada por ${reviewer.name}. Qualidade: ${qualityAfter}%`
              : `Rejeitada por ${reviewer.name}. Motivo: ${reasonLabels[rejectionReason] || rejectionReason}. Qualidade: ${qualityBefore}% → ${qualityAfter}%${comment ? `. Comentário: ${comment}` : ""}`,
          priority: action === "rejected" ? "high" : "normal",
          action_url: "/tarefas",
          action_metadata: {
            task_id: taskId,
            task_title: task.title,
            action,
          },
          source_type: "task",
          source_id: taskId,
        });
      }
    } catch (notifErr) {
      console.error("In-app notification error:", notifErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        newStatus,
        qualityBefore,
        qualityAfter,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
