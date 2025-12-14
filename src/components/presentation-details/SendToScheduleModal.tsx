import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Send,
  Calendar,
  Image,
  Film,
  LayoutGrid,
  Square,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExtendedPresentationCreative, useSendToSchedule } from "@/hooks/usePresentationMeetings";
import { useFacebookPages } from "@/hooks/useFacebookPages";
import { useCompany } from "@/contexts/CompanyContext";

interface SendToScheduleModalProps {
  open: boolean;
  onClose: () => void;
  creatives: ExtendedPresentationCreative[];
  clientId: string;
  companyId: string;
  onSuccess: () => void;
}

const CREATIVE_TYPE_LABELS: Record<string, string> = {
  post_unico: "Post Único",
  carrossel: "Carrossel",
  reels: "Reels",
  stories: "Stories",
};

const CREATIVE_TYPE_ICONS: Record<string, React.ElementType> = {
  post_unico: Image,
  carrossel: LayoutGrid,
  reels: Film,
  stories: Square,
};

export function SendToScheduleModal({ 
  open, 
  onClose, 
  creatives, 
  clientId, 
  companyId,
  onSuccess 
}: SendToScheduleModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [facebookPageId, setFacebookPageId] = useState<string>("none");
  const [instagramAccountId, setInstagramAccountId] = useState<string>("none");
  
  const { sendToSchedule } = useSendToSchedule();
  const { pages, instagramAccounts, loading: loadingAccounts } = useFacebookPages();

  // Filter pages/accounts for this client
  const clientPages = pages.filter(p => (p as any).client_id === clientId);
  const clientInstagramAccounts = instagramAccounts.filter(a => (a as any).client_id === clientId);

  // Auto-select all creatives on open
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(creatives.map(c => c.id)));
      // Auto-select first account if available
      if (clientPages.length > 0 && !facebookPageId) {
        setFacebookPageId(clientPages[0].id);
      }
      if (clientInstagramAccounts.length > 0 && !instagramAccountId) {
        setInstagramAccountId(clientInstagramAccounts[0].id);
      }
    }
  }, [open, creatives, clientPages, clientInstagramAccounts]);

  const toggleCreative = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === creatives.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(creatives.map(c => c.id)));
    }
  };

  const handleSubmit = async () => {
    const selectedCreatives = creatives.filter(c => selectedIds.has(c.id));
    
    await sendToSchedule.mutateAsync({
      creatives: selectedCreatives,
      clientId,
      companyId,
      facebookPageId: facebookPageId === "none" ? null : facebookPageId,
      instagramAccountId: instagramAccountId === "none" ? null : instagramAccountId,
    });

    onSuccess();
  };

  const hasNoAccounts = clientPages.length === 0 && clientInstagramAccounts.length === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Enviar para Agendamento
          </DialogTitle>
          <DialogDescription>
            Selecione os criativos aprovados que deseja enviar para o calendário de agendamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account Selection */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label>Página do Facebook</Label>
              <Select value={facebookPageId} onValueChange={setFacebookPageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {clientPages.map(page => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.page_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta do Instagram</Label>
              <Select value={instagramAccountId} onValueChange={setInstagramAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {clientInstagramAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      @{account.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasNoAccounts && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm">
                Este cliente não possui páginas ou contas configuradas. Configure as redes sociais primeiro.
              </p>
            </div>
          )}

          {/* Select All */}
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedIds.size === creatives.length}
                onCheckedChange={toggleAll}
              />
              <Label htmlFor="select-all" className="font-medium cursor-pointer">
                Selecionar todos
              </Label>
            </div>
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} de {creatives.length} selecionados
            </span>
          </div>

          {/* Creatives List */}
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {creatives.map((creative) => {
                const TypeIcon = CREATIVE_TYPE_ICONS[creative.creative_type] || Image;
                const firstMedia = creative.creative_media?.[0];

                return (
                  <div
                    key={creative.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedIds.has(creative.id) 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleCreative(creative.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(creative.id)}
                      onCheckedChange={() => toggleCreative(creative.id)}
                    />

                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-md bg-muted overflow-hidden shrink-0">
                      {firstMedia ? (
                        <img
                          src={firstMedia.media_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <TypeIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {CREATIVE_TYPE_LABELS[creative.creative_type]}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {creative.headline || `Criativo ${creative.order_index + 1}`}
                      </p>
                    </div>

                    {creative.scheduled_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(creative.scheduled_date), "dd/MM", { locale: ptBR })}
                        {creative.scheduled_time && ` ${creative.scheduled_time}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || sendToSchedule.isPending || (!facebookPageId && !instagramAccountId)}
          >
            {sendToSchedule.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar {selectedIds.size} criativo(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
