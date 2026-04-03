import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} from "date-fns";

export interface CalendarEvent {
  id: string;
  type: "meeting" | "task" | "deadline" | "presentation";
  title: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  color: string;
  ownerId: string;
  ownerName: string;
  metadata: {
    meetingUrl?: string;
    meetingStatus?: string;
    taskStatus?: string;
    priority?: string;
    presentationId?: string;
    sourceTable?: string;
  };
}

const EVENT_COLORS: Record<CalendarEvent["type"], string> = {
  meeting: "#4CAF50",
  task: "#2196F3",
  deadline: "#FF9800",
  presentation: "#00BCD4",
};

export type CalendarViewMode = "month" | "week" | "day";

interface UseCalendarEventsOptions {
  currentDate: Date;
  viewMode: CalendarViewMode;
  selectedUserIds: string[];
  enabledTypes: CalendarEvent["type"][];
}

function getDateRange(
  currentDate: Date,
  viewMode: CalendarViewMode,
): { from: string; to: string } {
  let start: Date;
  let end: Date;

  switch (viewMode) {
    case "month":
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      break;
    case "week":
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
      break;
    case "day":
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
      break;
  }

  return { from: start.toISOString(), to: end.toISOString() };
}

export function useCalendarEvents({
  currentDate,
  viewMode,
  selectedUserIds,
  enabledTypes,
}: UseCalendarEventsOptions) {
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  return useQuery({
    queryKey: [
      "calendar-events",
      activeCompany?.company_id,
      currentDate.toISOString(),
      viewMode,
      selectedUserIds.sort().join(","),
      enabledTypes.sort().join(","),
    ],
    queryFn: async () => {
      const companyId = activeCompany!.company_id;
      const { from, to } = getDateRange(currentDate, viewMode);
      const events: CalendarEvent[] = [];
      const promises: Promise<void>[] = [];

      // 1. Meetings
      if (enabledTypes.includes("meeting")) {
        promises.push(
          (async () => {
            let query = supabase
              .from("google_meet_meetings")
              .select(
                "id, title, scheduled_at, status, meeting_uri, created_by",
              )
              .eq("company_id", companyId)
              .gte("scheduled_at", from)
              .lte("scheduled_at", to)
              .not("scheduled_at", "is", null);

            if (selectedUserIds.length > 0) {
              query = query.in("created_by", selectedUserIds);
            }

            const { data, error } = await query;
            if (error) {
              console.error("Calendar: erro ao buscar reunioes:", error);
              return;
            }

            for (const m of data || []) {
              events.push({
                id: `meeting-${m.id}`,
                type: "meeting",
                title: m.title || "Reunião",
                start: new Date(m.scheduled_at!),
                allDay: false,
                color: EVENT_COLORS.meeting,
                ownerId: m.created_by,
                ownerName: "",
                metadata: {
                  meetingUrl: m.meeting_uri || undefined,
                  meetingStatus: m.status || undefined,
                  sourceTable: "google_meet_meetings",
                },
              });
            }
          })(),
        );
      }

      // 2. Tasks (start_date)
      if (enabledTypes.includes("task")) {
        promises.push(
          (async () => {
            let query = supabase
              .from("tasks")
              .select(
                "id, title, start_date, due_date, status, priority, user_id, assigned_user_id, responsible_name",
              )
              .eq("company_id", companyId)
              .not("start_date", "is", null)
              .gte("start_date", from)
              .lte("start_date", to);

            if (selectedUserIds.length > 0) {
              query = query.or(
                `user_id.in.(${selectedUserIds.join(",")}),assigned_user_id.in.(${selectedUserIds.join(",")})`,
              );
            }

            const { data, error } = await query;
            if (error) {
              console.error("Calendar: erro ao buscar tarefas:", error);
              return;
            }

            for (const t of data || []) {
              events.push({
                id: `task-${t.id}`,
                type: "task",
                title: t.title,
                start: new Date(t.start_date!),
                end: t.due_date ? new Date(t.due_date) : undefined,
                allDay: false,
                color: EVENT_COLORS.task,
                ownerId: t.user_id,
                ownerName: t.responsible_name || "",
                metadata: {
                  taskStatus: t.status,
                  priority: t.priority || undefined,
                  sourceTable: "tasks",
                },
              });
            }
          })(),
        );
      }

      // 3. Deadlines
      if (enabledTypes.includes("deadline")) {
        promises.push(
          (async () => {
            let query = supabase
              .from("tasks")
              .select(
                "id, title, due_date, status, priority, user_id, assigned_user_id, responsible_name",
              )
              .eq("company_id", companyId)
              .not("due_date", "is", null)
              .gte("due_date", from)
              .lte("due_date", to);

            if (selectedUserIds.length > 0) {
              query = query.or(
                `user_id.in.(${selectedUserIds.join(",")}),assigned_user_id.in.(${selectedUserIds.join(",")})`,
              );
            }

            const { data, error } = await query;
            if (error) {
              console.error("Calendar: erro ao buscar deadlines:", error);
              return;
            }

            for (const t of data || []) {
              events.push({
                id: `deadline-${t.id}`,
                type: "deadline",
                title: `Prazo: ${t.title}`,
                start: new Date(t.due_date!),
                allDay: true,
                color: EVENT_COLORS.deadline,
                ownerId: t.user_id,
                ownerName: t.responsible_name || "",
                metadata: {
                  taskStatus: t.status,
                  priority: t.priority || undefined,
                  sourceTable: "tasks",
                },
              });
            }
          })(),
        );
      }

      // 4. Presentation meetings
      if (enabledTypes.includes("presentation")) {
        promises.push(
          (async () => {
            const { data, error } = await supabase
              .from("presentation_meetings")
              .select(
                "id, presentation_id, meeting_date, status, created_at, notes, recording_url, approved_count, rejected_count, content_presentations(id, name, clients(name))",
              )
              .gte("meeting_date", from.split("T")[0])
              .lte("meeting_date", to.split("T")[0]);

            if (error) {
              console.error("Calendar: erro ao buscar apresentacoes:", error);
              return;
            }

            for (const p of data || []) {
              const presentation = (p as any).content_presentations;
              const clientName = presentation?.clients?.name;
              const presentationName = presentation?.name || "Apresentação";
              const displayTitle = clientName
                ? `${presentationName} - ${clientName}`
                : presentationName;

              events.push({
                id: `presentation-${p.id}`,
                type: "presentation",
                title: displayTitle,
                start: new Date(p.meeting_date),
                allDay: true,
                color: EVENT_COLORS.presentation,
                ownerId: "",
                ownerName: "",
                metadata: {
                  presentationId: p.presentation_id,
                  meetingStatus: p.status || undefined,
                  sourceTable: "presentation_meetings",
                },
              });
            }
          })(),
        );
      }

      await Promise.all(promises);
      return events.sort((a, b) => a.start.getTime() - b.start.getTime());
    },
    enabled: !!user && !!activeCompany?.company_id,
  });
}
