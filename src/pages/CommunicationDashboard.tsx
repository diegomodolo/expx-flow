import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ChannelSidebar } from '@/components/comm-hub/ChannelSidebar';
import { ChatFlow } from '@/components/comm-hub/ChatFlow';
import { MyDayPanel } from '@/components/comm-hub/MyDayPanel';
import { useInternalChat } from '@/hooks/useInternalChat';
import { useChannelUnread } from '@/hooks/useChannelUnread';
import { useEffect, useState } from 'react';
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
    getOrCreateDMChannel,
  } = useInternalChat();

  const { unreadCounts, markAsRead } = useChannelUnread();
  const [focusMode, setFocusMode] = useState(false);

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
      toast.error('Não foi possível abrir a conversa');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] -m-8 rounded-none overflow-hidden relative">
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
          focusMode={focusMode}
          onToggleFocusMode={() => setFocusMode(prev => !prev)}
        />
        <MyDayPanel onOpenDM={handleOpenDM} />
      </div>
    </DashboardLayout>
  );
}
