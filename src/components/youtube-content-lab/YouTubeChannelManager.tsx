import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { YouTubeChannel } from "@/hooks/useYouTubeChannels";
import { Plus, RefreshCw, Trash2, Users, Video, Loader2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";

interface YouTubeChannelManagerProps {
  channels: YouTubeChannel[];
  loading: boolean;
  analyzing: boolean;
  onAddChannel: (url: string, periodDays?: number) => Promise<any>;
  onRefreshChannel: (channelId: string, periodDays?: number) => Promise<any>;
  onRemoveChannel: (channelId: string) => Promise<void>;
}

export function YouTubeChannelManager({
  channels,
  loading,
  analyzing,
  onAddChannel,
  onRefreshChannel,
  onRemoveChannel,
}: YouTubeChannelManagerProps) {
  const [channelUrl, setChannelUrl] = useState("");
  const [removeChannelId, setRemoveChannelId] = useState<string | null>(null);

  const handleAddChannel = async () => {
    if (!channelUrl.trim()) return;
    const result = await onAddChannel(channelUrl);
    if (result) {
      setChannelUrl("");
    }
  };

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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
      {/* Add Channel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Adicionar Canal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Cole a URL do canal (ex: youtube.com/@canal ou youtube.com/channel/UC...)"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddChannel()}
              disabled={analyzing}
              className="flex-1"
            />
            <Button onClick={handleAddChannel} disabled={analyzing || !channelUrl.trim()}>
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Adicione canais de referência para analisar o conteúdo de maior sucesso.
          </p>
        </CardContent>
      </Card>

      {/* Channels List */}
      {channels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 text-center">
            <Video className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">Nenhum canal monitorado</p>
            <p className="text-sm text-muted-foreground">
              Adicione canais do YouTube para começar a análise
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <Card key={channel.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={channel.thumbnail_url || undefined} />
                    <AvatarFallback>
                      {channel.channel_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate" title={channel.channel_name}>
                      {channel.channel_name}
                    </h3>
                    {channel.channel_handle && (
                      <p className="text-sm text-muted-foreground truncate">
                        @{channel.channel_handle.replace("@", "")}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {formatNumber(channel.subscriber_count)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="h-3.5 w-3.5" />
                        {formatNumber(channel.video_count)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div>
                    {channel.last_analyzed_at && (
                      <Badge variant="outline" className="text-xs">
                        Analisado{" "}
                        {formatDistanceToNow(new Date(channel.last_analyzed_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onRefreshChannel(channel.id)}
                      disabled={analyzing}
                      title="Atualizar análise"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setRemoveChannelId(channel.id)}
                      title="Remover canal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!removeChannelId} onOpenChange={() => setRemoveChannelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover canal?</AlertDialogTitle>
            <AlertDialogDescription>
              O canal será removido do monitoramento, mas os dados de análise serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeChannelId) {
                  onRemoveChannel(removeChannelId);
                  setRemoveChannelId(null);
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
