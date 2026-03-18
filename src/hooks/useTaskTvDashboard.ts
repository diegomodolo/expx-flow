import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface ActiveSession {
  session_id: string;
  task_id: string;
  task_title: string;
  task_priority: string;
  task_deadline: string | null;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  started_at: string;
  client_id: string | null;
  client_name: string | null;
  client_avatar: string | null;
}

export interface CollaboratorRanking {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  in_progress_tasks: number;
  regularity: number;
  quality: number;
  efficiency: number;
  score: number;
}

export interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  due_date: string | null;
  responsible_name: string | null;
  responsible_avatar: string | null;
  assigned_user_id: string | null;
  user_id: string | null;
}

export interface SquadTvRanking {
  team_id: string;
  team_name: string;
  team_color: string | null;
  productivityScore: number;
  activeSessions: number;
  overdueTasks: number;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
}

export interface CompletionTrendDay {
  day: string; // formatted "dd/MM"
  date: string; // ISO date string
  count: number;
}

export interface HourlyTrendPoint {
  hour: string; // "HH:00"
  count: number;
  avg: number; // average from last week's weekdays at same hour
  isCurrent: boolean;
}

export interface TaskTvData {
  openTasks: number;
  overdueTasks: number;
  completedToday: number;
  executingNow: number;
  reviewTasks: number;
  hoursTrackedLast7Days: number;
  avgHoursPerCollaborator: number;
  regularity: number;
  quality: number;
  efficiency: number;
  activeSessions: ActiveSession[];
  rankings: CollaboratorRanking[];
  squadRankings: SquadTvRanking[];
  completionTrend: CompletionTrendDay[];
  hourlyTrend: HourlyTrendPoint[];
  weekOverWeekPct: number; // % difference this week vs last week (same period)
  lastSync: Date;
  // Lists for modal drill-down
  openTasksList: TaskItem[];
  overdueTasksList: TaskItem[];
  completedTodayList: TaskItem[];
  reviewTasksList: TaskItem[];
}

