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
import { useGoogleMeetMeetings } from "@/hooks/useGoogleMeetMeetings";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarFAB } from "@/components/calendar/CalendarFAB";
import { CalendarShareModal } from "@/components/calendar/CalendarShareModal";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export default function Calendario() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { employees } = useEmployees();
  const { sharedWithMe, myShares, createShare, removeShare, creatingShare } =
    useCalendarShares();
  const { createMeeting, creating: creatingMeeting } = useGoogleMeetMeetings();
  const navigate = useNavigate();

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

  const { data: events = [], isLoading } = useCalendarEvents({
    currentDate,
    viewMode,
    selectedUserIds,
    enabledTypes,
  });

  const handleEventClick = useCallback((event: CalendarEvent) => {
    // TODO: Open detail modals based on event.type
    console.log("Event clicked:", event);
  }, []);

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

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        open={showCreateMeeting}
        onClose={() => setShowCreateMeeting(false)}
        onSubmit={async (data) => {
          const result = await createMeeting(data);
          if (result) setShowCreateMeeting(false);
          return result;
        }}
        creating={creatingMeeting}
      />
    </DashboardLayout>
  );
}
