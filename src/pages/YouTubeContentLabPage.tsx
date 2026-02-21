import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useYouTubeChannels } from "@/hooks/useYouTubeChannels";
import { useYouTubeAnalytics } from "@/hooks/useYouTubeAnalytics";
import { useYouTubeSuggestions } from "@/hooks/useYouTubeSuggestions";
import { useYouTubeScripts } from "@/hooks/useYouTubeScripts";
import { useYouTubeThumbnails } from "@/hooks/useYouTubeThumbnails";
import { useYouTubeCategories } from "@/hooks/useYouTubeCategories";
import { YouTubeChannelManager } from "@/components/youtube-content-lab/YouTubeChannelManager";
import { YouTubeVideoAnalytics } from "@/components/youtube-content-lab/YouTubeVideoAnalytics";
import { YouTubeSuggestionsList } from "@/components/youtube-content-lab/YouTubeSuggestionsList";
import { YouTubeScriptsList } from "@/components/youtube-content-lab/YouTubeScriptsList";
import { YouTubeScriptBuilder } from "@/components/youtube-content-lab/YouTubeScriptBuilder";
import { YouTubeThumbnailConfig } from "@/components/youtube-content-lab/YouTubeThumbnailConfig";
import { YouTubeCategorySidebar } from "@/components/youtube-content-lab/YouTubeCategorySidebar";
import { YouTubeRefreshModal, ChannelRefreshStatus } from "@/components/youtube-content-lab/YouTubeRefreshModal";
import { YouTubeRefreshConfigModal } from "@/components/youtube-content-lab/YouTubeRefreshConfigModal";
import { Youtube, BarChart3, Lightbulb, FileText, Loader2, Image, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export default function YouTubeContentLabPage() {
  const { labId } = useParams<{ labId: string }>();
  const navigate = useNavigate();

  // Fetch lab details
  const { data: lab, isLoading: labLoading } = useQuery({
    queryKey: ['youtube-lab', labId],
    queryFn: async () => {
      if (!labId) return null;
      const { data, error } = await supabase
        .from('youtube_content_labs')
        .select('*, clients(name)')
        .eq('id', labId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!labId,
  });

  // Use the lab's client_id (if any) as a proxy for the existing hooks
  // The hooks still query by client_id + company_id, but we use the lab's context
  const clientId = lab?.client_id || labId || "";
  const companyId = lab?.company_id || "";

  const [activeTab, setActiveTab] = useState("channels");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [refreshConfigOpen, setRefreshConfigOpen] = useState(false);
  const [refreshModalOpen, setRefreshModalOpen] = useState(false);
  const [refreshStatuses, setRefreshStatuses] = useState<ChannelRefreshStatus[]>([]);
  const [refreshFinished, setRefreshFinished] = useState(false);

  // For now hooks still use clientId - they'll work for client-linked labs
  // For standalone labs, we pass labId as clientId (queries will return empty, which is correct for new labs)
  const channelsHook = useYouTubeChannels(clientId, companyId);
  const analyticsHook = useYouTubeAnalytics(clientId, companyId);
  const suggestionsHook = useYouTubeSuggestions(clientId, companyId);
  const scriptsHook = useYouTubeScripts(clientId, companyId);
  const thumbnailsHook = useYouTubeThumbnails(clientId, companyId);
  const categoriesHook = useYouTubeCategories(clientId, companyId);

  const categoryChannelIds = categoriesHook.getChannelIdsForCategory(selectedCategoryId);

  useEffect(() => {
    if (categoryChannelIds) {
      analyticsHook.setSelectedChannelIds(categoryChannelIds);
    } else {
      analyticsHook.setSelectedChannelIds([]);
    }
  }, [categoryChannelIds]);

  const filteredChannels = useMemo(() => {
    if (!categoryChannelIds) return channelsHook.channels;
    return channelsHook.channels.filter(ch => categoryChannelIds.includes(ch.id));
  }, [channelsHook.channels, categoryChannelIds]);

  const filteredSuggestions = useMemo(() => {
    if (!categoryChannelIds) return suggestionsHook.suggestions;
    return suggestionsHook.suggestions.filter((s: any) =>
      s.category_id === selectedCategoryId || !s.category_id
    );
  }, [suggestionsHook.suggestions, selectedCategoryId, categoryChannelIds]);

  const filteredScripts = useMemo(() => {
    if (!categoryChannelIds) return scriptsHook.scripts;
    return scriptsHook.scripts.filter((s: any) =>
      s.category_id === selectedCategoryId || !s.category_id
    );
  }, [scriptsHook.scripts, selectedCategoryId, categoryChannelIds]);

  if (labLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="text-center py-16 space-y-4">
        <h3 className="text-lg font-medium">Lab não encontrado</h3>
        <Button variant="outline" onClick={() => navigate('/youtube-content-lab')}>
          Voltar
        </Button>
      </div>
    );
  }

  const handleCreateScript = async (suggestionId: string, title: string) => {
    const script = await scriptsHook.generateScript(title, { suggestionId });
    if (script) {
      setSelectedScriptId(script.id);
      setActiveTab("scripts");
    }
  };

  const handleOpenScript = (scriptId: string) => {
    setSelectedScriptId(scriptId);
  };

  const handleCloseBuilder = () => {
    setSelectedScriptId(null);
  };

  if (selectedScriptId) {
    const script = scriptsHook.scripts.find(s => s.id === selectedScriptId);
    if (script) {
      return (
        <YouTubeScriptBuilder
          script={script}
          onClose={handleCloseBuilder}
          onUpdate={(updates) => scriptsHook.updateScript(selectedScriptId, updates)}
          onSendMessage={(message) => scriptsHook.sendChatMessage(selectedScriptId, message)}
          onGenerateTitles={(style) => scriptsHook.generateTitles(selectedScriptId, style)}
          fetchMessages={() => scriptsHook.fetchScriptMessages(selectedScriptId)}
          onGenerateThumbnail={thumbnailsHook.generateThumbnail}
          generatingThumbnail={thumbnailsHook.generating}
          thumbnailConfig={thumbnailsHook.config}
          clientId={clientId}
          companyId={companyId}
        />
      );
    }
  }

  const labName = lab.clients?.name || lab.name;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/youtube-content-lab')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <Youtube className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{labName}</h1>
          <p className="text-muted-foreground">
            {lab.client_id ? "Lab vinculado ao cliente" : "Lab standalone"} • Analise canais, identifique tendências e crie roteiros
          </p>
        </div>
      </div>

      <div className="flex border rounded-lg overflow-hidden min-h-[600px]">
        <YouTubeCategorySidebar
          categories={categoriesHook.categories}
          channels={channelsHook.channels}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          onCreateCategory={categoriesHook.createCategory}
          onUpdateCategory={categoriesHook.updateCategory}
          onDeleteCategory={categoriesHook.deleteCategory}
          onLinkChannel={categoriesHook.linkChannel}
          onUnlinkChannel={categoriesHook.unlinkChannel}
        />

        <div className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="channels" className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                Canais
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Análise
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Sugestões
              </TabsTrigger>
              <TabsTrigger value="scripts" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Roteiros
              </TabsTrigger>
              <TabsTrigger value="thumbnails" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Thumbnails
              </TabsTrigger>
            </TabsList>

            <TabsContent value="channels" className="mt-6">
              <YouTubeChannelManager
                channels={filteredChannels}
                loading={channelsHook.loading}
                analyzing={channelsHook.analyzing}
                onAddChannel={channelsHook.addChannel}
                onRefreshChannel={channelsHook.refreshChannel}
                onRemoveChannel={channelsHook.removeChannel}
                categories={categoriesHook.categories}
                onLinkChannel={categoriesHook.linkChannel}
                onUnlinkChannel={categoriesHook.unlinkChannel}
              />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <YouTubeVideoAnalytics
                videos={analyticsHook.videos}
                allVideos={analyticsHook.allVideos}
                loading={analyticsHook.loading}
                period={analyticsHook.period}
                onPeriodChange={analyticsHook.setPeriod}
                customDateRange={analyticsHook.customDateRange}
                onCustomDateChange={analyticsHook.setCustomDateRange}
                selectedChannelIds={categoryChannelIds || analyticsHook.selectedChannelIds}
                onChannelSelect={analyticsHook.setSelectedChannelIds}
                searchQuery={analyticsHook.searchQuery}
                onSearchChange={analyticsHook.setSearchQuery}
                sortBy={analyticsHook.sortBy}
                onSortChange={analyticsHook.setSortBy}
                metrics={analyticsHook.metrics}
                topByViews={analyticsHook.topByViews}
                topByEngagement={analyticsHook.topByEngagement}
                channels={filteredChannels}
                onCreateScript={(topic) => {
                  scriptsHook.generateScript(topic, { sourceVideoTitle: topic });
                  setActiveTab("scripts");
                }}
                onRefreshAnalysis={async () => {
                  setRefreshConfigOpen(true);
                }}
                refreshing={channelsHook.analyzing}
              />
            </TabsContent>

            <TabsContent value="suggestions" className="mt-6">
              <YouTubeSuggestionsList
                suggestions={filteredSuggestions}
                loading={suggestionsHook.loading}
                generating={suggestionsHook.generating}
                onGenerateSuggestions={suggestionsHook.generateSuggestions}
                onCreateScript={handleCreateScript}
                onDismiss={(id) => suggestionsHook.updateSuggestionStatus(id, 'dismissed')}
                hasChannels={filteredChannels.length > 0}
              />
            </TabsContent>

            <TabsContent value="scripts" className="mt-6">
              <YouTubeScriptsList
                scripts={filteredScripts}
                loading={scriptsHook.loading}
                generating={scriptsHook.generating}
                onOpenScript={handleOpenScript}
                onDeleteScript={scriptsHook.deleteScript}
                onCreateNew={() => {
                  scriptsHook.generateScript("Novo roteiro");
                }}
                onUpdateStatus={(scriptId, status) => scriptsHook.updateScript(scriptId, { status })}
              />
            </TabsContent>

            <TabsContent value="thumbnails" className="mt-6">
              <YouTubeThumbnailConfig
                clientId={clientId}
                companyId={companyId}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <YouTubeRefreshConfigModal
        open={refreshConfigOpen}
        onOpenChange={setRefreshConfigOpen}
        channels={filteredChannels}
        onConfirm={async (selectedIds, periodDays) => {
          const channelsToRefresh = filteredChannels.filter((ch) => selectedIds.includes(ch.id));
          const statuses: ChannelRefreshStatus[] = channelsToRefresh.map((ch) => ({
            channelId: ch.id,
            channelName: ch.channel_name,
            status: "pending" as const,
          }));
          setRefreshStatuses(statuses);
          setRefreshFinished(false);
          setRefreshModalOpen(true);

          for (let i = 0; i < channelsToRefresh.length; i++) {
            const channel = channelsToRefresh[i];
            setRefreshStatuses((prev) =>
              prev.map((s, idx) =>
                idx === i ? { ...s, status: "loading" as const } : s
              )
            );

            try {
              const data = await channelsHook.refreshChannel(channel.id, periodDays);
              setRefreshStatuses((prev) =>
                prev.map((s, idx) =>
                  idx === i
                    ? { ...s, status: "success" as const, videoCount: data?.analyzedCount ?? 0 }
                    : s
                )
              );
            } catch {
              setRefreshStatuses((prev) =>
                prev.map((s, idx) =>
                  idx === i ? { ...s, status: "error" as const } : s
                )
              );
            }
          }

          await analyticsHook.refetch();
          setRefreshFinished(true);
        }}
      />
      <YouTubeRefreshModal
        open={refreshModalOpen}
        onOpenChange={setRefreshModalOpen}
        channels={refreshStatuses}
        finished={refreshFinished}
      />
    </div>
  );
}
