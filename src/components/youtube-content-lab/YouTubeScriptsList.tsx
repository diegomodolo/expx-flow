import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YouTubeScript } from "@/hooks/useYouTubeScripts";
import { FileText, Plus, Trash2, Loader2, Clock, Eye, ThumbsUp, MessageCircle, TrendingUp, Youtube, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface YouTubeScriptsListProps {
  scripts: YouTubeScript[];
  loading: boolean;
  generating: boolean;
  onOpenScript: (scriptId: string) => void;
  onDeleteScript: (scriptId: string) => void;
  onCreateNew: () => void;
  onUpdateStatus?: (scriptId: string, status: YouTubeScript['status']) => void;
}

export function YouTubeScriptsList({
  scripts,
  loading,
  generating,
  onOpenScript,
  onDeleteScript,
  onCreateNew,
  onUpdateStatus,
}: YouTubeScriptsListProps) {
  const [statusFilter, setStatusFilter] = useState<'active' | 'produced'>('active');
  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: "Rascunho", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
    review: { label: "Em Revisão", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    approved: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    produced: { label: "Produzido", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const activeScripts = scripts.filter(s => s.status !== 'produced');
  const producedScripts = scripts.filter(s => s.status === 'produced');
  const displayedScripts = statusFilter === 'active' ? activeScripts : producedScripts;

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Meus Roteiros</CardTitle>
            <Button onClick={onCreateNew} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Roteiro
                </>
              )}
            </Button>
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'active' | 'produced')} className="mt-3">
            <TabsList>
              <TabsTrigger value="active">
                Em andamento ({activeScripts.length})
              </TabsTrigger>
              <TabsTrigger value="produced">
                Gravados ({producedScripts.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
      </Card>

      {/* Scripts List */}
      {displayedScripts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">
              {statusFilter === 'active' ? 'Nenhum roteiro em andamento' : 'Nenhum roteiro gravado'}
            </p>
            <p className="text-sm text-muted-foreground">
              {statusFilter === 'active'
                ? 'Crie roteiros a partir de sugestões ou do zero'
                : 'Marque roteiros como gravados para movê-los aqui'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {displayedScripts.map((script) => (
            <Card
              key={script.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onOpenScript(script.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate" title={script.title}>
                        {script.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDistanceToNow(new Date(script.updated_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                        {script.video_duration_target && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{Math.round(script.video_duration_target / 60)} min</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          className={statusLabels[script.status]?.color || ""}
                          variant="secondary"
                        >
                          {statusLabels[script.status]?.label || script.status}
                        </Badge>
                        {script.suggested_titles.length > 0 && (
                          <Badge variant="outline">
                            {script.suggested_titles.length} títulos
                          </Badge>
                        )}
                      </div>

                      {/* Source Video Info */}
                      {script.source_videos && script.source_videos.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {script.source_videos.map((video, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs"
                            >
                              <Youtube className="h-3.5 w-3.5 text-destructive shrink-0" />
                              <span className="truncate font-medium flex-1 min-w-0" title={video.title}>
                                {video.title}
                              </span>
                              <span className="text-muted-foreground shrink-0">
                                {video.channel_name}
                              </span>
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center gap-0.5 text-muted-foreground shrink-0">
                                      <Eye className="h-3 w-3" />
                                      {video.view_count >= 1000
                                        ? `${(video.view_count / 1000).toFixed(1)}k`
                                        : video.view_count}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>{video.view_count.toLocaleString('pt-BR')} views</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <span className="flex items-center gap-0.5 text-muted-foreground shrink-0">
                                <ThumbsUp className="h-3 w-3" />
                                {video.like_count >= 1000
                                  ? `${(video.like_count / 1000).toFixed(1)}k`
                                  : video.like_count}
                              </span>
                              <span className="flex items-center gap-0.5 text-muted-foreground shrink-0">
                                <MessageCircle className="h-3 w-3" />
                                {video.comment_count}
                              </span>
                              {video.engagement_rate != null && (
                                <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 font-medium shrink-0">
                                  <TrendingUp className="h-3 w-3" />
                                  {video.engagement_rate.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onUpdateStatus && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`h-8 w-8 opacity-0 group-hover:opacity-100 ${
                                script.status === 'produced'
                                  ? 'text-muted-foreground'
                                  : 'text-green-600 dark:text-green-400'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(
                                  script.id,
                                  script.status === 'produced' ? 'draft' : 'produced'
                                );
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {script.status === 'produced' ? 'Reabrir roteiro' : 'Marcar como gravado'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir roteiro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O roteiro e todo o histórico de chat serão
                            permanentemente excluídos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeleteScript(script.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
