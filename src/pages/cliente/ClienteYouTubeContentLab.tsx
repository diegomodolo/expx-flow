import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientDetails } from "@/hooks/useClientDetails";
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
import { Youtube, BarChart3, Lightbulb, FileText, Loader2, Image } from "lucide-react";

export default function ClienteYouTubeContentLab() {
  const { id: clientId } = useParams<{ id: string }>();
  const { client, loading: clientLoading } = useClientDetails(clientId || "");
  const companyId = client?.company_id || "";

  const [activeTab, setActiveTab] = useState("channels");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [refreshModalOpen, setRefreshModalOpen] = useState(false);
  const [refreshStatuses, setRefreshStatuses] = useState<ChannelRefreshStatus[]>([]);
  const [refreshFinished, setRefreshFinished] = useState(false);

  const channelsHook = useYouTubeChannels(clientId || "", companyId);
  const analyticsHook = useYouTubeAnalytics(clientId || "", companyId);
  const suggestionsHook = useYouTubeSuggestions(clientId || "", companyId);
  const scriptsHook = useYouTubeScripts(clientId || "", companyId);
  const thumbnailsHook = useYouTubeThumbnails(clientId || "", companyId);
  const categoriesHook = useYouTubeCategories(clientId || "", companyId);

  // Get channel IDs for the selected category
  const categoryChannelIds = categoriesHook.getChannelIdsForCategory(selectedCategoryId);

  // Sync category filter into analytics hook
  useEffect(() => {
    if (categoryChannelIds) {
      analyticsHook.setSelectedChannelIds(categoryChannelIds);
    } else {
      analyticsHook.setSelectedChannelIds([]);
    }
  }, [categoryChannelIds]);

  // Filter channels by category
  const filteredChannels = useMemo(() => {
    if (!categoryChannelIds) return channelsHook.channels;
    return channelsHook.channels.filter(ch => categoryChannelIds.includes(ch.id));
  }, [channelsHook.channels, categoryChannelIds]);

  // Filter suggestions by category channels
  const filteredSuggestions = useMemo(() => {
    if (!categoryChannelIds) return suggestionsHook.suggestions;
    // Filter suggestions that have category_id matching, or if no category_id, show all
    const selectedCat = categoriesHook.categories.find(c => c.id === selectedCategoryId);
    if (!selectedCat) return suggestionsHook.suggestions;
    return suggestionsHook.suggestions.filter((s: any) => 
      s.category_id === selectedCategoryId || !s.category_id
    );
  }, [suggestionsHook.suggestions, selectedCategoryId, categoryChannelIds, categoriesHook.categories]);

  // Filter scripts by category
  const filteredScripts = useMemo(() => {
    if (!categoryChannelIds) return scriptsHook.scripts;
    return scriptsHook.scripts.filter((s: any) =>
      s.category_id === selectedCategoryId || !s.category_id
    );
  }, [scriptsHook.scripts, selectedCategoryId, categoryChannelIds]);

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Handle creating script from suggestion
  const handleCreateScript = async (suggestionId: string, title: string) => {
    const script = await scriptsHook.generateScript(title, {
      suggestionId,
    });
    if (script) {
      setSelectedScriptId(script.id);
      setActiveTab("scripts");
    }
  };

  // Handle opening script builder
  const handleOpenScript = (scriptId: string) => {
    setSelectedScriptId(scriptId);
  };

  // Close script builder
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
          clientId={clientId || ""}
          companyId={companyId}
        />
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <Youtube className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">YouTube Content Lab</h1>
          <p className="text-muted-foreground">
            Analise canais, identifique tendências e crie roteiros com IA
          </p>
        </div>
      </div>

      <div className="flex border rounded-lg overflow-hidden min-h-[600px]">
        {/* Category Sidebar */}
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

        {/* Main Content */}
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
                  scriptsHook.generateScript(topic);
                  setActiveTab("scripts");
                }}
                onRefreshAnalysis={async () => {
                  const channelsToRefresh = filteredChannels;
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
                      const data = await channelsHook.refreshChannel(channel.id);
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
              />
            </TabsContent>

            <TabsContent value="thumbnails" className="mt-6">
              <YouTubeThumbnailConfig
                clientId={clientId || ""}
                companyId={companyId}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <YouTubeRefreshModal
        open={refreshModalOpen}
        onOpenChange={setRefreshModalOpen}
        channels={refreshStatuses}
        finished={refreshFinished}
      />
    </div>
  );
}
