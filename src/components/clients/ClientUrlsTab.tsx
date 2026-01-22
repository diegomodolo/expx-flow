import React, { useState } from 'react';
import { useClientUrls, ClientUrl } from '@/hooks/useClientUrls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
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
  Check
} from 'lucide-react';
import { format } from 'date-fns';
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

function UrlCard({ 
  url, 
  onUpdate, 
  onDelete, 
  onToggleActive 
}: { 
  url: ClientUrl;
  onUpdate: (id: string, data: Partial<ClientUrl>) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onToggleActive: (id: string) => Promise<unknown>;
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
  onToggleActive 
}: { 
  domain: string; 
  urls: ClientUrl[]; 
  onUpdate: (id: string, data: Partial<ClientUrl>) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onToggleActive: (id: string) => Promise<unknown>;
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
    isAdding 
  } = useClientUrls({ clientId, companyId });

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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">URLs do Cliente</h3>
          <Badge variant="secondary">{urls.length}</Badge>
        </div>
        <AddUrlDialog onAdd={addUrl} isAdding={isAdding} />
      </div>

      {urls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Link2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">Nenhuma URL cadastrada</h4>
            <p className="text-sm text-muted-foreground mb-4">
              As URLs serão capturadas automaticamente durante a sincronização de campanhas ou você pode adicionar manualmente.
            </p>
            <AddUrlDialog onAdd={addUrl} isAdding={isAdding} />
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
