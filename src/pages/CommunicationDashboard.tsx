import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ChannelSidebar } from '@/components/comm-hub/ChannelSidebar';
import { ChatFlow } from '@/components/comm-hub/ChatFlow';
import { MyDayPanel } from '@/components/comm-hub/MyDayPanel';
import { CommandBar } from '@/components/comm-hub/CommandBar';
import { useInternalChat } from '@/hooks/useInternalChat';
import { toast } from 'sonner';

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
  } = useInternalChat();

  const handleStatusRequest = () => {
    const activeCount = channels.length;
    const msgCount = messages.length;
    toast.info(`📊 Status: ${activeCount} canais ativos · ${msgCount} mensagens no canal atual`);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] -m-8 rounded-none overflow-hidden">
        {/* Top Command Bar */}
        <div className="flex items-center justify-center gap-3 px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
          <CommandBar
            channels={channels}
            onSelectChannel={setActiveChannelId}
            onStatusRequest={handleStatusRequest}
          />
        </div>

        {/* 3-Column Layout */}
        <div className="flex flex-1 overflow-hidden">
          <ChannelSidebar
            channels={channels}
            activeChannelId={activeChannelId}
            onSelectChannel={setActiveChannelId}
            loading={channelsLoading}
          />
          <ChatFlow
            channel={activeChannel}
            messages={messages}
            loading={messagesLoading}
            onSendMessage={sendMessage}
            sendingMessage={sendingMessage}
          />
          <MyDayPanel />
        </div>
      </div>
    </DashboardLayout>
  );
}
