import { useMemo } from "react";
import { useTeams, Team, TeamMember } from "@/hooks/useTeams";
import { useTasks, Task } from "@/hooks/useTasks";
import { useClients } from "@/hooks/useClients";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { differenceInDays, parseISO, isAfter, subDays } from "date-fns";

export interface MemberPerformance {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  squadName: string;
  squadColor: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgCompletionDays: number;
  tasksLast7Days: number;
  tasksLast30Days: number;
}

export interface SquadPerformance {
  id: string;
  name: string;
  color: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  leaderName: string | null;
  membersCount: number;
  clientsCount: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgCompletionDays: number;
  tasksLast7Days: number;
  tasksLast30Days: number;
  productivityScore: number;
  members: MemberPerformance[];
}

export interface DashboardKPIs {
  totalSquads: number;
  totalMembers: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  globalCompletionRate: number;
  avgCompletionDays: number;
  tasksLast7Days: number;
  tasksLast30Days: number;
  topSquad: string | null;
  bottomSquad: string | null;
}

export function useSquadDashboard() {
  const { teams, loading: teamsLoading } = useTeams();
  const { tasks, loading: tasksLoading } = useTasks();
  const { clients } = useClients();
  const { employees, loading: employeesLoading } = useEmployees();

  const loading = teamsLoading || tasksLoading || employeesLoading;

  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const thirtyDaysAgo = subDays(now, 30);

  const squadsPerformance = useMemo<SquadPerformance[]>(() => {
    if (!teams.length) return [];

    return teams.map((team) => {
      const teamTasks = tasks.filter((t) => t.team_id === team.id);
      const teamClients = clients.filter((c) => c.team_id === team.id);
      const teamMembers = team.members || [];

      const completed = teamTasks.filter((t) => t.status === "done");
      const inProgress = teamTasks.filter((t) => t.status === "progress");
      const todo = teamTasks.filter((t) => t.status === "todo");
      const overdue = teamTasks.filter(
        (t) => t.status !== "done" && t.deadline && isAfter(now, parseISO(t.deadline))
      );

      const completionDays = completed
        .filter((t) => t.created_at && (t as unknown).completed_at)
        .map((t) => differenceInDays(parseISO((t as unknown).completed_at), parseISO(t.created_at!)))
        .filter((d) => d >= 0);

      const avgDays = completionDays.length > 0
        ? Math.round(completionDays.reduce((a, b) => a + b, 0) / completionDays.length)
        : 0;

      const last7 = teamTasks.filter(
        (t) => t.status === "done" && (t as unknown).completed_at && isAfter(parseISO((t as unknown).completed_at), sevenDaysAgo)
      ).length;

      const last30 = teamTasks.filter(
        (t) => t.status === "done" && (t as unknown).completed_at && isAfter(parseISO((t as unknown).completed_at), thirtyDaysAgo)
      ).length;

      const completionRate = teamTasks.length > 0
        ? Math.round((completed.length / teamTasks.length) * 100)
        : 0;

      // Productivity score = weighted combination
      const productivityScore = Math.min(100, Math.round(
        (completionRate * 0.4) +
        (Math.min(last7 * 5, 30)) +
        (overdue.length === 0 ? 20 : Math.max(0, 20 - overdue.length * 4)) +
        (avgDays <= 3 ? 10 : avgDays <= 7 ? 5 : 0)
      ));

      // Per-member performance
      const memberPerformances: MemberPerformance[] = teamMembers.map((member) => {
        const memberEmployee = employees.find((e) => e.id === member.id);
        const userId = member.user_id || memberEmployee?.user_id;
        const memberTasks = tasks.filter(
          (t) => t.team_id === team.id && (t.assigned_user_id === userId || t.user_id === userId)
        );
        const mCompleted = memberTasks.filter((t) => t.status === "done");
        const mInProgress = memberTasks.filter((t) => t.status === "progress");
        const mOverdue = memberTasks.filter(
          (t) => t.status !== "done" && t.deadline && isAfter(now, parseISO(t.deadline))
        );

        const mCompletionDays = mCompleted
          .filter((t) => t.created_at && (t as unknown).completed_at)
          .map((t) => differenceInDays(parseISO((t as unknown).completed_at), parseISO(t.created_at!)))
          .filter((d) => d >= 0);

        const mLast7 = mCompleted.filter(
          (t) => (t as unknown).completed_at && isAfter(parseISO((t as unknown).completed_at), sevenDaysAgo)
        ).length;

        const mLast30 = mCompleted.filter(
          (t) => (t as unknown).completed_at && isAfter(parseISO((t as unknown).completed_at), thirtyDaysAgo)
        ).length;

        return {
          id: member.id,
          name: member.name,
          avatar: member.avatar,
          role: member.role,
          squadName: team.name,
          squadColor: team.color,
          totalTasks: memberTasks.length,
          completedTasks: mCompleted.length,
          inProgressTasks: mInProgress.length,
          overdueTasks: mOverdue.length,
          completionRate: memberTasks.length > 0
            ? Math.round((mCompleted.length / memberTasks.length) * 100)
            : 0,
          avgCompletionDays: mCompletionDays.length > 0
            ? Math.round(mCompletionDays.reduce((a, b) => a + b, 0) / mCompletionDays.length)
            : 0,
          tasksLast7Days: mLast7,
          tasksLast30Days: mLast30,
        };
      });

      return {
        id: team.id,
        name: team.name,
        color: team.color,
        icon: team.icon,
        iconColor: team.icon_color,
        iconBg: team.icon_bg,
        leaderName: team.leader?.name || null,
        membersCount: teamMembers.length,
        clientsCount: teamClients.length,
        totalTasks: teamTasks.length,
        completedTasks: completed.length,
        inProgressTasks: inProgress.length,
        todoTasks: todo.length,
        overdueTasks: overdue.length,
        completionRate,
        avgCompletionDays: avgDays,
        tasksLast7Days: last7,
        tasksLast30Days: last30,
        productivityScore,
        members: memberPerformances,
      };
    }).sort((a, b) => b.productivityScore - a.productivityScore);
  }, [teams, tasks, clients, employees, now]);

  const kpis = useMemo<DashboardKPIs>(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const inProgressTasks = tasks.filter((t) => t.status === "progress").length;
    const overdueTasks = tasks.filter(
      (t) => t.status !== "done" && t.deadline && isAfter(now, parseISO(t.deadline))
    ).length;

    const completionDays = tasks
      .filter((t) => t.status === "done" && t.created_at && (t as unknown).completed_at)
      .map((t) => differenceInDays(parseISO((t as unknown).completed_at), parseISO(t.created_at!)))
      .filter((d) => d >= 0);

    const last7 = tasks.filter(
      (t) => t.status === "done" && (t as unknown).completed_at && isAfter(parseISO((t as unknown).completed_at), sevenDaysAgo)
    ).length;

    const last30 = tasks.filter(
      (t) => t.status === "done" && (t as unknown).completed_at && isAfter(parseISO((t as unknown).completed_at), thirtyDaysAgo)
    ).length;

    const sorted = [...squadsPerformance].sort((a, b) => b.productivityScore - a.productivityScore);

    return {
      totalSquads: teams.length,
      totalMembers: employees.length,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      globalCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      avgCompletionDays: completionDays.length > 0
        ? Math.round(completionDays.reduce((a, b) => a + b, 0) / completionDays.length)
        : 0,
      tasksLast7Days: last7,
      tasksLast30Days: last30,
      topSquad: sorted[0]?.name || null,
      bottomSquad: sorted.length > 1 ? sorted[sorted.length - 1]?.name || null : null,
    };
  }, [tasks, teams, employees, squadsPerformance, now]);

  // Ranking of all members across squads
  const membersRanking = useMemo<MemberPerformance[]>(() => {
    return squadsPerformance
      .flatMap((s) => s.members)
      .sort((a, b) => b.completedTasks - a.completedTasks);
  }, [squadsPerformance]);

  return {
    loading,
    kpis,
    squadsPerformance,
    membersRanking,
  };
}
