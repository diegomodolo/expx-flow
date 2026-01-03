import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMetaPixels } from "@/hooks/useMetaPixels";
import { 
  Loader2, 
  Upload, 
  ChevronDown, 
  ChevronRight, 
  AlertCircle,
  Link,
  Type,
  MessageSquare,
  FileText,
  MousePointer,
  Activity,
  Settings2,
  Instagram,
  Facebook,
  Eye,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

const CTA_OPTIONS = [
  { value: "LEARN_MORE", label: "Saiba Mais" },
  { value: "SHOP_NOW", label: "Comprar Agora" },
  { value: "SIGN_UP", label: "Cadastre-se" },
  { value: "DOWNLOAD", label: "Baixar" },
  { value: "CONTACT_US", label: "Fale Conosco" },
  { value: "GET_QUOTE", label: "Solicitar Orçamento" },
  { value: "BOOK_NOW", label: "Reservar Agora" },
  { value: "WATCH_MORE", label: "Assistir Mais" },
  { value: "APPLY_NOW", label: "Inscreva-se" },
  { value: "GET_OFFER", label: "Ver Oferta" },
  { value: "SEND_MESSAGE", label: "Enviar Mensagem" },
  { value: "SEND_WHATSAPP_MESSAGE", label: "Enviar WhatsApp" },
  { value: "CALL_NOW", label: "Ligar Agora" },
  { value: "NO_BUTTON", label: "Sem Botão" },
];

interface Campaign {
  id: string;
  name: string;
  facebook_id: string | null;
}

interface AdSet {
  id: string;
  name: string;
  facebook_id: string;
  campaign_id: string;
}

interface SelectedDestination {
  campaignId: string;
  campaignName: string;
  adSetIds: string[];
}

interface AdConfig {
  destination_url: string;
  primary_text: string;
  headline: string;
  description: string;
  cta: string;
  pixel_id: string;
  url_params: string;
}

interface ApprovalDestinationDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adId: string;
  clientId: string;
  companyId: string;
  defaultCampaignId?: string | null;
  defaultAdSetId?: string | null;
  onApprove: (destinations: SelectedDestination[], adConfig: AdConfig) => Promise<void>;
  adContent?: {
    headline?: string;
    primary_text?: string;
    description?: string;
    image_url?: string;
  };
}

