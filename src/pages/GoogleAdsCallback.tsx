import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGoogleAdsIntegration } from "@/hooks/useGoogleAdsIntegration";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GoogleAdsCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { handleCallback } = useGoogleAdsIntegration();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  
  // Ref para garantir que o processamento só aconteça uma vez
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Prevenir múltiplas execuções
    if (hasProcessedRef.current) {
      return;
    }

    const processCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setStatus('error');
        setError('Autorização negada pelo usuário');
        return;
      }

      if (!code) {
        setStatus('error');
        setError('Código de autorização não encontrado');
        return;
      }

      if (!activeCompany) {
        setStatus('error');
        setError('Nenhuma empresa ativa');
        return;
      }

      try {
        hasProcessedRef.current = true;
        await handleCallback(code, activeCompany.id);
        setStatus('success');
        setTimeout(() => {
          navigate('/configuracoes/integracao-google');
        }, 2000);
      } catch (error: any) {
        setStatus('error');
        setError(error.message || 'Erro ao processar callback');
        hasProcessedRef.current = false; // Permitir retry em caso de erro
      }
    };

    processCallback();
  }, [searchParams, activeCompany, handleCallback, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-500" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-destructive" />}
            {status === 'loading' && 'Conectando ao Google Ads...'}
            {status === 'success' && 'Conectado com sucesso!'}
            {status === 'error' && 'Erro na conexão'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Processando autorização...'}
            {status === 'success' && 'Redirecionando para as configurações...'}
            {status === 'error' && error}
          </CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent>
            <Button onClick={() => navigate('/configuracoes/integracao-google')} className="w-full">
              Voltar para Configurações
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