export function useTaskTvDashboard(refreshMs = 30_000) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["task-tv-dashboard", activeCompany?.company_id],
    queryFn: async (): Promise<TaskTvData> => {
      const companyId = activeCompany?.company_id;
      if (!companyId) throw new Error("No company");

      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).toISOString();
      const weekAgo = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const fourteenDaysAgo = new Date(
        now.getTime() - 14 * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Parallel fetches
      const [
        tasksRes,
        activeSessionsRes,
        weekTasksRes,
        reviewTasksRes,
        timeTrackingRes,
        completedLast14Res,
        teamsRes,
      ] = await Promise.all([
        supabase
          .from("tasks")
          .select(
            "id, title, status, priority, deadline, due_date, responsible_name, responsible_avatar, assigned_user_id, user_id, team_id",
          )
          .eq("company_id", companyId)
          .neq("status", "cancelled"),
        supabase
          .from("task_time_tracking")
          .select("id, task_id, user_id, started_at")
          .eq("company_id", companyId)
          .is("ended_at", null),
        supabase
          .from("tasks")
          .select(
            "id, title, status, priority, deadline, due_date, assigned_user_id, user_id, team_id, created_at",
          )
          .eq("company_id", companyId)
          .gte("created_at", weekAgo),
        supabase
          .from("tasks")
          .select(
            "id, title, status, priority, deadline, due_date, responsible_name, responsible_avatar, assigned_user_id, user_id",
          )
          .eq("company_id", companyId)
          .eq("status", "review"),
        supabase
          .from("task_time_tracking")
          .select("duration_minutes, user_id")
          .eq("company_id", companyId)
          .gte("started_at", weekAgo)
          .not("duration_minutes", "is", null),
        supabase
          .from("tasks")
          .select(
            "id, title, status, priority, deadline, due_date, responsible_name, responsible_avatar, assigned_user_id, user_id, updated_at",
          )
          .eq("company_id", companyId)
          .eq("status", "done")
          .gte("updated_at", fourteenDaysAgo)
          .order("updated_at", { ascending: false }),
        supabase
          .from("teams")
          .select("id, name, color")
          .eq("company_id", companyId),
      ]);

      const tasks = tasksRes.data || [];
      const rawSessions = activeSessionsRes.data || [];
      const weekTasks = weekTasksRes.data || [];
      const reviewTasksData = reviewTasksRes.data || [];
      const timeTrackingData = timeTrackingRes.data || [];
      const completedLast14 = completedLast14Res.data || [];
      const teamsData = teamsRes.data || [];

      // --- KPIs ---
      const openTasks = tasks.filter(
        (t) => !["done", "cancelled", "review"].includes(t.status),
      ).length;
      const overdueTasks = tasks.filter((t) => {
        if (["done", "cancelled"].includes(t.status)) return false;
        const deadline = t.due_date || t.deadline;
        return deadline && new Date(deadline) < now;
      }).length;

      // Completed today
      const completedTodayRes = await supabase
        .from("tasks")
        .select(
          "id, title, status, priority, deadline, due_date, responsible_name, responsible_avatar, assigned_user_id, user_id, updated_at",
        )
        .eq("company_id", companyId)
        .eq("status", "done")
        .gte("updated_at", todayStart);
      const completedToday = (completedTodayRes.data || []).length;

      const executingNow = rawSessions.length;
      const reviewTasks = reviewTasksData.length;

      // --- Hours tracked (last 7 days) ---
      const totalMinutes = timeTrackingData.reduce(
        (sum, r) => sum + (r.duration_minutes || 0),
        0,
      );
      const hoursTrackedLast7Days = Math.round((totalMinutes / 60) * 10) / 10;
      const uniqueCollaboratorsWithTracking = new Set(
        timeTrackingData.map((r) => r.user_id),
      ).size;
      const avgHoursPerCollaborator =
        uniqueCollaboratorsWithTracking > 0
          ? Math.round(
              (hoursTrackedLast7Days / uniqueCollaboratorsWithTracking) * 10,
            ) / 10
          : 0;

      // --- Completion trend (last 14 days) ---
      const trendMap = new Map<string, number>();
      // Init all 14 days with 0
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        trendMap.set(key, 0);
      }
      completedLast14.forEach((t) => {
        if (t.updated_at) {
          const key = t.updated_at.split("T")[0];
          trendMap.set(key, (trendMap.get(key) || 0) + 1);
        }
      });
      const completionTrend: CompletionTrendDay[] = Array.from(
        trendMap.entries(),
      ).map(([dateStr, count]) => {
        const d = new Date(dateStr + "T12:00:00");
        return {
          day: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
          date: dateStr,
          count,
        };
      });

      // --- Hourly trend (today 08h+, with last week weekday averages) ---
      const currentHour = now.getHours();
      const startHour = 8;
      const hourlyMap = new Map<number, number>();
      for (let h = startHour; h <= Math.max(currentHour, startHour); h++)
        hourlyMap.set(h, 0);

      (completedTodayRes.data || []).forEach((t: unknown) => {
        if (t.updated_at) {
          const h = new Date(t.updated_at).getHours();
          if (hourlyMap.has(h)) hourlyMap.set(h, (hourlyMap.get(h) || 0) + 1);
        }
      });

      // Calculate last week weekday (Mon-Fri) hourly averages
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(now);
      lastWeekEnd.setDate(
        lastWeekEnd.getDate() -
          (now.getDay() === 0 ? 2 : now.getDay() === 6 ? 1 : 0),
      );

      // Filter completedLast14 to last week's weekdays only
      const lastWeekWeekdayTasks = completedLast14.filter((t) => {
        if (!t.updated_at) return false;
        const d = new Date(t.updated_at);
        const day = d.getDay();
        if (day === 0 || day === 6) return false; // skip weekends
        // Must be from last week (7-13 days ago from today start)
        const todayDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const taskDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const daysAgo = Math.floor(
          (todayDate.getTime() - taskDate.getTime()) / (24 * 60 * 60 * 1000),
        );
        return daysAgo >= 1 && daysAgo <= 7;
      });

      // Count weekdays in last week that are within the 7-day window
      const weekdayCount = (() => {
        let count = 0;
        for (let i = 1; i <= 7; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const day = d.getDay();
          if (day !== 0 && day !== 6) count++;
        }
        return count;
      })();

      const lastWeekHourlyMap = new Map<number, number>();
      lastWeekWeekdayTasks.forEach((t) => {
        const h = new Date(t.updated_at!).getHours();
        lastWeekHourlyMap.set(h, (lastWeekHourlyMap.get(h) || 0) + 1);
      });

      const hourlyTrend: HourlyTrendPoint[] = Array.from(
        hourlyMap.entries(),
      ).map(([h, count]) => ({
        hour: `${String(h).padStart(2, "0")}h`,
        count,
        avg:
          weekdayCount > 0
            ? Math.round(
                ((lastWeekHourlyMap.get(h) || 0) / weekdayCount) * 10,
              ) / 10
            : 0,
        isCurrent: h === currentHour,
      }));

      // --- Week-over-week KPI (same period comparison) ---
      // This week: from Monday 00:00 to now
      const todayDow = now.getDay(); // 0=Sun
      const daysSinceMonday = todayDow === 0 ? 6 : todayDow - 1;
      const thisWeekMonday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - daysSinceMonday,
      );
      const lastWeekMonday = new Date(thisWeekMonday);
      lastWeekMonday.setDate(lastWeekMonday.getDate() - 7);
      // Equivalent point last week = lastWeekMonday + daysSinceMonday days + currentHour hours
      const lastWeekCutoff = new Date(lastWeekMonday);
      lastWeekCutoff.setDate(lastWeekCutoff.getDate() + daysSinceMonday);
      lastWeekCutoff.setHours(currentHour, now.getMinutes(), 0, 0);

      // Count completed tasks this week up to now
      const thisWeekCount =
        completedLast14.filter((t) => {
          if (!t.updated_at) return false;
          const d = new Date(t.updated_at);
          return d >= thisWeekMonday && d <= now;
        }).length +
        (completedTodayRes.data || []).filter((t: unknown) => {
          if (!t.updated_at) return false;
          const d = new Date(t.updated_at);
          return d >= thisWeekMonday && d <= now;
        }).length;

      // Deduplicate: completedLast14 may include today's tasks too
      const thisWeekIds = new Set<string>();
      completedLast14.forEach((t) => {
        if (!t.updated_at) return;
        const d = new Date(t.updated_at);
        if (d >= thisWeekMonday && d <= now) thisWeekIds.add(t.id);
      });
      (completedTodayRes.data || []).forEach((t: unknown) => {
        if (!t.updated_at) return;
        const d = new Date(t.updated_at);
        if (d >= thisWeekMonday && d <= now) thisWeekIds.add(t.id);
      });
      const thisWeekTotal = thisWeekIds.size;

      // Count completed tasks last week same period
      const lastWeekIds = new Set<string>();
      completedLast14.forEach((t) => {
        if (!t.updated_at) return;
        const d = new Date(t.updated_at);
        if (d >= lastWeekMonday && d <= lastWeekCutoff) lastWeekIds.add(t.id);
      });
      const lastWeekTotal = lastWeekIds.size;

      const weekOverWeekPct =
        lastWeekTotal > 0
          ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
          : thisWeekTotal > 0
            ? 100
            : 0;

      // --- Indicators ---
      const onTime = tasks.filter((t) => {
        if (["done", "cancelled"].includes(t.status)) return false;
        const deadline = t.due_date || t.deadline;
        return !deadline || new Date(deadline) >= now;
      }).length;
      const regularity =
        openTasks > 0 ? Math.round((onTime / openTasks) * 100) : 100;

      const doneTasks = tasks.filter((t) => t.status === "done");
      const doneOnTime = doneTasks.filter((t) => {
        const deadline = t.due_date || t.deadline;
        return !deadline;
      }).length;
      const quality =
        doneTasks.length > 0
          ? Math.round(
              ((doneTasks.length - (doneTasks.length - doneOnTime)) /
                doneTasks.length) *
                100,
            )
          : 100;
      const efficiency = Math.round((regularity + quality) / 2);

      // --- Active sessions with user info ---
      const sessionUserIds = [...new Set(rawSessions.map((s) => s.user_id))];
      const sessionTaskIds = [...new Set(rawSessions.map((s) => s.task_id))];

      const [profilesRes, sessionTasksRes] = await Promise.all([
        sessionUserIds.length > 0
          ? supabase
              .from("profiles")
              .select("user_id, full_name, avatar_url")
              .in("user_id", sessionUserIds)
          : Promise.resolve({ data: [] }),
        sessionTaskIds.length > 0
          ? supabase
              .from("tasks")
              .select(
                "id, title, priority, deadline, due_date, related_client_id",
              )
              .in("id", sessionTaskIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map(
        (profilesRes.data || []).map((p: unknown) => [p.user_id, p]),
      );
      const taskMap = new Map(
        (sessionTasksRes.data || []).map((t: unknown) => [t.id, t]),
      );

      // Fetch client info for tasks in active sessions (column is related_client_id)
      const sessionClientIds = [
        ...new Set(
          (sessionTasksRes.data || [])
            .map((t: unknown) => t.related_client_id)
            .filter(Boolean),
        ),
      ] as string[];

      const clientsRes =
        sessionClientIds.length > 0
          ? await supabase
              .from("clients")
              .select("id, name, avatar")
              .in("id", sessionClientIds)
          : { data: [] };
      const clientMap = new Map(
        (clientsRes.data || []).map((c: unknown) => [c.id, c]),
      );

      const activeSessions: ActiveSession[] = rawSessions.map((s) => {
        const profile = profileMap.get(s.user_id) as unknown;
        const task = taskMap.get(s.task_id) as unknown;
        const client = task?.related_client_id
          ? (clientMap.get(task.related_client_id) as unknown)
          : null;
        return {
          session_id: s.id,
          task_id: s.task_id,
          task_title: task?.title || "Tarefa",
          task_priority: task?.priority || "medium",
          task_deadline: task?.due_date || task?.deadline || null,
          user_id: s.user_id,
          user_name: profile?.full_name || "Colaborador",
          user_avatar: profile?.avatar_url || null,
          started_at: s.started_at,
          client_id: task?.related_client_id || null,
          client_name: client?.name || null,
          client_avatar: client?.avatar || null,
        };
      });

      // --- Rankings (last 7 days) ---
      const allUserIds = [
        ...new Set([
          ...weekTasks
            .map((t) => t.assigned_user_id || t.user_id)
            .filter(Boolean),
        ]),
      ] as string[];

      let rankings: CollaboratorRanking[] = [];
      if (allUserIds.length > 0) {
        const { data: rankProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", allUserIds);

        const rankProfileMap = new Map(
          (rankProfiles || []).map((p: unknown) => [p.user_id, p]),
        );

        rankings = allUserIds
          .map((uid) => {
            const userTasks = weekTasks.filter(
              (t) => (t.assigned_user_id || t.user_id) === uid,
            );
            const total = userTasks.length;
            const completed = userTasks.filter(
              (t) => t.status === "done",
            ).length;
            const overdue = userTasks.filter((t) => {
              const dl = t.due_date || t.deadline;
              return dl && new Date(dl) < now && t.status !== "done";
            }).length;
            const inProgress = userTasks.filter(
              (t) => t.status === "progress",
            ).length;
            const regularity =
              total > 0 ? Math.round(((total - overdue) / total) * 100) : 0;
            const quality =
              total > 0 ? Math.round((completed / total) * 100) : 0;
            const efficiency =
              total > 0
                ? Math.round(((completed + inProgress * 0.5) / total) * 100)
                : 0;
            const score = Math.round(
              regularity * 0.4 + quality * 0.4 + efficiency * 0.2,
            );

            const profile = rankProfileMap.get(uid) as unknown;
            return {
              user_id: uid,
              user_name: profile?.full_name || "Colaborador",
              user_avatar: profile?.avatar_url || null,
              total_tasks: total,
              completed_tasks: completed,
              overdue_tasks: overdue,
              in_progress_tasks: inProgress,
              regularity,
              quality,
              efficiency,
              score,
            };
          })
          .filter((r) => r.total_tasks > 0)
          .sort((a, b) => b.score - a.score);
      }

      // --- Squad Rankings ---
      const teamColorMap = new Map(
        teamsData.map((t: unknown) => [t.id, { name: t.name, color: t.color }]),
      );
      const squadMap = new Map<
        string,
        {
          name: string;
          color: string | null;
          totalTasks: number;
          completedTasks: number;
          overdueTasks: number;
          activeSessions: number;
        }
      >();

      tasks.forEach((t) => {
        if (!t.team_id) return;
        const team = teamColorMap.get(t.team_id) as unknown;
        if (!team) return;
        if (!squadMap.has(t.team_id)) {
          squadMap.set(t.team_id, {
            name: team.name,
            color: team.color,
            totalTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            activeSessions: 0,
          });
        }
        const sq = squadMap.get(t.team_id)!;
        sq.totalTasks++;
        if (t.status === "done") sq.completedTasks++;
        const dl = t.due_date || t.deadline;
        if (
          dl &&
          new Date(dl) < now &&
          !["done", "cancelled"].includes(t.status)
        )
          sq.overdueTasks++;
      });

      // Count active sessions per squad
      activeSessions.forEach((s) => {
        const task = tasks.find((t) => t.id === s.task_id);
        if (task?.team_id && squadMap.has(task.team_id)) {
          squadMap.get(task.team_id)!.activeSessions++;
        }
      });

      const SQUAD_COLORS = [
        "#6366f1",
        "#10b981",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
        "#06b6d4",
        "#ec4899",
      ];
      let colorIdx = 0;
      const squadRankings: SquadTvRanking[] = Array.from(squadMap.entries())
        .map(([team_id, sq]) => {
          const completionRate =
            sq.totalTasks > 0
              ? Math.round((sq.completedTasks / sq.totalTasks) * 100)
              : 0;
          const overduePenalty =
            sq.totalTasks > 0
              ? Math.round((sq.overdueTasks / sq.totalTasks) * 30)
              : 0;
          const activityBonus =
            sq.activeSessions > 0 ? Math.min(10, sq.activeSessions * 2) : 0;
          const productivityScore = Math.max(
            0,
            Math.min(100, completionRate - overduePenalty + activityBonus),
          );
          const color =
            sq.color || SQUAD_COLORS[colorIdx++ % SQUAD_COLORS.length];
          return {
            team_id,
            team_name: sq.name,
            team_color: color,
            productivityScore,
            activeSessions: sq.activeSessions,
            overdueTasks: sq.overdueTasks,
            completionRate,
            totalTasks: sq.totalTasks,
            completedTasks: sq.completedTasks,
          };
        })
        .filter((s) => s.totalTasks > 0)
        .sort((a, b) => b.productivityScore - a.productivityScore);

      // --- Task lists for modal ---
      const openTasksList: TaskItem[] = tasks
        .filter((t) => !["done", "cancelled", "review"].includes(t.status))
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          deadline: t.deadline,
          due_date: t.due_date,
          responsible_name: t.responsible_name,
          responsible_avatar: t.responsible_avatar,
          assigned_user_id: t.assigned_user_id,
          user_id: t.user_id,
        }));

      const overdueTasksList: TaskItem[] = tasks
        .filter((t) => {
          if (["done", "cancelled"].includes(t.status)) return false;
          const deadline = t.due_date || t.deadline;
          return deadline && new Date(deadline) < now;
        })
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          deadline: t.deadline,
          due_date: t.due_date,
          responsible_name: t.responsible_name,
          responsible_avatar: t.responsible_avatar,
          assigned_user_id: t.assigned_user_id,
          user_id: t.user_id,
        }));

      const completedTodayList: TaskItem[] = (completedTodayRes.data || []).map(
        (t: unknown) => ({
          id: t.id,
          title: t.title || "",
          status: t.status || "done",
          priority: t.priority || "medium",
          deadline: t.deadline || null,
          due_date: t.due_date || null,
          responsible_name: t.responsible_name || null,
          responsible_avatar: t.responsible_avatar || null,
          assigned_user_id: t.assigned_user_id || null,
          user_id: t.user_id || null,
        }),
      );

      const reviewTasksList: TaskItem[] = reviewTasksData.map((t: unknown) => ({
        id: t.id,
        title: t.title || "",
        status: "review",
        priority: t.priority || "medium",
        deadline: t.deadline || null,
        due_date: t.due_date || null,
        responsible_name: t.responsible_name || null,
        responsible_avatar: t.responsible_avatar || null,
        assigned_user_id: t.assigned_user_id || null,
        user_id: t.user_id || null,
      }));

      return {
        openTasks,
        overdueTasks,
        completedToday,
        executingNow,
        reviewTasks,
        hoursTrackedLast7Days,
        avgHoursPerCollaborator,
        regularity,
        quality,
        efficiency,
        activeSessions,
        rankings,
        squadRankings,
        completionTrend,
        hourlyTrend,
        weekOverWeekPct,
        lastSync: new Date(),
        openTasksList,
        overdueTasksList,
        completedTodayList,
        reviewTasksList,
      };
    },
    enabled: !!activeCompany?.company_id,
    refetchInterval: refreshMs,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!activeCompany?.company_id) return;
    const channel = supabase
      .channel("task-tv-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_time_tracking" },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["task-tv-dashboard", activeCompany.company_id],
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["task-tv-dashboard", activeCompany.company_id],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCompany?.company_id, queryClient]);

  return query;
}
