import { useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientDetails } from "@/hooks/useClientDetails";
import { useYouTubeChannels } from "@/hooks/useYouTubeChannels";
import { useYouTubeAnalytics } from "@/hooks/useYouTubeAnalytics";
import { useYouTubeSuggestions } from "@/hooks/useYouTubeSuggestions";
import { useYouTubeScripts } from "@/hooks/useYouTubeScripts";
import { YouTubeChannelManager } from "@/components/youtube-content-lab/YouTubeChannelManager";
import { YouTubeVideoAnalytics } from "@/components/youtube-content-lab/YouTubeVideoAnalytics";
import { YouTubeSuggestionsList } from "@/components/youtube-content-lab/YouTubeSuggestionsList";
import { YouTubeScriptsList } from "@/components/youtube-content-lab/YouTubeScriptsList";
import { YouTubeScriptBuilder } from "@/components/youtube-content-lab/YouTubeScriptBuilder";
import { Youtube, BarChart3, Lightbulb, FileText, Loader2 } from "lucide-react";

export default function ClienteYouTubeContentLab() {
  const { id: clientId } = useParams<{ id: string }>();
  const { client, loading: clientLoading } = useClientDetails(clientId || "");
  const companyId = client?.company || "";

  const [activeTab, setActiveTab] = useState("channels");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);

  const channelsHook = useYouTubeChannels(clientId || "", companyId);
  const analyticsHook = useYouTubeAnalytics(clientId || "", companyId);
  const suggestionsHook = useYouTubeSuggestions(clientId || "", companyId);
  const scriptsHook = useYouTubeScripts(clientId || "", companyId);

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
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
        </TabsList>

        <TabsContent value="channels" className="mt-6">
          <YouTubeChannelManager
            channels={channelsHook.channels}
            loading={channelsHook.loading}
            analyzing={channelsHook.analyzing}
            onAddChannel={channelsHook.addChannel}
            onRefreshChannel={channelsHook.refreshChannel}
            onRemoveChannel={channelsHook.removeChannel}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <YouTubeVideoAnalytics
            videos={analyticsHook.videos}
            loading={analyticsHook.loading}
            period={analyticsHook.period}
            onPeriodChange={analyticsHook.setPeriod}
            metrics={analyticsHook.metrics}
            topByViews={analyticsHook.topByViews}
            topByEngagement={analyticsHook.topByEngagement}
            onCreateScript={(topic) => {
              scriptsHook.generateScript(topic);
              setActiveTab("scripts");
            }}
          />
        </TabsContent>

        <TabsContent value="suggestions" className="mt-6">
          <YouTubeSuggestionsList
            suggestions={suggestionsHook.suggestions}
            loading={suggestionsHook.loading}
            generating={suggestionsHook.generating}
            onGenerateSuggestions={suggestionsHook.generateSuggestions}
            onCreateScript={handleCreateScript}
            onDismiss={(id) => suggestionsHook.updateSuggestionStatus(id, 'dismissed')}
            hasChannels={channelsHook.channels.length > 0}
          />
        </TabsContent>

        <TabsContent value="scripts" className="mt-6">
          <YouTubeScriptsList
            scripts={scriptsHook.scripts}
            loading={scriptsHook.loading}
            generating={scriptsHook.generating}
            onOpenScript={handleOpenScript}
            onDeleteScript={scriptsHook.deleteScript}
            onCreateNew={() => {
              scriptsHook.generateScript("Novo roteiro");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
