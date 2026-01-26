import { useEffect, useState, useCallback } from 'react';
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
  ImageIcon, 
  Save, 
  Settings,
  AlertTriangle,
  Image,
  Film,
  Layers,
  Link2,
  ChevronDown,
  DollarSign,
  Eye,
  MousePointerClick,
  Percent,
  Target,
  Receipt,
  Coins,
  Users,
} from 'lucide-react';
import { TreeNode } from '@/hooks/useCampaignTree';
import { MediaUploader } from '@/components/campaigns/builder/MediaUploader';
import { PixelSelector } from '@/components/campaigns/builder/PixelSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSaveWithProgress } from '@/hooks/useSaveWithProgress';
import { SaveProgressModal } from './SaveProgressModal';

// CTA options
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

interface AdEditContentProps {
  node: TreeNode;
  parentNode?: TreeNode | null;
  clientId: string;
  companyId?: string;
  onSuccess?: () => Promise<void> | void;
}

export function AdEditContent({
  node,
  parentNode,
  clientId,
  companyId,
  onSuccess,
}: AdEditContentProps) {
  const saveProgress = useSaveWithProgress();
  const [hasChanges, setHasChanges] = useState(false);
  const [creativeChanged, setCreativeChanged] = useState(false);
  
  // Basic fields
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'paused'>('active');
  
  // Creative fields
  const [creativeType, setCreativeType] = useState<'IMAGE' | 'VIDEO' | 'CAROUSEL'>('IMAGE');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState<string>('');
  const [externalVideoUrl, setExternalVideoUrl] = useState<string>('');
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
  const [utmFullString, setUtmFullString] = useState('');
  const [showUtmFields, setShowUtmFields] = useState(false);
  
  // Pixel tracking
  const [pixelId, setPixelId] = useState('');
  const [parentPixelName, setParentPixelName] = useState<string | null>(null);

  // Original values for comparison
  const [originalValues, setOriginalValues] = useState<any>(null);

  // Build full UTM string from individual fields
  const buildUtmString = () => {
    const params: string[] = [];
    if (utmSource) params.push(`utm_source=${utmSource}`);
    if (utmMedium) params.push(`utm_medium=${utmMedium}`);
    if (utmCampaign) params.push(`utm_campaign=${utmCampaign}`);
    if (utmContent) params.push(`utm_content=${utmContent}`);
    if (utmTerm) params.push(`utm_term=${utmTerm}`);
    return params.join('&');
  };

  // Parse full UTM string to individual fields
  const parseUtmString = (fullString: string) => {
    const params = new URLSearchParams(fullString);
    setUtmSource(params.get('utm_source') || '');
    setUtmMedium(params.get('utm_medium') || '');
    setUtmCampaign(params.get('utm_campaign') || '');
    setUtmContent(params.get('utm_content') || '');
    setUtmTerm(params.get('utm_term') || '');
  };

  // Sync individual fields to full string
  useEffect(() => {
    const built = buildUtmString();
    if (built !== utmFullString) {
      setUtmFullString(built);
    }
  }, [utmSource, utmMedium, utmCampaign, utmContent, utmTerm]);

  // Reset form when node changes
  useEffect(() => {
    if (node && node.type === 'ad') {
      const nodeAny = node as any;
      
      setEditName(node.name);
      setEditStatus(node.status === 'active' ? 'active' : 'paused');
      
      const nodeCreativeType = nodeAny.creativeType?.toUpperCase() || 'IMAGE';
      setCreativeType(nodeCreativeType as 'IMAGE' | 'VIDEO' | 'CAROUSEL');
      
      const isVideo = nodeCreativeType === 'VIDEO';
      if (isVideo && nodeAny.videoUrl) {
        setMediaUrls([nodeAny.videoUrl]);
        setVideoThumbnailUrl(nodeAny.imageUrl || '');
        if (nodeAny.videoUrl.includes('facebook.com/') || nodeAny.videoUrl.includes('fb.com/')) {
          setExternalVideoUrl(nodeAny.videoUrl);
        } else {
          setExternalVideoUrl('');
        }
      } else if (nodeAny.imageUrl) {
        setMediaUrls([nodeAny.imageUrl]);
        setVideoThumbnailUrl('');
        setExternalVideoUrl('');
      } else if (nodeAny.creativeUrl) {
        setMediaUrls([nodeAny.creativeUrl]);
        setVideoThumbnailUrl('');
        setExternalVideoUrl('');
      } else {
        setMediaUrls([]);
        setVideoThumbnailUrl('');
        setExternalVideoUrl('');
      }
      
      setBody(nodeAny.creativeBody || '');
      setTitle(nodeAny.creativeTitle || '');
      setDescription(nodeAny.creativeDescription || '');
      setLinkUrl(nodeAny.linkUrl || '');
      setCallToAction(nodeAny.callToAction || 'LEARN_MORE');
      
      setPixelId(nodeAny.pixelId || '');
      
      if (nodeAny.linkUrl) {
        try {
          const url = new URL(nodeAny.linkUrl);
          setUtmSource(url.searchParams.get('utm_source') || '');
          setUtmMedium(url.searchParams.get('utm_medium') || '');
          setUtmCampaign(url.searchParams.get('utm_campaign') || '');
          setUtmContent(url.searchParams.get('utm_content') || '');
          setUtmTerm(url.searchParams.get('utm_term') || '');
          
          if (url.searchParams.has('utm_source') || url.searchParams.has('utm_medium')) {
            setShowUtmFields(true);
          }
        } catch {
          // Invalid URL, ignore
        }
      }
      
      const origMediaUrls = isVideo && nodeAny.videoUrl 
        ? [nodeAny.videoUrl] 
        : (nodeAny.imageUrl ? [nodeAny.imageUrl] : (nodeAny.creativeUrl ? [nodeAny.creativeUrl] : []));
      
      setOriginalValues({
        name: node.name,
        status: node.status,
        creativeType: nodeCreativeType,
        mediaUrls: origMediaUrls,
        body: nodeAny.creativeBody || '',
        title: nodeAny.creativeTitle || '',
        description: nodeAny.creativeDescription || '',
        linkUrl: nodeAny.linkUrl || '',
        callToAction: nodeAny.callToAction || 'LEARN_MORE',
      });
      
      setHasChanges(false);
      setCreativeChanged(false);
    }
  }, [node?.id]);

  // Fetch parent pixel name from meta_pixels table
  useEffect(() => {
    const fetchParentPixelName = async () => {
      if (!parentNode?.pixelId || !clientId) {
        setParentPixelName(null);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('meta_pixels')
          .select('pixel_name')
          .eq('client_id', clientId)
          .eq('pixel_id', parentNode.pixelId)
          .maybeSingle();
        
        if (!error && data) {
          setParentPixelName(data.pixel_name);
        } else {
          setParentPixelName(null);
        }
      } catch (err) {
        console.error('Error fetching pixel name:', err);
        setParentPixelName(null);
      }
    };
    
    fetchParentPixelName();
  }, [parentNode?.pixelId, clientId]);

  // Track changes
  useEffect(() => {
    if (!originalValues) return;
    
    const nameChanged = editName !== originalValues.name;
    const statusChanged = editStatus !== (originalValues.status === 'active' ? 'active' : 'paused');
    
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

    const platform = node.platform as 'meta' | 'google';
    const facebookId = (node as any).facebookId;

    const metaAction = async () => {
      let finalUrl = linkUrl;
      if (linkUrl) {
        const utmParams: string[] = [];
        if (utmSource) utmParams.push(`utm_source=${encodeURIComponent(utmSource)}`);
        if (utmMedium) utmParams.push(`utm_medium=${encodeURIComponent(utmMedium)}`);
        if (utmCampaign) utmParams.push(`utm_campaign=${encodeURIComponent(utmCampaign)}`);
        if (utmContent) utmParams.push(`utm_content=${encodeURIComponent(utmContent)}`);
        if (utmTerm) utmParams.push(`utm_term=${encodeURIComponent(utmTerm)}`);
        
        if (utmParams.length > 0) {
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

      if (platform === 'meta' && facebookId) {
        const pixelChanged = pixelId !== (node as any).pixelId;
        
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
              pixel_id: pixelChanged ? pixelId : undefined,
            },
          },
        });

        if (error) throw error;

        if (!data?.success) {
          throw new Error(data?.error || 'Erro ao atualizar anúncio');
        }
      } else {
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
            pixel_id: pixelId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', node.id);

        if (updateError) throw updateError;
      }
    };

    const success = await saveProgress.execute(metaAction, async () => {
      setHasChanges(false);
      setCreativeChanged(false);
      if (onSuccess) {
        await onSuccess();
      }
    });

    if (success) {
      toast.success('Anúncio atualizado com sucesso!');
    }
  }, [clientId, node, editName, editStatus, creativeType, mediaUrls, body, title, description, linkUrl, callToAction, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, pixelId, originalValues, creativeChanged, onSuccess, saveProgress]);

  if (!node || node.type !== 'ad') return null;

  const isGoogle = node.platform === 'google';
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Anúncio</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{node.platform.toUpperCase()}</Badge>
            </div>
          </div>
          {/* Status Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {editStatus === 'active' ? 'Ativo' : 'Pausado'}
            </span>
            <Switch
              checked={editStatus === 'active'}
              onCheckedChange={(checked) => setEditStatus(checked ? 'active' : 'paused')}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Alerts */}
          {isGoogle && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Google Ads: alterações serão salvas apenas localmente.
              </AlertDescription>
            </Alert>
          )}

          {/* Metrics Cards at Top */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <DollarSign className="w-3 h-3" />
                <span className="text-xs">Investido</span>
              </div>
              <p className="text-sm font-bold">{formatCurrency(node.metrics.spend)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Eye className="w-3 h-3" />
                <span className="text-xs">Impressões</span>
              </div>
              <p className="text-sm font-bold">{formatNumber(node.metrics.impressions)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <MousePointerClick className="w-3 h-3" />
                <span className="text-xs">Cliques</span>
              </div>
              <p className="text-sm font-bold">{formatNumber(node.metrics.clicks || 0)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Percent className="w-3 h-3" />
                <span className="text-xs">CTR</span>
              </div>
              <p className="text-sm font-bold">{formatPercent(node.metrics.ctr)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Target className="w-3 h-3" />
                <span className="text-xs">Conversões</span>
              </div>
              <p className="text-sm font-bold">{formatNumber(node.metrics.conversions)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Receipt className="w-3 h-3" />
                <span className="text-xs">CPA</span>
              </div>
              <p className="text-sm font-bold">{formatCurrency(node.metrics.cpa || 0)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Coins className="w-3 h-3" />
                <span className="text-xs">CPC</span>
              </div>
              <p className="text-sm font-bold">{formatCurrency(node.metrics.cpc || 0)}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 flex flex-col items-center">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Users className="w-3 h-3" />
                <span className="text-xs">Alcance</span>
              </div>
              <p className="text-sm font-bold">{formatNumber(node.metrics.reach || 0)}</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Configuration & Texts */}
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configurações
                </h4>
                
                {/* Name Field */}
                <div className="space-y-4">
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
                </div>
              </div>

              {/* Texts Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-4">Textos do Anúncio</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Texto Principal *</Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Texto principal do anúncio que aparece acima da mídia"
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">{body.length}/500 caracteres</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Título do anúncio (headline)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descrição complementar do anúncio"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">{description.length}/300 caracteres</p>
                  </div>
                </div>
              </div>

              {/* Destination Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Destino
                </h4>
                <div className="space-y-4">
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

                  {/* Pixel Tracking */}
                  <div className="space-y-3">
                    {parentNode?.pixelId && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Pixel do Conjunto (herdado)</Label>
                        <Input
                          value={parentPixelName 
                            ? `${parentPixelName} (${parentNode.pixelId})` 
                            : parentNode.pixelId}
                          disabled
                          className="bg-muted/50 text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground">
                          Configurado no Conjunto de Anúncios
                        </p>
                      </div>
                    )}
                    
                    <PixelSelector
                      clientId={clientId}
                      companyId={companyId || ''}
                      value={pixelId}
                      onChange={setPixelId}
                      label={parentNode?.pixelId ? "Pixel do Anúncio (sobrescreve)" : "Pixel de Conversão"}
                    />
                    {parentNode?.pixelId && pixelId && (
                      <p className="text-xs text-warning">
                        Este pixel sobrescreve o pixel herdado do Conjunto
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Creative/Media */}
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Criativo
                </h4>

                <div className="space-y-4">
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

                  <div className="space-y-2">
                    <Label>Mídia *</Label>
                    <MediaUploader
                      mediaUrls={mediaUrls}
                      onChange={setMediaUrls}
                      type={creativeType}
                      maxFiles={creativeType === 'CAROUSEL' ? 10 : 1}
                      clientId={clientId}
                      companyId={companyId}
                      creativeContext={{ title, body, description }}
                      thumbnailUrl={creativeType === 'VIDEO' ? videoThumbnailUrl : undefined}
                      externalVideoUrl={creativeType === 'VIDEO' ? externalVideoUrl : undefined}
                    />
                  </div>
                </div>
              </div>

              {/* UTM Parameters */}
              <Collapsible open={showUtmFields} onOpenChange={setShowUtmFields}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 h-8 text-xs">
                    <ChevronDown className={`h-3 w-3 transition-transform ${showUtmFields ? 'rotate-180' : ''}`} />
                    Parâmetros UTM
                    {utmFullString && <Badge variant="secondary" className="ml-2 text-xs">Configurado</Badge>}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">String Completa (como no Meta)</Label>
                    <Input
                      value={utmFullString}
                      onChange={(e) => {
                        setUtmFullString(e.target.value);
                        parseUtmString(e.target.value);
                      }}
                      placeholder="utm_source={{site_source_name}}&utm_medium={{ad.name}}&utm_campaign={{campaign.name}}"
                      className="h-9 text-sm font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Cole aqui a string completa de parâmetros ou edite os campos individuais abaixo
                    </p>
                  </div>
                  
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
          </div>
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="p-4 flex justify-end gap-2">
        <Button 
          onClick={handleSave} 
          disabled={saveProgress.isOpen || !hasChanges || editName.trim() === '' || mediaUrls.length === 0}
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      {/* Save Progress Modal */}
      <SaveProgressModal
        isOpen={saveProgress.isOpen}
        steps={saveProgress.steps}
        error={saveProgress.error}
        onClose={saveProgress.close}
        onRetry={handleSave}
      />
    </div>
  );
}
