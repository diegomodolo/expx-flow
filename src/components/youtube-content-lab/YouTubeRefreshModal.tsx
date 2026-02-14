import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Loader2, XCircle, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ChannelRefreshStatus {
  channelId: string;
  channelName: string;
  status: "pending" | "loading" | "success" | "error";
  videoCount?: number;
  error?: string;
}

interface YouTubeRefreshModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: ChannelRefreshStatus[];
  finished: boolean;
}

export function YouTubeRefreshModal({
  open,
  onOpenChange,
  channels,
  finished,
}: YouTubeRefreshModalProps) {
  const completedCount = channels.filter(
    (c) => c.status === "success" || c.status === "error"
  ).length;

  return (
    <Dialog open={open} onOpenChange={finished ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => !finished && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-destructive" />
            {finished ? "Análise Concluída" : "Atualizando Canais..."}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {!finished && (
            <p className="text-sm text-muted-foreground">
              Analisando {completedCount} de {channels.length} canais...
            </p>
          )}

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-3">
              {channels.map((ch) => (
                <div
                  key={ch.channelId}
                  className="flex items-center justify-between rounded-lg border p-3 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {ch.status === "loading" && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    )}
                    {ch.status === "success" && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    )}
                    {ch.status === "error" && (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    {ch.status === "pending" && (
                      <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {ch.channelName}
                    </span>
                  </div>

                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {ch.status === "loading" && "Analisando..."}
                    {ch.status === "success" &&
                      `${ch.videoCount ?? 0} vídeos`}
                    {ch.status === "error" && "Erro"}
                    {ch.status === "pending" && "Aguardando"}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>

          {finished && (
            <div className="pt-2">
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
