import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useWordpressSites } from '@/hooks/useWordpressSites';

interface AddWordpressSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

export function AddWordpressSiteDialog({ open, onOpenChange, companyId, onSuccess }: AddWordpressSiteDialogProps) {
  const { addSite, testConnection, isAdding, isTesting } = useWordpressSites(companyId);
  
  const [name, setName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState('');

  const resetForm = () => {
    setName('');
    setSiteUrl('');
    setUsername('');
    setAppPassword('');
    setConnectionStatus('idle');
    setConnectionError('');
  };

  const handleTest = async () => {
    if (!siteUrl || !username || !appPassword) return;

    setConnectionStatus('testing');
    setConnectionError('');

    try {
      await testConnection({ siteUrl, username, appPassword });
      setConnectionStatus('success');
    } catch (error: any) {
      setConnectionStatus('error');
      setConnectionError(error.message || 'Falha na conexão');
    }
  };

  const handleSave = async () => {
    if (!name || !siteUrl || !username || !appPassword) return;

    try {
      await addSite({ name, site_url: siteUrl, username, app_password: appPassword });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding site:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Site WordPress</DialogTitle>
          <DialogDescription>
            Configure as credenciais do seu site WordPress para publicação automática.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Site</Label>
            <Input
              id="name"
              placeholder="Ex: Blog Principal"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteUrl">URL do Site</Label>
            <Input
              id="siteUrl"
              placeholder="https://seusite.com.br"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Usuário WordPress</Label>
            <Input
              id="username"
              placeholder="seu_usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appPassword">Application Password</Label>
            <Input
              id="appPassword"
              type="password"
              placeholder="xxxx xxxx xxxx xxxx xxxx"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Crie em: WordPress {'>'} Usuários {'>'} Seu Perfil {'>'} Application Passwords
              <a 
                href="https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center ml-1 text-primary hover:underline"
              >
                Saiba mais <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </p>
          </div>

          {connectionStatus !== 'idle' && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              connectionStatus === 'success' ? 'bg-green-500/10 text-green-600' :
              connectionStatus === 'error' ? 'bg-red-500/10 text-red-600' :
              'bg-muted'
            }`}>
              {connectionStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
              {connectionStatus === 'success' && <CheckCircle className="w-4 h-4" />}
              {connectionStatus === 'error' && <XCircle className="w-4 h-4" />}
              <span className="text-sm">
                {connectionStatus === 'testing' && 'Testando conexão...'}
                {connectionStatus === 'success' && 'Conexão estabelecida!'}
                {connectionStatus === 'error' && (connectionError || 'Falha na conexão')}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!siteUrl || !username || !appPassword || isTesting}
          >
            {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Testar Conexão
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name || !siteUrl || !username || !appPassword || isAdding}
          >
            {isAdding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
