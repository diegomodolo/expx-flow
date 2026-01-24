import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Loader2, 
  ImageIcon, 
  Save, 
  TrendingUp, 
  DollarSign, 
  Eye, 
  MousePointer, 
  AlertTriangle,
  Image,
  Film,
  Layers,
  Link2,
  ChevronDown,
  Info,
} from 'lucide-react';
import { TreeNode } from '@/hooks/useCampaignTree';
import { MediaUploader } from '@/components/campaigns/builder/MediaUploader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// CTA options from CreativeBuilderModal
const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'SUBSCRIBE', label: 'Inscrever-se' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'GET_QUOTE', label: 'Pedir Orçamento' },
  { value: 'BOOK_NOW', label: 'Reservar Agora' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'APPLY_NOW', label: 'Candidatar-se' },
  { value: 'GET_OFFER', label: 'Obter Oferta' },
  { value: 'WATCH_MORE', label: 'Assistir Mais' },
  { value: 'SEND_MESSAGE', label: 'Enviar Mensagem' },
  { value: 'WHATSAPP_MESSAGE', label: 'WhatsApp' },
  { value: 'CALL_NOW', label: 'Ligar Agora' },
];

interface AdEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: TreeNode | null;
  clientId: string;
  companyId?: string;
  onSuccess?: () => void;
}

