import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader, CheckCircle, X } from "lucide-react";
import { useFacebookIntegration } from "@/hooks/useFacebookIntegration";
import { useCompany } from "@/contexts/CompanyContext";

export const FacebookCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { handleCallback } = useFacebookIntegration();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando conexão com Facebook...');
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    // Prevent multiple processing attempts
    if (processed) return;
    
    const processCallback = async () => {
      setProcessed(true);
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state'); // This contains the company_id

      if (error) {
        setStatus('error');
        setMessage(`Erro do Facebook: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('Código de autorização não recebido');
        return;
      }

      // Use the company_id from state parameter if activeCompany is not available
      const companyId = activeCompany?.company_id || state;
      
      if (!companyId) {
        setStatus('error');
        setMessage('Empresa não identificada');
        return;
      }

      try {
        const success = await handleCallback(code, companyId);
        
        if (success) {
          setStatus('success');
          setMessage('Facebook conectado com sucesso! Redirecionando...');
          
          // Redirect to settings after 2 seconds
          setTimeout(() => {
            navigate('/configuracoes');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Falha ao processar a conexão');
        }
      } catch (error: any) {
        console.error('Callback processing error:', error);
        setStatus('error');
        setMessage(error.message || 'Erro inesperado');
      }
    };

    // Wait a bit for the company context to load before processing
    const timer = setTimeout(() => {
      processCallback();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchParams, activeCompany, handleCallback, navigate, processed]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader className="h-8 w-8 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <X className="h-8 w-8 text-destructive" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Conectando ao Facebook...';
      case 'success':
        return 'Conexão realizada!';
      case 'error':
        return 'Erro na conexão';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle>{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'error' && (
            <Button
              onClick={() => navigate('/configuracoes')}
              variant="outline"
              className="w-full"
            >
              Voltar para Configurações
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FacebookCallback;