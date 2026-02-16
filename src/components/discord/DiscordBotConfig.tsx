import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Wifi } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { useDiscordConfig } from "@/hooks/useDiscordConfig";
import { toast } from "sonner";

export const DiscordBotConfig = () => {
  const { config, saveConfig, testConnection } = useDiscordConfig();
  const [guildId, setGuildId] = useState(config?.guild_id || "");
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">(
    config?.is_connected ? "success" : "idle"
  );
  const [guildName, setGuildName] = useState(config?.guild_name || "");

  // Sync state when config loads
  useState(() => {
    if (config) {
      setGuildId(config.guild_id || "");
      setGuildName(config.guild_name || "");
      setConnectionStatus(config.is_connected ? "success" : "idle");
    }
  });

  const handleTest = async () => {
    if (!guildId.trim()) {
      toast.error("Informe o Guild ID do servidor");
      return;
    }
    setTesting(true);
    try {
      const result = await testConnection(guildId);
      if (result.success) {
        setConnectionStatus("success");
        setGuildName(result.guild_name);
        await saveConfig.mutateAsync({
          guild_id: guildId,
          guild_name: result.guild_name,
          is_connected: true,
          enabled: true,
        });
        toast.success(`Conectado ao servidor: ${result.guild_name}`);
      } else {
        setConnectionStatus("error");
        toast.error(result.error || "Falha na conexão");
      }
    } catch (err: any) {
      setConnectionStatus("error");
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#5865F2]/10">
            <SiDiscord className="h-5 w-5 text-[#5865F2]" />
          </div>
          <div>
            <CardTitle className="text-lg">Configuração do Bot</CardTitle>
            <CardDescription>
              Configure a conexão com o seu servidor Discord
            </CardDescription>
          </div>
          {connectionStatus === "success" && (
            <Badge variant="default" className="ml-auto bg-emerald-500">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
            </Badge>
          )}
          {connectionStatus === "error" && (
            <Badge variant="destructive" className="ml-auto">
              <XCircle className="h-3 w-3 mr-1" /> Desconectado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
          <p className="font-medium mb-1">Como configurar:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Crie um Bot no <a href="https://discord.com/developers/applications" target="_blank" rel="noopener" className="text-primary underline">Discord Developer Portal</a></li>
            <li>Copie o <strong>Bot Token</strong> e adicione como secret <code>DISCORD_BOT_TOKEN</code> no Supabase</li>
            <li>Convide o bot para seu servidor com permissões de enviar mensagens</li>
            <li>Cole o <strong>Guild ID</strong> (ID do servidor) abaixo e teste a conexão</li>
          </ol>
        </div>

        <div className="space-y-2">
          <Label htmlFor="guild_id">Guild ID (ID do Servidor)</Label>
          <Input
            id="guild_id"
            placeholder="Ex: 123456789012345678"
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
          />
        </div>

        {guildName && connectionStatus === "success" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wifi className="h-4 w-4 text-emerald-500" />
            Servidor: <strong className="text-foreground">{guildName}</strong>
          </div>
        )}

        <Button onClick={handleTest} disabled={testing || !guildId.trim()}>
          {testing ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testando...</>
          ) : (
            <><Wifi className="h-4 w-4 mr-2" /> Testar Conexão</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
