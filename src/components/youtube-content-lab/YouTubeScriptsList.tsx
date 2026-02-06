import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { YouTubeScript } from "@/hooks/useYouTubeScripts";
import { FileText, Plus, Trash2, Loader2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
}

export function YouTubeScriptsList({
  scripts,
  loading,
  generating,
  onOpenScript,
  onDeleteScript,
  onCreateNew,
}: YouTubeScriptsListProps) {
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
        </CardHeader>
      </Card>

      {/* Scripts List */}
      {scripts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Nenhum roteiro criado</p>
            <p className="text-sm text-muted-foreground">
              Crie roteiros a partir de sugestões ou do zero
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scripts.map((script) => (
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
                    </div>
                  </div>

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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
