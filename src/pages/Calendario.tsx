import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useEmployees } from "@/hooks/useEmployees";
import {
  useCalendarEvents,
  CalendarEvent,
  CalendarViewMode,
} from "@/hooks/useCalendarEvents";
import { useCalendarShares } from "@/hooks/useCalendarShares";
import {
  useGoogleMeetMeetings,
  GoogleMeetMeeting,
} from "@/hooks/useGoogleMeetMeetings";
import { useTasks } from "@/hooks/useTasks";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarFAB } from "@/components/calendar/CalendarFAB";
import { CalendarShareModal } from "@/components/calendar/CalendarShareModal";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { MeetingDetailsModal } from "@/components/meetings/MeetingDetailsModal";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

export default function Calendario() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { employees } = useEmployees();
  const { sharedWithMe, myShares, createShare, removeShare, creatingShare } =
    useCalendarShares();
  const {
    createMeeting,
    creating: creatingMeeting,
    meetings,
    checkTranscript,
    processSummary,
    loading: meetingsLoading,
  } = useGoogleMeetMeetings();
  const { tasks, updateTask } = useTasks();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(() =>
    user?.id ? [user.id] : [],
  );
  const [enabledTypes, setEnabledTypes] = useState<CalendarEvent["type"][]>([
    "meeting",
    "task",
    "deadline",
    "presentation",
  ]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<unknown>(null);
  const [meetingDetailsOpen, setMeetingDetailsOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] =
    useState<GoogleMeetMeeting | null>(null);

  const { data: events = [], isLoading } = useCalendarEvents({
    currentDate,
    viewMode,
    selectedUserIds,
    enabledTypes,
  });

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      if (event.type === "task" || event.type === "deadline") {
        const taskId = event.id.replace(/^(task|deadline)-/, "");
        const task = tasks.find((t: any) => t.id === taskId);
        if (task) {
          setSelectedTask(task);
          setTaskDialogOpen(true);
        }
      } else if (event.type === "meeting") {
        const meetingId = event.id.replace(/^meeting-/, "");
        const meeting = meetings.find((m) => m.id === meetingId);
        if (meeting) {
          setSelectedMeeting(meeting);
          setMeetingDetailsOpen(true);
        }
      }
    },
    [tasks, meetings],
  );

  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  }, []);

  const sharedWithMeUserIds = sharedWithMe.map((s) => s.owner_id);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <CalendarSidebar
          employees={employees}
          sharedWithMeUserIds={sharedWithMeUserIds}
          selectedUserIds={selectedUserIds}
          onSelectedUserIdsChange={setSelectedUserIds}
          enabledTypes={enabledTypes}
          onEnabledTypesChange={setEnabledTypes}
          onShareClick={() => setShowShareModal(true)}
        />

        {/* Main content */}
        <div className="flex-1 p-4 overflow-auto">
          <CalendarHeader
            currentDate={currentDate}
            viewMode={viewMode}
            onDateChange={setCurrentDate}
            onViewModeChange={setViewMode}
          />

          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <>
              {viewMode === "month" && (
                <CalendarMonthView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                />
              )}
              {viewMode === "week" && (
                <CalendarWeekView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                />
              )}
              {viewMode === "day" && (
                <CalendarDayView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* FAB */}
      <CalendarFAB
        onNewMeeting={() => setShowCreateMeeting(true)}
        onNewTask={() => navigate("/tarefas")}
      />

      {/* Share Modal */}
      <CalendarShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        employees={employees}
        myShares={myShares}
        currentUserId={user?.id || ""}
        onShare={createShare}
        onRemoveShare={removeShare}
        sharing={creatingShare}
      />

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
        onSave={async (taskData: unknown) => {
          if (selectedTask) {
            await updateTask((selectedTask as any).id, taskData);
            setSelectedTask(null);
            setTaskDialogOpen(false);
          }
        }}
      />

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        open={showCreateMeeting}
        onClose={() => setShowCreateMeeting(false)}
        onSubmit={async (data) => {
          const result = await createMeeting(data);
          if (result) {
            setShowCreateMeeting(false);
            queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
          }
          return result;
        }}
        creating={creatingMeeting}
      />

      {/* Meeting Details Modal */}
      {selectedMeeting && (
        <MeetingDetailsModal
          meeting={selectedMeeting}
          open={meetingDetailsOpen}
          onClose={() => {
            setMeetingDetailsOpen(false);
            setSelectedMeeting(null);
          }}
          onCheckTranscript={checkTranscript}
          onProcessSummary={processSummary}
          processing={meetingsLoading}
        />
      )}
    </DashboardLayout>
  );
}