export function AdEditModal({
  isOpen,
  onClose,
  node,
  clientId,
  companyId,
  onSuccess,
}: AdEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [creativeChanged, setCreativeChanged] = useState(false);
  
  // Basic fields
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'paused'>('active');
  
  // Creative fields
  const [creativeType, setCreativeType] = useState<'IMAGE' | 'VIDEO' | 'CAROUSEL'>('IMAGE');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [callToAction, setCallToAction] = useState('LEARN_MORE');
  
  // UTM parameters
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [utmTerm, setUtmTerm] = useState('');
  const [showUtmFields, setShowUtmFields] = useState(false);

  // Original values for comparison
  const [originalValues, setOriginalValues] = useState<any>(null);

  // Reset form when node changes
  useEffect(() => {
    if (node && isOpen && node.type === 'ad') {
      const nodeAny = node as any;
      
      setEditName(node.name);
      setEditStatus(node.status === 'active' ? 'active' : 'paused');
      
      // Set creative type
      const nodeCreativeType = nodeAny.creativeType?.toUpperCase() || 'IMAGE';
      setCreativeType(nodeCreativeType as 'IMAGE' | 'VIDEO' | 'CAROUSEL');
      
      // Set media URLs
      if (nodeAny.creativeUrl) {
        setMediaUrls([nodeAny.creativeUrl]);
      } else if (node.metrics && (node as any).imageUrl) {
        setMediaUrls([(node as any).imageUrl]);
      } else {
        setMediaUrls([]);
      }
      
      // Set text fields
      setBody(nodeAny.creativeBody || '');
      setTitle(nodeAny.creativeTitle || '');
      setDescription(nodeAny.creativeDescription || '');
      setLinkUrl(nodeAny.linkUrl || '');
      setCallToAction(nodeAny.callToAction || 'LEARN_MORE');
      
      // Parse UTM from link URL if present
      if (nodeAny.linkUrl) {
        try {
          const url = new URL(nodeAny.linkUrl);
          setUtmSource(url.searchParams.get('utm_source') || '');
          setUtmMedium(url.searchParams.get('utm_medium') || '');
          setUtmCampaign(url.searchParams.get('utm_campaign') || '');
          setUtmContent(url.searchParams.get('utm_content') || '');
          setUtmTerm(url.searchParams.get('utm_term') || '');
          
          // Show UTM fields if any exist
          if (url.searchParams.has('utm_source') || url.searchParams.has('utm_medium')) {
            setShowUtmFields(true);
          }
        } catch {
          // Invalid URL, ignore
        }
      }
      
      // Store original values for comparison
      setOriginalValues({
        name: node.name,
        status: node.status,
        creativeType: nodeCreativeType,
        mediaUrls: nodeAny.creativeUrl ? [nodeAny.creativeUrl] : [],
        body: nodeAny.creativeBody || '',
        title: nodeAny.creativeTitle || '',
        description: nodeAny.creativeDescription || '',
        linkUrl: nodeAny.linkUrl || '',
        callToAction: nodeAny.callToAction || 'LEARN_MORE',
      });
      
      setHasChanges(false);
      setCreativeChanged(false);
    }
  }, [node?.id, isOpen]);

  // Track changes
  useEffect(() => {
    if (!originalValues) return;
    
    const nameChanged = editName !== originalValues.name;
    const statusChanged = editStatus !== (originalValues.status === 'active' ? 'active' : 'paused');
    
    // Check creative changes
    const creativeTypeChanged = creativeType !== originalValues.creativeType;
    const mediaChanged = JSON.stringify(mediaUrls) !== JSON.stringify(originalValues.mediaUrls);
    const bodyChanged = body !== originalValues.body;
    const titleChanged = title !== originalValues.title;
    const descriptionChanged = description !== originalValues.description;
    const linkChanged = linkUrl !== originalValues.linkUrl;
    const ctaChanged = callToAction !== originalValues.callToAction;
    
    const isCreativeChanged = creativeTypeChanged || mediaChanged || bodyChanged || 
                              titleChanged || descriptionChanged || linkChanged || ctaChanged;
    
    setCreativeChanged(isCreativeChanged);
    setHasChanges(nameChanged || statusChanged || isCreativeChanged);
  }, [editName, editStatus, creativeType, mediaUrls, body, title, description, linkUrl, callToAction, originalValues]);

  const handleSave = useCallback(async () => {
    if (!clientId || !node) return;

    // Validation
    if (!editName.trim()) {
      toast.error('O nome do anúncio não pode estar vazio');
      return;
    }
    if (mediaUrls.length === 0) {
      toast.error('É necessário ter pelo menos uma mídia');
      return;
    }
    if (!body.trim()) {
      toast.error('O texto principal é obrigatório');
      return;
    }
    if (linkUrl && !linkUrl.match(/^https?:\/\//)) {
      toast.error('A URL de destino deve começar com http:// ou https://');
      return;
    }

    setIsSaving(true);
    const platform = node.platform as 'meta' | 'google';
    const facebookId = (node as any).facebookId;

    try {
      // Build URL with UTM parameters
      let finalUrl = linkUrl;
      if (linkUrl) {
        const utmParams: string[] = [];
        if (utmSource) utmParams.push(`utm_source=${encodeURIComponent(utmSource)}`);
        if (utmMedium) utmParams.push(`utm_medium=${encodeURIComponent(utmMedium)}`);
        if (utmCampaign) utmParams.push(`utm_campaign=${encodeURIComponent(utmCampaign)}`);
        if (utmContent) utmParams.push(`utm_content=${encodeURIComponent(utmContent)}`);
        if (utmTerm) utmParams.push(`utm_term=${encodeURIComponent(utmTerm)}`);
        
        if (utmParams.length > 0) {
          // Remove existing UTM params from base URL
          const baseUrl = linkUrl.split('?')[0];
          const existingParams = linkUrl.includes('?') ? linkUrl.split('?')[1] : '';
          const cleanedParams = existingParams
            .split('&')
            .filter(p => !p.startsWith('utm_'))
            .join('&');
          
          const allParams = cleanedParams 
            ? `${cleanedParams}&${utmParams.join('&')}` 
            : utmParams.join('&');
          finalUrl = `${baseUrl}?${allParams}`;
        }
      }

      // For Meta ads with creative changes, we need to create a new creative
      if (platform === 'meta' && facebookId) {
        const { data, error } = await supabase.functions.invoke('update-meta-ad', {
          body: {
            clientId,
            adId: node.id,
            facebookId,
            updates: {
              name: editName !== originalValues?.name ? editName : undefined,
              status: editStatus !== (originalValues?.status === 'active' ? 'active' : 'paused')
                ? (editStatus === 'active' ? 'ACTIVE' : 'PAUSED')
                : undefined,
              creative: creativeChanged ? {
                type: creativeType,
                media_urls: mediaUrls,
                body,
                title,
                description,
                link_url: finalUrl,
                call_to_action: callToAction,
              } : undefined,
            },
          },
        });

        if (error) throw error;

        if (!data?.success) {
          throw new Error(data?.error || 'Erro ao atualizar anúncio');
        }

        toast.success('Anúncio atualizado com sucesso!');
      } else {
        // For Google or no Facebook ID, update only local database
        const { error: updateError } = await supabase
          .from('ads')
          .update({
            name: editName,
            status: editStatus,
            is_active: editStatus === 'active',
            creative_type: creativeType,
            creative_body: body,
            creative_title: title,
            creative_description: description,
            link_url: finalUrl,
            call_to_action: callToAction,
            image_url: creativeType !== 'VIDEO' ? mediaUrls[0] : null,
            video_url: creativeType === 'VIDEO' ? mediaUrls[0] : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', node.id);

        if (updateError) throw updateError;

        toast.success('Anúncio atualizado localmente');
      }

      setHasChanges(false);
      setCreativeChanged(false);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error saving ad:', error);
      toast.error(error.message || 'Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  }, [clientId, node, editName, editStatus, creativeType, mediaUrls, body, title, description, linkUrl, callToAction, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, originalValues, creativeChanged, onSuccess, onClose]);

  if (!node || node.type !== 'ad') return null;

  const isGoogle = node.platform === 'google';
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-primary" />
            <div className="flex-1">
              <DialogTitle className="text-xl">Editar Anúncio</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant={node.status === 'active' ? 'default' : 'secondary'}>
                  {node.status === 'active' ? 'Ativo' : 'Pausado'}
                </Badge>
                <Badge variant="outline">{node.platform.toUpperCase()}</Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-6">
            {/* Google Alert */}
            {isGoogle && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Google Ads: alterações serão salvas apenas localmente.
                </AlertDescription>
              </Alert>
            )}

            {/* Creative Change Warning */}
            {creativeChanged && !isGoogle && (
              <Alert className="border-warning bg-warning/10">
                <Info className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning-foreground">
                  Alterações no criativo (mídia, textos, URL) exigem a criação de um novo creative no Meta. O anúncio será atualizado para usar o novo creative.
                </AlertDescription>
              </Alert>
            )}

            {/* Name Field */}
            <div className="space-y-2">
              <Label>Nome do Anúncio *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ex: Anúncio Principal - Produto A"
              />
              {editName.trim() === '' && (
                <p className="text-xs text-destructive">O nome não pode estar vazio</p>
              )}
            </div>

            {/* Status Field */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {editStatus === 'active' ? 'Ativo' : 'Pausado'}
                  </span>
                  <Badge variant={editStatus === 'active' ? 'default' : 'secondary'}>
                    {editStatus === 'active' ? 'ON' : 'OFF'}
                  </Badge>
                </div>
                <Switch
                  checked={editStatus === 'active'}
                  onCheckedChange={(checked) => setEditStatus(checked ? 'active' : 'paused')}
                />
              </div>
            </div>

            {/* Creative Section */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm">Criativo</h4>

              {/* Creative Type */}
              <div className="space-y-2">
                <Label>Tipo de Criativo</Label>
                <ToggleGroup
                  type="single"
                  value={creativeType}
                  onValueChange={(value) => value && setCreativeType(value as 'IMAGE' | 'VIDEO' | 'CAROUSEL')}
                  className="justify-start"
                >
                  <ToggleGroupItem value="IMAGE" aria-label="Imagem" className="gap-2">
                    <Image className="h-4 w-4" />
                    Imagem
                  </ToggleGroupItem>
                  <ToggleGroupItem value="VIDEO" aria-label="Vídeo" className="gap-2">
                    <Film className="h-4 w-4" />
                    Vídeo
                  </ToggleGroupItem>
                  <ToggleGroupItem value="CAROUSEL" aria-label="Carrossel" className="gap-2">
                    <Layers className="h-4 w-4" />
                    Carrossel
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Media Uploader */}
              <div className="space-y-2">
                <Label>Mídia *</Label>
                <MediaUploader
                  mediaUrls={mediaUrls}
                  onChange={setMediaUrls}
                  type={creativeType}
                  maxFiles={creativeType === 'CAROUSEL' ? 10 : 1}
                  clientId={clientId}
                  creativeContext={{ title, body, description }}
                />
              </div>

              {/* Body Text */}
              <div className="space-y-2">
                <Label>Texto Principal *</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Texto principal do anúncio que aparece acima da mídia"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">{body.length}/500 caracteres</p>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do anúncio (headline)"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição complementar"
                />
              </div>
            </div>

            {/* Destination Section */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Destino
              </h4>

              {/* Link URL */}
              <div className="space-y-2">
                <Label>URL de Destino</Label>
                <Input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://seusite.com/pagina"
                />
                {linkUrl && !linkUrl.match(/^https?:\/\//) && (
                  <p className="text-xs text-destructive">URL deve começar com http:// ou https://</p>
                )}
              </div>

              {/* Call to Action */}
              <div className="space-y-2">
                <Label>Chamada para Ação (CTA)</Label>
                <Select value={callToAction} onValueChange={setCallToAction}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CTA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* UTM Parameters */}
              <Collapsible open={showUtmFields} onOpenChange={setShowUtmFields}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 h-8 text-xs">
                    <ChevronDown className={`h-3 w-3 transition-transform ${showUtmFields ? 'rotate-180' : ''}`} />
                    Parâmetros UTM
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">utm_source</Label>
                      <Input
                        value={utmSource}
                        onChange={(e) => setUtmSource(e.target.value)}
                        placeholder="facebook"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">utm_medium</Label>
                      <Input
                        value={utmMedium}
                        onChange={(e) => setUtmMedium(e.target.value)}
                        placeholder="cpc"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">utm_campaign</Label>
                      <Input
                        value={utmCampaign}
                        onChange={(e) => setUtmCampaign(e.target.value)}
                        placeholder="{{campaign.name}}"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">utm_content</Label>
                      <Input
                        value={utmContent}
                        onChange={(e) => setUtmContent(e.target.value)}
                        placeholder="{{ad.name}}"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">utm_term</Label>
                      <Input
                        value={utmTerm}
                        onChange={(e) => setUtmTerm(e.target.value)}
                        placeholder="{{adset.name}}"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Metrics Summary */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Métricas Atuais
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Investido</p>
                  <p className="text-lg font-bold">{formatCurrency(node.metrics.spend)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Impressões</p>
                  <p className="text-lg font-bold">{formatNumber(node.metrics.impressions)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">CTR</p>
                  <p className="text-lg font-bold">{formatPercent(node.metrics.ctr)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Conversões</p>
                  <p className="text-lg font-bold">{formatNumber(node.metrics.conversions)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">CPC</p>
                  <p className="text-lg font-bold">{formatCurrency(node.metrics.cpc || 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">CPA</p>
                  <p className="text-lg font-bold">{formatCurrency(node.metrics.cpa || 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Cliques</p>
                  <p className="text-lg font-bold">{formatNumber(node.metrics.clicks || 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Alcance</p>
                  <p className="text-lg font-bold">{formatNumber(node.metrics.reach || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="p-6 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !hasChanges || editName.trim() === '' || mediaUrls.length === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
