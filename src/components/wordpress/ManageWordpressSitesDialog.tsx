import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, ExternalLink, Globe, Pencil, Trash2, Plus, ArrowLeft, RefreshCw } from 'lucide-react';
import { useWordpressSites, WordpressSite } from '@/hooks/useWordpressSites';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ManageWordpressSitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

type ViewMode = 'list' | 'add' | 'edit';

export function ManageWordpressSitesDialog({ open, onOpenChange, companyId }: ManageWordpressSitesDialogProps) {
  const { sites, isLoading, addSite, updateSite, deleteSite, testConnection, isAdding, isUpdating, isDeleting, isTesting } = useWordpressSites(companyId);
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingSite, setEditingSite] = useState<WordpressSite | null>(null);
  const [deleteConfirmSite, setDeleteConfirmSite] = useState<WordpressSite | null>(null);
  const [testingSiteId, setTestingSiteId] = useState<string | null>(null);
  
  // Form state
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
    setEditingSite(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
      setViewMode('list');
    }
    onOpenChange(isOpen);
  };

  const handleAddNew = () => {
    resetForm();
    setViewMode('add');
  };

  const handleEdit = (site: WordpressSite) => {
    setEditingSite(site);
    setName(site.name);
    setSiteUrl(site.site_url);
    setUsername(site.username);
    setAppPassword(site.app_password);
    setConnectionStatus('idle');
    setConnectionError('');
    setViewMode('edit');
  };

  const handleBack = () => {
    resetForm();
    setViewMode('list');
  };

  const handleTestConnection = async (site?: WordpressSite) => {
    const urlToTest = site ? site.site_url : siteUrl;
    const userToTest = site ? site.username : username;
    const passToTest = site ? site.app_password : appPassword;

    if (!urlToTest || !userToTest || !passToTest) return;

    if (site) {
      setTestingSiteId(site.id);
    } else {
      setConnectionStatus('testing');
    }
    setConnectionError('');

    try {
      await testConnection({ siteUrl: urlToTest, username: userToTest, appPassword: passToTest });
      if (!site) setConnectionStatus('success');
    } catch (error: any) {
      if (!site) {
        setConnectionStatus('error');
        setConnectionError(error.message || 'Falha na conexão');
      }
    } finally {
      setTestingSiteId(null);
    }
  };

  const handleSave = async () => {
    if (!name || !siteUrl || !username || !appPassword) return;

    try {
      if (editingSite) {
        await updateSite({
          id: editingSite.id,
          name,
          site_url: siteUrl,
          username,
          app_password: appPassword,
        });
      } else {
        await addSite({ name, site_url: siteUrl, username, app_password: appPassword });
      }
      resetForm();
      setViewMode('list');
    } catch (error) {
      console.error('Error saving site:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmSite) return;
    try {
      await deleteSite(deleteConfirmSite.id);
      setDeleteConfirmSite(null);
    } catch (error) {
      console.error('Error deleting site:', error);
    }
  };

  const renderForm = () => (
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
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            {viewMode === 'list' && (
              <>
                <DialogTitle>Gerenciar Sites WordPress</DialogTitle>
                <DialogDescription>
                  Visualize, edite e teste a conexão dos seus sites WordPress.
                </DialogDescription>
              </>
            )}
            {viewMode === 'add' && (
              <>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <DialogTitle>Adicionar Site WordPress</DialogTitle>
                </div>
                <DialogDescription>
                  Configure as credenciais do seu site WordPress.
                </DialogDescription>
              </>
            )}
            {viewMode === 'edit' && (
              <>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <DialogTitle>Editar Site WordPress</DialogTitle>
                </div>
                <DialogDescription>
                  Atualize as configurações do site.
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          {viewMode === 'list' && (
            <div className="space-y-3 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : sites.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">Nenhum site cadastrado</p>
                  <Button onClick={handleAddNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Site
                  </Button>
                </div>
              ) : (
                <>
                  {sites.map((site) => (
                    <Card key={site.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate">{site.name}</span>
                              <Badge variant={site.is_active ? 'default' : 'secondary'} className="flex-shrink-0">
                                {site.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {site.site_url}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Usuário: {site.username}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleTestConnection(site)}
                              disabled={testingSiteId === site.id}
                            >
                              {testingSiteId === site.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(site)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmSite(site)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button onClick={handleAddNew} variant="outline" className="w-full mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Novo Site
                  </Button>
                </>
              )}
            </div>
          )}

          {(viewMode === 'add' || viewMode === 'edit') && (
            <>
              {renderForm()}
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleTestConnection()}
                  disabled={!siteUrl || !username || !appPassword || connectionStatus === 'testing'}
                >
                  {connectionStatus === 'testing' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Testar Conexão
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!name || !siteUrl || !username || !appPassword || isAdding || isUpdating}
                >
                  {(isAdding || isUpdating) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {viewMode === 'edit' ? 'Salvar Alterações' : 'Adicionar Site'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmSite} onOpenChange={(open) => !open && setDeleteConfirmSite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover site WordPress?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o site "{deleteConfirmSite?.name}"? 
              Esta ação não pode ser desfeita e as automações vinculadas a este site deixarão de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}