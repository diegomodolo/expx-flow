import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ChannelSidebar } from '@/components/comm-hub/ChannelSidebar';
import { ChatFlow } from '@/components/comm-hub/ChatFlow';
import { MyDayPanel } from '@/components/comm-hub/MyDayPanel';
import { useInternalChat } from '@/hooks/useInternalChat';

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

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] -m-8 rounded-none overflow-hidden">
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
    </DashboardLayout>
  );
}
