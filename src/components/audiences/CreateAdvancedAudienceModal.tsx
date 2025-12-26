import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Globe, Facebook, Instagram, Video } from "lucide-react";

export interface PixelOption {
  id: string;
  pixel_id: string;
  pixel_name: string;
}

export interface PageOption {
  id: string;
  page_id: string;
  name: string;
}

export interface InstagramOption {
  id: string;
  instagram_id: string;
  username: string;
}

interface CreateAdvancedAudienceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateWebsiteAudience: (params: {
    name: string;
    pixelId: string;
    retentionDays: number;
    ruleType: 'all_visitors' | 'url_contains' | 'url_equals' | 'event';
    urlValue?: string;
    eventName?: string;
  }) => Promise<void>;
  onCreateEngagementAudience: (params: {
    name: string;
    engagementType: 'page' | 'instagram' | 'video';
    sourceId: string;
    retentionDays: number;
    engagementEvent: string;
    videoPercentile?: number;
  }) => Promise<void>;
  loading: boolean;
  pixels: PixelOption[];
  pages: PageOption[];
  instagramAccounts: InstagramOption[];
}

const WEBSITE_EVENTS = [
  { value: 'PageView', label: 'PageView - Visualização de página' },
  { value: 'ViewContent', label: 'ViewContent - Visualizou conteúdo' },
  { value: 'AddToCart', label: 'AddToCart - Adicionou ao carrinho' },
  { value: 'InitiateCheckout', label: 'InitiateCheckout - Iniciou checkout' },
  { value: 'Purchase', label: 'Purchase - Compra' },
  { value: 'Lead', label: 'Lead - Lead capturado' },
  { value: 'CompleteRegistration', label: 'CompleteRegistration - Registro completo' },
  { value: 'Contact', label: 'Contact - Contato' },
  { value: 'Search', label: 'Search - Pesquisa' },
];

const PAGE_EVENTS = [
  { value: 'page_engaged', label: 'Qualquer engajamento com a página' },
  { value: 'page_liked', label: 'Curtiu a página' },
  { value: 'page_visited', label: 'Visitou a página' },
  { value: 'page_messaged', label: 'Enviou mensagem para a página' },
  { value: 'page_cta_clicked', label: 'Clicou no CTA da página' },
  { value: 'page_saved_post', label: 'Salvou post da página' },
];

const INSTAGRAM_EVENTS = [
  { value: 'ig_business_profile_all', label: 'Qualquer interação com o perfil' },
  { value: 'ig_business_profile_engaged', label: 'Engajou com conteúdo' },
  { value: 'ig_business_profile_any', label: 'Visitou perfil ou interagiu' },
];

const VIDEO_PERCENTILES = [
  { value: 25, label: '25% do vídeo' },
  { value: 50, label: '50% do vídeo' },
  { value: 75, label: '75% do vídeo' },
  { value: 95, label: '95% do vídeo (ThruPlay)' },
];

