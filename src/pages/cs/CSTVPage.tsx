import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Tv, 
  Copy, 
  RefreshCw, 
  ExternalLink, 
  Key,
  CheckCircle,
  Loader2,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';
import { useCsTvDashboardToken } from '@/hooks/useCsTvDashboardToken';

export default function CSTVPage() {
  const { token, loading, generating, generateToken, regenerateToken, getPublicUrl } = useCsTvDashboardToken();
  const [copied, setCopied] = useState(false);

  const publicUrl = getPublicUrl();

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Link copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenDashboard = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  };

  const handleGenerateToken = async () => {
    await generateToken();
  };

  const handleRegenerateToken = async () => {
    await regenerateToken();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tv className="w-6 h-6 text-pink-500" />
          CS TV Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Dashboard para exibição em TV com métricas de Customer Success em tempo real
        </p>
      </div>

      {/* Token Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Token de Acesso Público
          </CardTitle>
          <CardDescription>
            O token permite acesso público ao dashboard sem necessidade de login.
            Ideal para exibição em TVs corporativas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !token ? (
            <div className="text-center py-8 space-y-4">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-muted-foreground mb-4">
                  Nenhum token gerado ainda. Clique abaixo para criar um.
                </p>
                <Button onClick={handleGenerateToken} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Gerar Token
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Token Ativo
                </Badge>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Link do Dashboard</label>
                <div className="flex gap-2">
                  <Input 
                    value={publicUrl || ''} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleOpenDashboard}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={handleRegenerateToken}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Regenerar Token
                </Button>
                <Button onClick={handleOpenDashboard}>
                  <Tv className="w-4 h-4 mr-2" />
                  Abrir Dashboard
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Como usar o CS TV Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                Gere o Token
              </h4>
              <p className="text-sm text-muted-foreground">
                Clique em "Gerar Token" para criar um link público único para seu dashboard.
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                Copie o Link
              </h4>
              <p className="text-sm text-muted-foreground">
                Copie o link gerado e configure-o em sua TV ou dispositivo de exibição.
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
                Configure a TV
              </h4>
              <p className="text-sm text-muted-foreground">
                Abra o link em um navegador na TV. Use os controles para ajustar zoom e rotação.
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">4</span>
                Modo Kiosk
              </h4>
              <p className="text-sm text-muted-foreground">
                Ative o modo Kiosk para ocultar controles. Os dados atualizam automaticamente.
              </p>
            </div>
          </div>

          <div className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-lg">
            <h4 className="font-medium text-pink-500 mb-2">💡 Dica</h4>
            <p className="text-sm text-muted-foreground">
              O dashboard exibe métricas de saúde dos clientes, análise de sentimento do WhatsApp, 
              clientes em risco e ações pendentes de CS. Perfeito para acompanhamento em tempo real!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
