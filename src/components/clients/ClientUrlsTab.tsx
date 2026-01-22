import React, { useState } from 'react';
import { useClientUrls, ClientUrl, ValidationStatus } from '@/hooks/useClientUrls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plus, 
  Link2, 
  ExternalLink, 
  Copy, 
  Pencil, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Globe,
  Calendar,
  Hash,
  ToggleLeft,
  ToggleRight,
  Check,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClientUrlsTabProps {
  clientId: string;
  companyId: string;
}

const sourceLabels: Record<string, { label: string; color: string }> = {
  'meta_sync': { label: 'Meta', color: 'bg-primary/10 text-primary' },
  'google_sync': { label: 'Google', color: 'bg-accent text-accent-foreground' },
  'manual': { label: 'Manual', color: 'bg-muted text-muted-foreground' },
};

const validationStatusConfig: Record<string, { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
}> = {
  'ok': { 
    label: 'OK', 
    icon: CheckCircle2, 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  'error': { 
    label: 'Erro', 
    icon: XCircle, 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10'
  },
  'timeout': { 
    label: 'Timeout', 
    icon: Clock, 
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30'
  },
  'redirect': { 
    label: 'Redirect', 
    icon: ArrowRight, 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  'pending': { 
    label: 'Pendente', 
    icon: AlertTriangle, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted'
  },
};

function AddUrlDialog({ onAdd, isAdding }: { onAdd: (url: string, label?: string) => Promise<unknown>; isAdding: boolean }) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      new URL(url); // Validate URL format
    } catch {
      setError('URL inválida. Inclua http:// ou https://');
      return;
    }
    
    try {
      await onAdd(url, label || undefined);
      setUrl('');
      setLabel('');
      setOpen(false);
    } catch {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar URL
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Nova URL</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://exemplo.com.br/pagina"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Nome/Label (opcional)</Label>
            <Input
              id="label"
              placeholder="Ex: LP Principal, WhatsApp, Página de Vendas"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditLabelDialog({ url, onUpdate }: { url: ClientUrl; onUpdate: (id: string, data: Partial<ClientUrl>) => Promise<unknown> }) {
  const [label, setLabel] = useState(url.label || '');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate(url.id, { label: label || null });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Label</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>URL</Label>
            <p className="text-sm text-muted-foreground break-all">{url.url}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-label">Label</Label>
            <Input
              id="edit-label"
              placeholder="Ex: LP Principal"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ValidationStatusBadge({ url }: { url: ClientUrl }) {
  if (!url.validation_status) {
    return (
      <Badge variant="outline" className="text-xs gap-1 bg-muted text-muted-foreground">
        <AlertTriangle className="w-3 h-3" />
        Não validada
      </Badge>
    );
  }

  const config = validationStatusConfig[url.validation_status] || validationStatusConfig.pending;
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("text-xs gap-1", config.bgColor, config.color)}>
            <Icon className="w-3 h-3" />
            {config.label}
            {url.validation_status_code && ` (${url.validation_status_code})`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-xs">
            {url.last_validated_at && (
              <p>Validado: {formatDistanceToNow(new Date(url.last_validated_at), { addSuffix: true, locale: ptBR })}</p>
            )}
            {url.validation_load_time_ms && (
              <p>Tempo: {url.validation_load_time_ms}ms</p>
            )}
            {url.validation_error && (
              <p className="text-destructive">Erro: {url.validation_error}</p>
            )}
            {url.validation_final_url && (
              <p className="break-all">Redireciona para: {url.validation_final_url}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function UrlCard({ 
  url, 
  onUpdate, 
  onDelete, 
  onToggleActive,
  onValidate,
  isValidating
}: { 
  url: ClientUrl;
  onUpdate: (id: string, data: Partial<ClientUrl>) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onToggleActive: (id: string) => Promise<unknown>;
  onValidate: (id: string) => Promise<unknown>;
  isValidating: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url.url);
    setCopied(true);
    toast.success('URL copiada');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(url.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggleActive(url.id);
    } finally {
      setToggling(false);
    }
  };

  const source = sourceLabels[url.source] || sourceLabels.manual;

  return (
    <div className={cn(
      "p-3 rounded-lg border bg-card transition-opacity",
      !url.is_active && "opacity-60"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {url.label && (
              <span className="font-medium text-sm">{url.label}</span>
            )}
            <Badge variant="secondary" className={cn("text-xs", source.color)}>
              {source.label}
            </Badge>
            <ValidationStatusBadge url={url} />
            {!url.is_active && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Inativa
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground break-all">{url.url}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Visto: {format(new Date(url.last_seen_at), "dd/MM/yy", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {url.campaign_count} campanhas
            </span>
            {url.validation_load_time_ms && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {url.validation_load_time_ms}ms
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => onValidate(url.id)}
                  disabled={isValidating}
                >
                  {isValidating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Validar URL</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            asChild
          >
            <a href={url.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
          <EditLabelDialog url={url} onUpdate={onUpdate} />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={handleToggle}
            disabled={toggling}
          >
            {url.is_active ? (
              <ToggleRight className="w-3.5 h-3.5 text-primary" />
            ) : (
              <ToggleLeft className="w-3.5 h-3.5" />
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover URL?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A URL será removida do cadastro do cliente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={deleting}
            className="bg-destructive text-destructive-foreground"
          >
            {deleting ? 'Removendo...' : 'Remover'}
          </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function DomainGroup({ 
  domain, 
  urls, 
  onUpdate, 
  onDelete, 
  onToggleActive,
  onValidate,
  isValidating
}: { 
  domain: string; 
  urls: ClientUrl[]; 
  onUpdate: (id: string, data: Partial<ClientUrl>) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onToggleActive: (id: string) => Promise<unknown>;
  onValidate: (id: string) => Promise<unknown>;
  isValidating: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-3 h-auto">
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{domain}</span>
            <Badge variant="outline" className="ml-2">
              {urls.length} URL{urls.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pl-4 pr-2 pb-2">
        {urls.map((url) => (
          <UrlCard 
            key={url.id} 
            url={url} 
            onUpdate={onUpdate}
            onDelete={onDelete}
            onToggleActive={onToggleActive}
            onValidate={onValidate}
            isValidating={isValidating}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ClientUrlsTab({ clientId, companyId }: ClientUrlsTabProps) {
  const { 
    urls, 
    urlsByDomain, 
    loading, 
    addUrl, 
    updateUrl, 
    deleteUrl, 
    toggleActive,
    importExistingUrls,
    validateUrl,
    validateAllUrls,
    isAdding,
    isValidating
  } = useClientUrls({ clientId, companyId });
  
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await importExistingUrls();
    } finally {
      setIsImporting(false);
    }
  };

  const handleValidateAll = async () => {
    try {
      await validateAllUrls();
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const domains = Object.keys(urlsByDomain).sort();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">URLs do Cliente</h3>
          <Badge variant="secondary">{urls.length}</Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {urls.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={handleValidateAll}
              disabled={isValidating}
            >
              {isValidating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isValidating ? 'Validando...' : 'Validar Todas'}
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleImport}
            disabled={isImporting}
          >
            <Download className="w-4 h-4" />
            {isImporting ? 'Importando...' : 'Importar do Banco'}
          </Button>
          <AddUrlDialog onAdd={addUrl} isAdding={isAdding} />
        </div>
      </div>

      {urls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Link2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">Nenhuma URL cadastrada</h4>
            <p className="text-sm text-muted-foreground mb-4">
              As URLs serão capturadas automaticamente durante a sincronização de campanhas ou você pode importar as existentes.
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleImport}
                disabled={isImporting}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {isImporting ? 'Importando...' : 'Importar URLs Existentes'}
              </Button>
              <AddUrlDialog onAdd={addUrl} isAdding={isAdding} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1 border rounded-lg divide-y">
          {domains.map((domain) => (
            <DomainGroup
              key={domain}
              domain={domain}
              urls={urlsByDomain[domain]}
              onUpdate={updateUrl}
              onDelete={deleteUrl}
              onToggleActive={toggleActive}
              onValidate={validateUrl}
              isValidating={isValidating}
            />
          ))}
        </div>
      )}
    </div>
  );
}
