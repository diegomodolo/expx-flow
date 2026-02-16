import { DiscordBotConfig } from "./DiscordBotConfig";
import { DiscordSquadChannels } from "./DiscordSquadChannels";
import { DiscordEmployeeMapping } from "./DiscordEmployeeMapping";

export const DiscordSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Integração com Discord</h2>
        <p className="text-sm text-muted-foreground">
          Configure a integração com o Discord para enviar notificações automáticas para os canais dos squads e colaboradores.
        </p>
      </div>
      <DiscordBotConfig />
      <DiscordSquadChannels />
      <DiscordEmployeeMapping />
    </div>
  );
};
