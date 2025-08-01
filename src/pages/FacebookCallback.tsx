import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFacebookIntegration } from '@/hooks/useFacebookIntegration';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Loader2 } from 'lucide-react';

const FacebookCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useFacebookIntegration();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state'); // company ID
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('Usuário cancelou a autorização ou ocorreu um erro.');
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Parâmetros inválidos na resposta do Facebook.');
        return;
      }

      try {
        const success = await handleCallback(code, state);
        if (success) {
          setStatus('success');
          setMessage('Integração com Facebook Ads realizada com sucesso!');
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Falha ao processar a autorização do Facebook.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Erro interno ao processar a integração.');
      }
    };

    processCallback();
  }, [searchParams, handleCallback, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'error':
        return <X className="h-12 w-12 text-red-600" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Processando integração...';
      case 'success':
        return 'Integração realizada!';
      case 'error':
        return 'Erro na integração';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-xl">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'success' && (
            <p className="text-sm text-green-600">
              Redirecionando para o dashboard...
            </p>
          )}
          
          {status === 'error' && (
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Voltar ao Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FacebookCallback;