export function ApprovalDestinationDialogV2({
  open,
  onOpenChange,
  adId,
  clientId,
  companyId,
  defaultCampaignId,
  defaultAdSetId,
  onApprove,
  adContent,
}: ApprovalDestinationDialogV2Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSetsByCampaign, setAdSetsByCampaign] = useState<Record<string, AdSet[]>>({});
  const [selectedDestinations, setSelectedDestinations] = useState<SelectedDestination[]>([]);
  const [expandedCampaigns, setExpandedCampaigns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<'facebook' | 'instagram'>('facebook');
  
  // Load pixels for selection
  const { pixels, loading: loadingPixels, fetchPixels, syncPixels, syncing } = useMetaPixels(clientId, companyId);

  // Ad configuration state
  const [adConfig, setAdConfig] = useState<AdConfig>({
    destination_url: "",
    primary_text: adContent?.primary_text || "",
    headline: adContent?.headline || "",
    description: adContent?.description || "",
    cta: "LEARN_MORE",
    pixel_id: "",
    url_params: "",
  });

  useEffect(() => {
    if (open && clientId) {
      loadData();
      loadDefaults();
      fetchPixels();
    }
  }, [open, clientId]);

  useEffect(() => {
    // Update ad config when adContent changes
    if (adContent) {
      setAdConfig(prev => ({
        ...prev,
        headline: adContent.headline || prev.headline,
        primary_text: adContent.primary_text || prev.primary_text,
        description: adContent.description || prev.description,
      }));
    }
  }, [adContent]);

  useEffect(() => {
    // Set default selections when data is loaded
    if (defaultCampaignId && campaigns.length > 0) {
      const campaign = campaigns.find(c => c.id === defaultCampaignId);
      if (campaign) {
        const adSets = adSetsByCampaign[defaultCampaignId] || [];
        const defaultAdSets = defaultAdSetId 
          ? adSets.filter(a => a.id === defaultAdSetId).map(a => a.id)
          : [];
        
        setSelectedDestinations([{
          campaignId: defaultCampaignId,
          campaignName: campaign.name,
          adSetIds: defaultAdSets,
        }]);
        setExpandedCampaigns([defaultCampaignId]);
      }
    }
  }, [defaultCampaignId, defaultAdSetId, campaigns, adSetsByCampaign]);

  const loadDefaults = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_generation_schedules')
        .select('default_destination_url, default_primary_text, default_headline, default_description, default_cta, default_pixel_id, default_url_params')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAdConfig(prev => ({
          destination_url: (data as any).default_destination_url || prev.destination_url,
          primary_text: prev.primary_text || (data as any).default_primary_text || "",
          headline: prev.headline || (data as any).default_headline || "",
          description: prev.description || (data as any).default_description || "",
          cta: (data as any).default_cta || prev.cta,
          pixel_id: (data as any).default_pixel_id || prev.pixel_id,
          url_params: (data as any).default_url_params || prev.url_params,
        }));
      }
    } catch (error) {
      console.error('Error loading defaults:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name, facebook_id')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('name');

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Load all ad sets for all campaigns
      const { data: adSetsData, error: adSetsError } = await supabase
        .from('ad_sets')
        .select('id, name, facebook_id, campaign_id')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('name');

      if (adSetsError) throw adSetsError;

      // Group ad sets by campaign
      const grouped: Record<string, AdSet[]> = {};
      (adSetsData || []).forEach(adSet => {
        if (!grouped[adSet.campaign_id]) {
          grouped[adSet.campaign_id] = [];
        }
        grouped[adSet.campaign_id].push(adSet);
      });
      setAdSetsByCampaign(grouped);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaign = (campaignId: string, campaignName: string) => {
    setSelectedDestinations(prev => {
      const existing = prev.find(d => d.campaignId === campaignId);
      if (existing) {
        return prev.filter(d => d.campaignId !== campaignId);
      }
      return [...prev, { campaignId, campaignName, adSetIds: [] }];
    });
  };

  const toggleAdSet = (campaignId: string, campaignName: string, adSetId: string) => {
    setSelectedDestinations(prev => {
      const existingIdx = prev.findIndex(d => d.campaignId === campaignId);
      
      if (existingIdx === -1) {
        return [...prev, { campaignId, campaignName, adSetIds: [adSetId] }];
      }
      
      const existing = prev[existingIdx];
      const hasAdSet = existing.adSetIds.includes(adSetId);
      
      const newAdSetIds = hasAdSet
        ? existing.adSetIds.filter(id => id !== adSetId)
        : [...existing.adSetIds, adSetId];
      
      const updated = [...prev];
      updated[existingIdx] = { ...existing, adSetIds: newAdSetIds };
      return updated;
    });
  };

  const toggleExpandCampaign = (campaignId: string) => {
    setExpandedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const isCampaignSelected = (campaignId: string) => {
    return selectedDestinations.some(d => d.campaignId === campaignId);
  };

  const isAdSetSelected = (campaignId: string, adSetId: string) => {
    const dest = selectedDestinations.find(d => d.campaignId === campaignId);
    return dest?.adSetIds.includes(adSetId) || false;
  };

  const getSelectedCount = () => {
    return selectedDestinations.reduce((acc, d) => acc + Math.max(d.adSetIds.length, 1), 0);
  };

  const handlePublish = async () => {
    const destinationsWithAdSets = selectedDestinations.filter(d => d.adSetIds.length > 0);
    
    if (destinationsWithAdSets.length === 0) {
      toast.error('Selecione pelo menos uma campanha e um conjunto de anúncios');
      return;
    }

    if (!adConfig.destination_url) {
      toast.error('Informe a URL de destino');
      return;
    }

    setPublishing(true);
    try {
      await onApprove(destinationsWithAdSets, adConfig);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error publishing:', error);
      toast.error('Erro ao publicar: ' + error.message);
    } finally {
      setPublishing(false);
    }
  };

  const getCTALabel = (value: string) => {
    return CTA_OPTIONS.find(o => o.value === value)?.label || value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Aprovar e Publicar Anúncio
          </DialogTitle>
          <DialogDescription>
            Configure o anúncio e selecione onde será publicado no Facebook/Instagram
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Column - Configuration */}
          <div className="w-1/2 border-r flex flex-col">
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-6">
                {/* Destination Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Destino da Publicação
                  </Label>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : campaigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center bg-muted/50 rounded-lg">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma campanha ativa encontrada.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {campaigns.map(campaign => {
                        const adSets = adSetsByCampaign[campaign.id] || [];
                        const isExpanded = expandedCampaigns.includes(campaign.id);
                        const isSelected = isCampaignSelected(campaign.id);
                        const selectedAdSetCount = selectedDestinations.find(d => d.campaignId === campaign.id)?.adSetIds.length || 0;

                        return (
                          <div 
                            key={campaign.id} 
                            className={cn(
                              "border rounded-lg overflow-hidden transition-colors",
                              isSelected && "border-primary bg-primary/5"
                            )}
                          >
                            <div className="flex items-center gap-2 p-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleCampaign(campaign.id, campaign.name)}
                              />
                              <Collapsible open={isExpanded} onOpenChange={() => toggleExpandCampaign(campaign.id)} className="flex-1">
                                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="text-sm font-medium flex-1 truncate">{campaign.name}</span>
                                  {selectedAdSetCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {selectedAdSetCount}
                                    </Badge>
                                  )}
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  {adSets.length > 0 ? (
                                    <div className="mt-2 ml-6 space-y-1">
                                      {adSets.map(adSet => (
                                        <div 
                                          key={adSet.id} 
                                          className={cn(
                                            "flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer",
                                            isAdSetSelected(campaign.id, adSet.id) && "bg-primary/10"
                                          )}
                                          onClick={() => toggleAdSet(campaign.id, campaign.name, adSet.id)}
                                        >
                                          <Checkbox
                                            checked={isAdSetSelected(campaign.id, adSet.id)}
                                            onCheckedChange={() => toggleAdSet(campaign.id, campaign.name, adSet.id)}
                                          />
                                          <span className="text-xs">{adSet.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="mt-2 ml-6 text-xs text-muted-foreground italic">
                                      Sem conjuntos
                                    </p>
                                  )}
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Ad Configuration */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Configuração do Anúncio
                  </Label>

                  <div className="space-y-2">
                    <Label htmlFor="destination_url" className="flex items-center gap-2 text-sm">
                      <Link className="h-3.5 w-3.5" />
                      URL de Destino *
                    </Label>
                    <Input
                      id="destination_url"
                      placeholder="https://seusite.com/pagina"
                      value={adConfig.destination_url}
                      onChange={(e) => setAdConfig({ ...adConfig, destination_url: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primary_text" className="flex items-center gap-2 text-sm">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Texto Principal
                    </Label>
                    <Textarea
                      id="primary_text"
                      placeholder="Texto principal do anúncio..."
                      rows={2}
                      value={adConfig.primary_text}
                      onChange={(e) => setAdConfig({ ...adConfig, primary_text: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="headline" className="flex items-center gap-2 text-sm">
                        <Type className="h-3.5 w-3.5" />
                        Título
                      </Label>
                      <Input
                        id="headline"
                        placeholder="Título do anúncio"
                        value={adConfig.headline}
                        onChange={(e) => setAdConfig({ ...adConfig, headline: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cta" className="flex items-center gap-2 text-sm">
                        <MousePointer className="h-3.5 w-3.5" />
                        Botão CTA
                      </Label>
                      <Select
                        value={adConfig.cta}
                        onValueChange={(value) => setAdConfig({ ...adConfig, cta: value })}
                      >
                        <SelectTrigger id="cta">
                          <SelectValue placeholder="Selecione" />
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5" />
                      Descrição
                    </Label>
                    <Input
                      id="description"
                      placeholder="Descrição do anúncio"
                      value={adConfig.description}
                      onChange={(e) => setAdConfig({ ...adConfig, description: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pixel_id" className="flex items-center gap-2 text-sm">
                        <Activity className="h-3.5 w-3.5" />
                        Pixel
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={adConfig.pixel_id || "none"}
                          onValueChange={(value) => setAdConfig({ ...adConfig, pixel_id: value === "none" ? "" : value })}
                        >
                          <SelectTrigger id="pixel_id" className="flex-1">
                            <SelectValue placeholder="Selecione um pixel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {pixels.map((pixel) => (
                              <SelectItem key={pixel.id} value={pixel.pixel_id}>
                                {pixel.pixel_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => syncPixels()}
                          disabled={syncing}
                          title="Sincronizar pixels"
                        >
                          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="url_params" className="flex items-center gap-2 text-sm">
                        <Settings2 className="h-3.5 w-3.5" />
                        Parâmetros URL
                      </Label>
                      <Input
                        id="url_params"
                        placeholder="utm_source=meta..."
                        value={adConfig.url_params}
                        onChange={(e) => setAdConfig({ ...adConfig, url_params: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Column - Preview */}
          <div className="w-1/2 flex flex-col bg-muted/30">
            <div className="px-6 py-3 border-b flex items-center justify-between">
              <Label className="text-sm font-medium">Preview do Anúncio</Label>
              <div className="flex items-center gap-1 bg-background rounded-lg p-1">
                <Button
                  variant={previewPlatform === 'facebook' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setPreviewPlatform('facebook')}
                >
                  <Facebook className="h-4 w-4 mr-1" />
                  Facebook
                </Button>
                <Button
                  variant={previewPlatform === 'instagram' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setPreviewPlatform('instagram')}
                >
                  <Instagram className="h-4 w-4 mr-1" />
                  Instagram
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="flex justify-center">
                {previewPlatform === 'facebook' ? (
                  <FacebookAdPreview 
                    imageUrl={adContent?.image_url}
                    primaryText={adConfig.primary_text}
                    headline={adConfig.headline}
                    description={adConfig.description}
                    cta={getCTALabel(adConfig.cta)}
                    destinationUrl={adConfig.destination_url}
                  />
                ) : (
                  <InstagramAdPreview 
                    imageUrl={adContent?.image_url}
                    primaryText={adConfig.primary_text}
                    headline={adConfig.headline}
                    cta={getCTALabel(adConfig.cta)}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {getSelectedCount() > 0 ? (
                <span>
                  Publicar em <strong>{getSelectedCount()}</strong> destino{getSelectedCount() !== 1 ? 's' : ''}
                </span>
              ) : (
                <span>Selecione os destinos de publicação</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handlePublish} 
                disabled={publishing || selectedDestinations.filter(d => d.adSetIds.length > 0).length === 0 || !adConfig.destination_url}
                className="bg-green-600 hover:bg-green-700"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Aprovar e Publicar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Facebook Ad Preview Component
function FacebookAdPreview({ 
  imageUrl, 
  primaryText, 
  headline, 
  description, 
  cta,
  destinationUrl 
}: {
  imageUrl?: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  destinationUrl: string;
}) {
  const domain = destinationUrl ? new URL(destinationUrl.startsWith('http') ? destinationUrl : `https://${destinationUrl}`).hostname.replace('www.', '') : 'seusite.com';
  
  return (
    <div className="w-[320px] bg-white rounded-lg shadow-md overflow-hidden text-black">
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <div className="w-10 h-10 bg-gray-300 rounded-full" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Sua Página</p>
          <p className="text-xs text-gray-500">Patrocinado · 🌐</p>
        </div>
      </div>
      
      {/* Primary Text */}
      {primaryText && (
        <div className="px-3 pb-2">
          <p className="text-sm whitespace-pre-wrap line-clamp-3">{primaryText}</p>
        </div>
      )}
      
      {/* Image */}
      <div className="aspect-square bg-gray-200 relative">
        {imageUrl ? (
          <img src={imageUrl} alt="Ad preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            Sem imagem
          </div>
        )}
      </div>
      
      {/* Link Info */}
      <div className="p-3 border-t bg-gray-50">
        <p className="text-xs text-gray-500 uppercase">{domain}</p>
        <p className="font-semibold text-sm line-clamp-1">{headline || "Título do anúncio"}</p>
        {description && <p className="text-xs text-gray-500 line-clamp-1">{description}</p>}
      </div>
      
      {/* CTA Button */}
      {cta && cta !== 'Sem Botão' && (
        <div className="px-3 pb-3">
          <button className="w-full bg-gray-100 text-gray-700 text-sm font-semibold py-2 px-4 rounded">
            {cta}
          </button>
        </div>
      )}
    </div>
  );
}

// Instagram Ad Preview Component
function InstagramAdPreview({ 
  imageUrl, 
  primaryText, 
  headline,
  cta 
}: {
  imageUrl?: string;
  primaryText: string;
  headline: string;
  cta: string;
}) {
  return (
    <div className="w-[320px] bg-white rounded-lg shadow-md overflow-hidden text-black">
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
        <div className="flex-1">
          <p className="text-sm font-semibold">suapagina</p>
          <p className="text-xs text-gray-500">Patrocinado</p>
        </div>
      </div>
      
      {/* Image */}
      <div className="aspect-square bg-gray-200 relative">
        {imageUrl ? (
          <img src={imageUrl} alt="Ad preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            Sem imagem
          </div>
        )}
      </div>
      
      {/* CTA Button */}
      {cta && cta !== 'Sem Botão' && (
        <div className="p-3 border-t">
          <button className="w-full bg-blue-500 text-white text-sm font-semibold py-2 px-4 rounded">
            {cta}
          </button>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex items-center gap-4 px-3 py-2">
        <span className="text-xl">♡</span>
        <span className="text-xl">💬</span>
        <span className="text-xl">✈</span>
      </div>
      
      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-sm">
          <span className="font-semibold">suapagina</span>{" "}
          <span className="whitespace-pre-wrap line-clamp-2">{primaryText || headline || "Descrição do anúncio"}</span>
        </p>
      </div>
    </div>
  );
}
