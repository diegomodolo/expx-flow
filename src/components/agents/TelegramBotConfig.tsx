import React, { useState } from "react";
import { Bot, Link, Unlink, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TelegramBotConfigProps {
  agentId: string;
  telegramBotToken: string | null;
  telegramBotName: string | null;
  onUpdate: () => void;
}

export function TelegramBotConfig({
  agentId,
  telegramBotToken,
  telegramBotName,
  onUpdate,
}: TelegramBotConfigProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isConnected = !!telegramBotToken;

  const handleConnect = async () => {
    if (!token.trim()) {
      toast({
        title: "Token obrigatório",
        description: "Cole o token do bot gerado pelo @BotFather.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("configure-telegram-webhook", {
        body: { agentId, botToken: token.trim(), action: "connect" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Bot conectado!",
        description: data.message,
      });
      setToken("");
      onUpdate();
    } catch (err: any) {
      toast({
        title: "Erro ao conectar bot",
        description: err.message || "Verifique o token e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("configure-telegram-webhook", {
        body: { agentId, action: "disconnect" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Bot desconectado",
        description: "O bot do Telegram foi removido deste agente.",
      });
      onUpdate();
    } catch (err: any) {
      toast({
        title: "Erro ao desconectar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="w-5 h-5 text-[#0088cc]" />
        <h3 className="text-lg font-semibold">Telegram Bot</h3>
        {isConnected && (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Conectado
          </Badge>
        )}
      </div>

      {isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
            <Bot className="w-8 h-8 text-[#0088cc]" />
            <div className="flex-1">
              <p className="font-medium">@{telegramBotName}</p>
              <p className="text-sm text-muted-foreground">
                Recebendo mensagens e respondendo automaticamente
              </p>
            </div>
            <a
              href={`https://t.me/${telegramBotName}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-1" />
                Abrir Bot
              </Button>
            </a>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Unlink className="w-4 h-4 mr-2" />
            )}
            Desconectar Bot
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Como conectar:</strong>
              <ol className="list-decimal ml-4 mt-1 space-y-1">
                <li>
                  Abra o Telegram e converse com{" "}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    @BotFather
                  </a>
                </li>
                <li>Envie <code>/newbot</code> e siga as instruções</li>
                <li>Copie o token gerado e cole abaixo</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="telegram_token">Token do Bot</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="telegram_token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                type="password"
              />
              <Button onClick={handleConnect} disabled={loading || !token.trim()}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link className="w-4 h-4 mr-2" />
                )}
                Conectar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