export function CreateAdvancedAudienceModal({
  open,
  onOpenChange,
  onCreateWebsiteAudience,
  onCreateEngagementAudience,
  loading,
  pixels,
  pages,
  instagramAccounts,
}: CreateAdvancedAudienceModalProps) {
  const [activeTab, setActiveTab] = useState("website");
  
  // Website state
  const [websiteName, setWebsiteName] = useState("");
  const [selectedPixel, setSelectedPixel] = useState("");
  const [websiteRetention, setWebsiteRetention] = useState([30]);
  const [ruleType, setRuleType] = useState<'all_visitors' | 'url_contains' | 'url_equals' | 'event'>('all_visitors');
  const [urlValue, setUrlValue] = useState("");
  const [eventName, setEventName] = useState("");
  
  // Facebook Page state
  const [pageName, setPageName] = useState("");
  const [selectedPage, setSelectedPage] = useState("");
  const [pageRetention, setPageRetention] = useState([30]);
  const [pageEvent, setPageEvent] = useState("page_engaged");
  
  // Instagram state
  const [igName, setIgName] = useState("");
  const [selectedInstagram, setSelectedInstagram] = useState("");
  const [igRetention, setIgRetention] = useState([30]);
  const [igEvent, setIgEvent] = useState("ig_business_profile_all");
  
  // Video state
  const [videoName, setVideoName] = useState("");
  const [selectedVideoPage, setSelectedVideoPage] = useState("");
  const [videoRetention, setVideoRetention] = useState([30]);
  const [videoPercentile, setVideoPercentile] = useState(50);

  const resetForm = () => {
    setWebsiteName("");
    setSelectedPixel("");
    setWebsiteRetention([30]);
    setRuleType('all_visitors');
    setUrlValue("");
    setEventName("");
    setPageName("");
    setSelectedPage("");
    setPageRetention([30]);
    setPageEvent("page_engaged");
    setIgName("");
    setSelectedInstagram("");
    setIgRetention([30]);
    setIgEvent("ig_business_profile_all");
    setVideoName("");
    setSelectedVideoPage("");
    setVideoRetention([30]);
    setVideoPercentile(50);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (activeTab === "website") {
        if (!websiteName.trim() || !selectedPixel) return;
        await onCreateWebsiteAudience({
          name: websiteName.trim(),
          pixelId: selectedPixel,
          retentionDays: websiteRetention[0],
          ruleType,
          urlValue: urlValue.trim() || undefined,
          eventName: eventName || undefined,
        });
      } else if (activeTab === "page") {
        if (!pageName.trim() || !selectedPage) return;
        await onCreateEngagementAudience({
          name: pageName.trim(),
          engagementType: 'page',
          sourceId: selectedPage,
          retentionDays: pageRetention[0],
          engagementEvent: pageEvent,
        });
      } else if (activeTab === "instagram") {
        if (!igName.trim() || !selectedInstagram) return;
        await onCreateEngagementAudience({
          name: igName.trim(),
          engagementType: 'instagram',
          sourceId: selectedInstagram,
          retentionDays: igRetention[0],
          engagementEvent: igEvent,
        });
      } else if (activeTab === "video") {
        if (!videoName.trim() || !selectedVideoPage) return;
        await onCreateEngagementAudience({
          name: videoName.trim(),
          engagementType: 'video',
          sourceId: selectedVideoPage,
          retentionDays: videoRetention[0],
          engagementEvent: 'video_watched',
          videoPercentile,
        });
      }
      resetForm();
    } catch (error) {
      console.error('Error creating advanced audience:', error);
    }
  };

  const isFormValid = () => {
    if (activeTab === "website") {
      if (!websiteName.trim() || !selectedPixel) return false;
      if ((ruleType === 'url_contains' || ruleType === 'url_equals') && !urlValue.trim()) return false;
      if (ruleType === 'event' && !eventName) return false;
      return true;
    }
    if (activeTab === "page") {
      return pageName.trim() && selectedPage;
    }
    if (activeTab === "instagram") {
      return igName.trim() && selectedInstagram;
    }
    if (activeTab === "video") {
      return videoName.trim() && selectedVideoPage;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Público Avançado</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="website" className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Website</span>
              </TabsTrigger>
              <TabsTrigger value="page" className="flex items-center gap-1.5">
                <Facebook className="h-4 w-4" />
                <span className="hidden sm:inline">Página</span>
              </TabsTrigger>
              <TabsTrigger value="instagram" className="flex items-center gap-1.5">
                <Instagram className="h-4 w-4" />
                <span className="hidden sm:inline">Instagram</span>
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center gap-1.5">
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Vídeo</span>
              </TabsTrigger>
            </TabsList>

            {/* Website Tab */}
            <TabsContent value="website" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="website-name">Nome do Público *</Label>
                <Input
                  id="website-name"
                  value={websiteName}
                  onChange={(e) => setWebsiteName(e.target.value)}
                  placeholder="Ex: Visitantes Site 30 dias"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Pixel do Meta *</Label>
                <Select value={selectedPixel} onValueChange={setSelectedPixel} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um Pixel" />
                  </SelectTrigger>
                  <SelectContent>
                    {pixels.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhum Pixel disponível</SelectItem>
                    ) : (
                      pixels.map((pixel) => (
                        <SelectItem key={pixel.id} value={pixel.pixel_id}>
                          {pixel.pixel_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Regra</Label>
                <Select value={ruleType} onValueChange={(v) => setRuleType(v as any)} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_visitors">Todos os visitantes</SelectItem>
                    <SelectItem value="url_contains">URL contém</SelectItem>
                    <SelectItem value="url_equals">URL igual a</SelectItem>
                    <SelectItem value="event">Evento específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(ruleType === 'url_contains' || ruleType === 'url_equals') && (
                <div className="space-y-2">
                  <Label htmlFor="url-value">
                    {ruleType === 'url_contains' ? 'URL contém' : 'URL igual a'} *
                  </Label>
                  <Input
                    id="url-value"
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    placeholder={ruleType === 'url_contains' ? "Ex: /produtos" : "Ex: https://site.com/checkout"}
                    disabled={loading}
                  />
                </div>
              )}

              {ruleType === 'event' && (
                <div className="space-y-2">
                  <Label>Evento do Pixel *</Label>
                  <Select value={eventName} onValueChange={setEventName} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEBSITE_EVENTS.map((event) => (
                        <SelectItem key={event.value} value={event.value}>
                          {event.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <Label>Período de retenção: {websiteRetention[0]} dias</Label>
                <Slider
                  value={websiteRetention}
                  onValueChange={setWebsiteRetention}
                  min={1}
                  max={180}
                  step={1}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Pessoas que visitaram nos últimos {websiteRetention[0]} dias
                </p>
              </div>

              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">Público de Website</p>
                <p>
                  Captura visitantes do seu site baseado no Meta Pixel instalado.
                  O público será populado automaticamente com dados históricos.
                </p>
              </div>
            </TabsContent>

            {/* Facebook Page Tab */}
            <TabsContent value="page" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="page-name">Nome do Público *</Label>
                <Input
                  id="page-name"
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  placeholder="Ex: Engajados Página Facebook"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Página do Facebook *</Label>
                <Select value={selectedPage} onValueChange={setSelectedPage} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma página" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhuma página vinculada</SelectItem>
                    ) : (
                      pages.map((page) => (
                        <SelectItem key={page.id} value={page.page_id}>
                          {page.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Engajamento</Label>
                <Select value={pageEvent} onValueChange={setPageEvent} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_EVENTS.map((event) => (
                      <SelectItem key={event.value} value={event.value}>
                        {event.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Período de retenção: {pageRetention[0]} dias</Label>
                <Slider
                  value={pageRetention}
                  onValueChange={setPageRetention}
                  min={1}
                  max={365}
                  step={1}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Pessoas que interagiram nos últimos {pageRetention[0]} dias
                </p>
              </div>

              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">Público de Página Facebook</p>
                <p>
                  Captura pessoas que interagiram com sua página do Facebook.
                  Inclui curtidas, comentários, compartilhamentos e mensagens.
                </p>
              </div>
            </TabsContent>

            {/* Instagram Tab */}
            <TabsContent value="instagram" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="ig-name">Nome do Público *</Label>
                <Input
                  id="ig-name"
                  value={igName}
                  onChange={(e) => setIgName(e.target.value)}
                  placeholder="Ex: Engajados Instagram"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Conta do Instagram *</Label>
                <Select value={selectedInstagram} onValueChange={setSelectedInstagram} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {instagramAccounts.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhuma conta vinculada</SelectItem>
                    ) : (
                      instagramAccounts.map((ig) => (
                        <SelectItem key={ig.id} value={ig.instagram_id}>
                          @{ig.username}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Interação</Label>
                <Select value={igEvent} onValueChange={setIgEvent} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTAGRAM_EVENTS.map((event) => (
                      <SelectItem key={event.value} value={event.value}>
                        {event.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Período de retenção: {igRetention[0]} dias</Label>
                <Slider
                  value={igRetention}
                  onValueChange={setIgRetention}
                  min={1}
                  max={365}
                  step={1}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Pessoas que interagiram nos últimos {igRetention[0]} dias
                </p>
              </div>

              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">Público de Instagram</p>
                <p>
                  Captura pessoas que visitaram ou interagiram com seu perfil do Instagram Business.
                </p>
              </div>
            </TabsContent>

            {/* Video Tab */}
            <TabsContent value="video" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="video-name">Nome do Público *</Label>
                <Input
                  id="video-name"
                  value={videoName}
                  onChange={(e) => setVideoName(e.target.value)}
                  placeholder="Ex: Assistiram 75% dos vídeos"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Página do Facebook (origem dos vídeos) *</Label>
                <Select value={selectedVideoPage} onValueChange={setSelectedVideoPage} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma página" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhuma página vinculada</SelectItem>
                    ) : (
                      pages.map((page) => (
                        <SelectItem key={page.id} value={page.page_id}>
                          {page.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Percentual Mínimo Assistido</Label>
                <Select 
                  value={videoPercentile.toString()} 
                  onValueChange={(v) => setVideoPercentile(parseInt(v))} 
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_PERCENTILES.map((p) => (
                      <SelectItem key={p.value} value={p.value.toString()}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Período de retenção: {videoRetention[0]} dias</Label>
                <Slider
                  value={videoRetention}
                  onValueChange={setVideoRetention}
                  min={1}
                  max={365}
                  step={1}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Pessoas que assistiram nos últimos {videoRetention[0]} dias
                </p>
              </div>

              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">Público de Vídeo</p>
                <p>
                  Captura pessoas que assistiram um percentual mínimo dos vídeos da sua página.
                  Ideal para remarketing de conteúdo.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !isFormValid()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Público
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}