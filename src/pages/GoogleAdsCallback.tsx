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
    // Marcar IMEDIATAMENTE para prevenir race conditions
    if (hasProcessedRef.current) {
      console.log('Callback already processed in this session, preventing duplicate');
      return;
    }

    const processCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      console.log('GoogleAdsCallback - Initial check:', { 
        hasCode: !!code, 
        hasError: !!errorParam,
        hasCompany: !!activeCompany,
        companyId: activeCompany?.id
      });

      if (errorParam) {
        setStatus('error');
        setError('Autorização negada pelo usuário');
        hasProcessedRef.current = true;
        return;
      }

      if (!code) {
        setStatus('error');
        setError('Código de autorização não encontrado');
        hasProcessedRef.current = true;
        return;
      }

      // Aguardar a empresa estar disponível (com timeout de 10 segundos)
      if (!activeCompany) {
        console.log('Waiting for activeCompany to load...');
        const maxWaitTime = 10000; // 10 segundos
        const checkInterval = 100; // Verificar a cada 100ms
        let elapsedTime = 0;

        while (!activeCompany && elapsedTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          elapsedTime += checkInterval;
          console.log(`Waiting... ${elapsedTime}ms elapsed, activeCompany:`, !!activeCompany);
        }

        if (!activeCompany) {
          console.error('Timeout waiting for activeCompany');
          setStatus('error');
          setError('Tempo esgotado aguardando empresa ativa. Tente novamente.');
          hasProcessedRef.current = true;
          return;
        }

        console.log('ActiveCompany loaded:', activeCompany.id);
      }

      // Marcar como processado ANTES de fazer a chamada
      hasProcessedRef.current = true;

      try {
        console.log('Processing callback with company:', activeCompany.id);
        await handleCallback(code, activeCompany.id);
        setStatus('success');
        setTimeout(() => {
          navigate('/configuracoes/integracao-google');
        }, 2000);
      } catch (error: any) {
        console.error('Callback processing error:', error);
        setStatus('error');
        setError(error.message || 'Erro ao processar callback');
        // Resetar apenas se for erro real (não duplicação)
        if (error.message !== 'Code already being processed') {
          hasProcessedRef.current = false;
        }
      }
    };

    processCallback();
  }, [activeCompany]); // Depender de activeCompany para reexecutar quando carregar

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
