import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ChannelSidebar } from '@/components/comm-hub/ChannelSidebar';
import { ChatFlow } from '@/components/comm-hub/ChatFlow';
import { MyDayPanel } from '@/components/comm-hub/MyDayPanel';
import { useInternalChat } from '@/hooks/useInternalChat';
import { useChannelUnread } from '@/hooks/useChannelUnread';
import { useEffect } from 'react';

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

  const { unreadCounts, markAsRead } = useChannelUnread();

  // Mark channel as read when switching
  useEffect(() => {
    if (activeChannelId) {
      markAsRead(activeChannelId);
    }
  }, [activeChannelId]);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] -m-8 rounded-none overflow-hidden">
        <ChannelSidebar
          channels={channels}
          activeChannelId={activeChannelId}
          onSelectChannel={setActiveChannelId}
          loading={channelsLoading}
          unreadCounts={unreadCounts}
        />
        <ChatFlow
          channel={activeChannel}
          messages={messages}
          loading={messagesLoading}
          onSendMessage={(content, threadParentId) => sendMessage(content, threadParentId)}
          sendingMessage={sendingMessage}
        />
        <MyDayPanel />
      </div>
    </DashboardLayout>
  );
}
