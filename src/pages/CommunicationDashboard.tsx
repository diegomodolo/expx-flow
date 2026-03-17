import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ChannelSidebar } from "@/components/comm-hub/ChannelSidebar";
import { ChatFlow } from "@/components/comm-hub/ChatFlow";
import { MyDayPanel } from "@/components/comm-hub/MyDayPanel";
import { useInternalChat } from "@/hooks/useInternalChat";
import { useChannelUnread } from "@/hooks/useChannelUnread";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export default function CommunicationDashboard() {
  const {
    channels,
    channelsLoading,
    activeChannel,
    activeChannelId,
    setActiveChannelId,
    messages,
    messagesLoading,
    sendMessage,
    sendingMessage,
    getOrCreateDMChannel,
  } = useInternalChat();

  const { unreadCounts, mentionCounts, markAsRead } = useChannelUnread();
  const [focusMode, setFocusMode] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<unknown>(null);

  // Handle DM navigation from notification click
  useEffect(() => {
    const storedChannel = sessionStorage.getItem("dm-navigate-channel");
    if (storedChannel && channels.length > 0) {
      sessionStorage.removeItem("dm-navigate-channel");
      setActiveChannelId(storedChannel);
    }
  }, [channels]);

  // Listen for dm-switch-channel event (when already on dashboard)
  useEffect(() => {
    const handler = (e: Event) => {
      const channelId = (e as CustomEvent).detail;
      if (channelId) setActiveChannelId(channelId);
    };
    window.addEventListener("dm-switch-channel", handler);
    return () => window.removeEventListener("dm-switch-channel", handler);
  }, [setActiveChannelId]);

  // Mark channel as read when switching
  useEffect(() => {
    if (activeChannelId) {
      markAsRead(activeChannelId);
    }
  }, [activeChannelId]);

  const handleOpenDM = async (userId: string, userName: string) => {
    const channelId = await getOrCreateDMChannel(userId, userName);
    if (channelId) {
      setActiveChannelId(channelId);
    } else {
      toast.error("Não foi possível abrir a conversa");
    }
  };

  const handleOpenTask = async (taskId: string) => {
    const { data } = await supabase
      .from("tasks")
      .select(
        "id, title, description, status, priority, due_date, start_date, user_id, team_id, related_client_id, related_campaign_id, progress, task_type, task_state, checklist, quadro_column_id, quadro_user_id",
      )
      .eq("id", taskId)
      .maybeSingle();
    if (data) {
      setSelectedTask(data);
      setTaskDialogOpen(true);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] -m-8 rounded-none overflow-hidden relative">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
            <ChannelSidebar
              channels={channels}
              activeChannelId={activeChannelId}
              onSelectChannel={setActiveChannelId}
              loading={channelsLoading}
              unreadCounts={unreadCounts}
              mentionCounts={mentionCounts}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={30}>
            <ChatFlow
              channel={activeChannel}
              messages={messages}
              loading={messagesLoading}
              onSendMessage={(content, threadParentId) =>
                sendMessage(content, threadParentId)
              }
              sendingMessage={sendingMessage}
              focusMode={focusMode}
              onToggleFocusMode={() => setFocusMode((prev) => !prev)}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
            <MyDayPanel onOpenDM={handleOpenDM} onOpenTask={handleOpenTask} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {taskDialogOpen && (
        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={(open) => {
            setTaskDialogOpen(open);
            if (!open) setSelectedTask(null);
          }}
          task={selectedTask}
          onSave={() => {
            setTaskDialogOpen(false);
            setSelectedTask(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
