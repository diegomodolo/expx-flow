import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Unlink,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Video,
} from "lucide-react";
import { useGoogleMeetIntegration } from "@/hooks/useGoogleMeetIntegration";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ProfileGoogleMeetCard() {
  const { user } = useAuth();
  const {
    loading,
    integration,
    connectGoogle,
    disconnectGoogle,
    refreshToken,
  } = useGoogleMeetIntegration(user?.id);

  const isTokenExpiring = integration?.expires_at
    ? new Date(integration.expires_at).getTime() - Date.now() < 30 * 60 * 1000
    : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Google Meet
        </CardTitle>
        <CardDescription>
          Conecte sua conta Google para criar reuniões no seu próprio
          calendário. Reuniões criadas por você serão vinculadas à sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        ) : integration ? (
          <>
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Conectado</AlertTitle>
              <AlertDescription className="space-y-1">
                {integration.user_email && (
                  <p>
                    Conta: <strong>{integration.user_email}</strong>
                  </p>
                )}
                <p className="text-xs">
                  Conectado em:{" "}
                  {format(
                    new Date(integration.created_at),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR },
                  )}
                </p>
              </AlertDescription>
            </Alert>

            {isTokenExpiring && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Token expirando</AlertTitle>
                <AlertDescription>
                  O token está prestes a expirar. Renove-o para manter a
                  integração funcionando.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshToken}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Renovar Token
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectGoogle}
                disabled={loading}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="h-4 w-4 mr-1" />
                Desconectar
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ao conectar sua conta, reuniões que você criar serão adicionadas
              ao seu Google Calendar e as transcrições ficarão vinculadas ao seu
              Drive.
            </p>
            <Button onClick={() => connectGoogle()} disabled={loading}>
              <Video className="h-4 w-4 mr-2" />
              Conectar minha conta Google
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
