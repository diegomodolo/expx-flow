import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGoogleMeetIntegration } from "@/hooks/useGoogleMeetIntegration";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GoogleMeetCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { handleCallback } = useGoogleMeetIntegration();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);

  // Parse state to get userId and origin
  const stateParam = searchParams.get("state");
  let stateUserId: string | undefined;
  let stateFrom = "settings";
  if (stateParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateParam));
      stateUserId = parsed.userId;
      stateFrom = parsed.from || "settings";
    } catch {
      /* ignore invalid state */
    }
  }

  const redirectMap: Record<string, string> = {
    profile: "/perfil/integracoes",
    settings: "/configuracoes/integracao-google-meet",
    reunioes: "/reunioes",
  };
  const redirectTo = redirectMap[stateFrom] || redirectMap.settings;

  useEffect(() => {
    if (!activeCompany) return;
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const processCallback = async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setStatus("error");
        setError("Autorização negada pelo usuário");
        return;
      }

      if (!code) {
        setStatus("error");
        setError("Código de autorização não encontrado");
        return;
      }

      try {
        await handleCallback(code, activeCompany.company_id, stateUserId);
        setStatus("success");
        setTimeout(() => navigate(redirectTo), 2000);
      } catch (error: unknown) {
        setStatus("error");
        setError(
          error instanceof Error ? error.message : "Erro ao processar callback",
        );
        hasProcessedRef.current = false;
      }
    };

    processCallback();
  }, [
    activeCompany,
    searchParams,
    handleCallback,
    navigate,
    stateUserId,
    redirectTo,
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "loading" && (
              <Loader2 className="h-6 w-6 animate-spin" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            )}
            {status === "error" && (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
            {status === "loading" && "Conectando ao Google Meet..."}
            {status === "success" && "Conectado com sucesso!"}
            {status === "error" && "Erro na conexão"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Processando autorização..."}
            {status === "success" && "Redirecionando..."}
            {status === "error" && error}
          </CardDescription>
        </CardHeader>
        {status === "error" && (
          <CardContent>
            <Button onClick={() => navigate(redirectTo)} className="w-full">
              Voltar
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
