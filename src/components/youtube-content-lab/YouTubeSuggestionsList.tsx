import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { YouTubeSuggestion } from "@/hooks/useYouTubeSuggestions";
import { Lightbulb, Sparkles, FileText, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface YouTubeSuggestionsListProps {
  suggestions: YouTubeSuggestion[];
  loading: boolean;
  generating: boolean;
  onGenerateSuggestions: (context?: string, count?: number) => Promise<any>;
  onCreateScript: (suggestionId: string, title: string) => Promise<void>;
  onDismiss: (suggestionId: string) => void;
  hasChannels: boolean;
}

export function YouTubeSuggestionsList({
  suggestions,
  loading,
  generating,
  onGenerateSuggestions,
  onCreateScript,
  onDismiss,
  hasChannels,
}: YouTubeSuggestionsListProps) {
  const [showContextDialog, setShowContextDialog] = useState(false);
  const [contextInput, setContextInput] = useState("");
  const [creatingScriptId, setCreatingScriptId] = useState<string | null>(null);

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const scriptedSuggestions = suggestions.filter(s => s.status === 'scripted');

  const handleGenerateClick = () => {
    if (!hasChannels) {
      return;
    }
    setShowContextDialog(true);
  };

  const handleGenerate = async () => {
    setShowContextDialog(false);
    await onGenerateSuggestions(contextInput || undefined, 5);
    setContextInput("");
  };

  const handleCreateScript = async (suggestion: YouTubeSuggestion) => {
    setCreatingScriptId(suggestion.id);
    try {
      await onCreateScript(suggestion.id, suggestion.title);
    } finally {
      setCreatingScriptId(null);
    }
  };

  const categoryColors: Record<string, string> = {
    tutorial: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    listicle: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    storytelling: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    comparação: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    análise: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    entretenimento: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
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
      {/* Generate Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Sugestões de Vídeos</CardTitle>
            <Button onClick={handleGenerateClick} disabled={generating || !hasChannels}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Sugestões
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!hasChannels ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Adicione canais na aba "Canais" para gerar sugestões baseadas em vídeos de sucesso.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              A IA analisa os vídeos de maior engajamento dos canais monitorados e sugere ideias de conteúdo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pending Suggestions */}
      {pendingSuggestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Novas Sugestões</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        <h4 className="font-medium line-clamp-2">{suggestion.title}</h4>
                      </div>
                      {suggestion.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                          {suggestion.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {suggestion.theme_category && (
                          <Badge
                            className={categoryColors[suggestion.theme_category] || ""}
                            variant="secondary"
                          >
                            {suggestion.theme_category}
                          </Badge>
                        )}
                        {suggestion.estimated_engagement && (
                          <Badge variant="outline">
                            Engajamento: {suggestion.estimated_engagement}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => onDismiss(suggestion.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-4 pt-3 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleCreateScript(suggestion)}
                      disabled={creatingScriptId === suggestion.id}
                      className="w-full"
                    >
                      {creatingScriptId === suggestion.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Gerando Roteiro...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Criar Roteiro
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Scripted Suggestions */}
      {scriptedSuggestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-muted-foreground">Com Roteiro</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {scriptedSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-500" />
                    <h4 className="font-medium line-clamp-1">{suggestion.title}</h4>
                    <Badge variant="secondary" className="ml-auto">
                      Roteiro criado
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {suggestions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 text-center">
            <Lightbulb className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Nenhuma sugestão gerada</p>
            <p className="text-sm text-muted-foreground">
              Clique em "Gerar Sugestões" para criar ideias de vídeos
            </p>
          </CardContent>
        </Card>
      )}

      {/* Context Dialog */}
      <Dialog open={showContextDialog} onOpenChange={setShowContextDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Sugestões de Vídeos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Contexto adicional (opcional)
              </label>
              <Textarea
                placeholder="Descreva o nicho do canal, público-alvo, estilo de conteúdo, temas preferidos..."
                value={contextInput}
                onChange={(e) => setContextInput(e.target.value)}
                rows={4}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Quanto mais contexto, mais relevantes serão as sugestões.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContextDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate}>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Sugestões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
