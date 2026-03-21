import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CreativeData } from "@/hooks/useCampaignBuilder";
import { MediaUploader } from "./MediaUploader";
import { FeedPreview } from "./FeedPreview";
import {
  ImageIcon,
  Settings,
  Image,
  Film,
  Layers,
  Link2,
  ChevronDown,
  Sparkles,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreativeEditorProps {
  creative: CreativeData;
  onChange: (updates: Partial<CreativeData>) => void;
  clientId?: string;
  companyId?: string;
  clientName?: string;
  clientAvatar?: string;
}

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

export const CreativeEditor = React.memo(function CreativeEditor({ creative, onChange, clientId, companyId, clientName, clientAvatar }: CreativeEditorProps) {
  const [generatingTexts, setGeneratingTexts] = useState(false);
  const [showUtmFields, setShowUtmFields] = useState(false);
  const { toast } = useToast();

  const handleTypeChange = (type: CreativeData['type']) => {
    onChange({ type, mediaUrls: [] });
  };

  const handleGenerateTexts = async () => {
    if (!clientId) {
      toast({ title: "Erro", description: "Cliente não identificado.", variant: "destructive" });
      return;
    }
    if (creative.mediaUrls.length === 0) {
      toast({ title: "Adicione uma imagem", description: "É necessário ter uma imagem no criativo para gerar os textos.", variant: "destructive" });
      return;
    }

    const imageUrl = creative.mediaUrls[0];
    setGeneratingTexts(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-creative-texts', {
        body: { clientId, imageUrl },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      onChange({
        body: data.data.body || creative.body,
        title: data.data.title || creative.title,
        description: data.data.description || creative.description,
        linkUrl: data.data.linkUrl || creative.linkUrl,
        callToAction: data.data.callToAction || creative.callToAction,
      });

      toast({ title: "Textos gerados!", description: "Os campos foram preenchidos com base na imagem e no briefing do cliente." });
    } catch (err: unknown) {
      console.error("Error generating texts:", err);
      toast({ title: "Erro ao gerar textos", description: err.message || "Não foi possível gerar os textos.", variant: "destructive" });
    } finally {
      setGeneratingTexts(false);
    }
  };

  const canGenerateTexts = clientId && creative.mediaUrls.length > 0 && creative.type !== 'VIDEO';

  // UTM handling
  const utmSource = creative.urlParameters?.utm_source || '';
  const utmMedium = creative.urlParameters?.utm_medium || '';
  const utmCampaign = creative.urlParameters?.utm_campaign || '';
  const utmContent = creative.urlParameters?.utm_content || '';
  const utmTerm = creative.urlParameters?.utm_term || '';
  const hasUtm = utmSource || utmMedium || utmCampaign || utmContent || utmTerm;

  const updateUtm = (field: string, value: string) => {
    onChange({
      urlParameters: {
        ...creative.urlParameters,
        [field]: value,
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - matches AdEditContent */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Anúncio</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">META</Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Novo
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Two Column Layout - matches AdEditContent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Configuration & Texts */}
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configurações
                </h4>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Anúncio</Label>
                    <Input
                      value={creative.title}
                      onChange={(e) => onChange({ title: e.target.value })}
                      placeholder="Ex: Anúncio Principal - Produto A"
                    />
                  </div>
                </div>
              </div>

              {/* Texts Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-4">Textos do Anúncio</h4>

                {/* Generate Texts with AI Button */}
                {canGenerateTexts && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateTexts}
                    disabled={generatingTexts}
                    className="w-full mb-4 border-dashed border-primary/50 text-primary hover:bg-primary/5"
                  >
                    {generatingTexts ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analisando imagem...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Gerar Textos com IA
                      </>
                    )}
                  </Button>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Texto Principal *</Label>
                    <Textarea
                      value={creative.body}
                      onChange={(e) => onChange({ body: e.target.value })}
                      placeholder="Texto principal do anúncio que aparece acima da mídia"
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">{creative.body.length}/500 caracteres</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={creative.title}
                      onChange={(e) => onChange({ title: e.target.value })}
                      placeholder="Título do anúncio (headline)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={creative.description}
                      onChange={(e) => onChange({ description: e.target.value })}
                      placeholder="Descrição complementar do anúncio"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">{creative.description.length}/300 caracteres</p>
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
                    <Label>URL de Destino *</Label>
                    <Input
                      type="url"
                      value={creative.linkUrl}
                      onChange={(e) => onChange({ linkUrl: e.target.value })}
                      placeholder="https://seusite.com/pagina"
                    />
                    {creative.linkUrl && !creative.linkUrl.match(/^https?:\/\//) && (
                      <p className="text-xs text-destructive">URL deve começar com http:// ou https://</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Chamada para Ação (CTA)</Label>
                    <Select value={creative.callToAction} onValueChange={(v) => onChange({ callToAction: v })}>
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
                      value={creative.type}
                      onValueChange={(value) => value && handleTypeChange(value as CreativeData['type'])}
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
                      mediaUrls={creative.mediaUrls}
                      onChange={(urls) => onChange({ mediaUrls: urls })}
                      type={creative.type}
                      maxFiles={creative.type === 'CAROUSEL' ? 10 : 1}
                      clientId={clientId}
                      companyId={companyId}
                      creativeContext={{
                        title: creative.title,
                        description: creative.description,
                        body: creative.body,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Feed Preview */}
              <FeedPreview
                creative={creative}
                clientName={clientName}
                clientAvatar={clientAvatar}
              />

              {/* UTM Parameters */}
              <Collapsible open={showUtmFields} onOpenChange={setShowUtmFields}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 h-8 text-xs">
                    <ChevronDown className={`h-3 w-3 transition-transform ${showUtmFields ? 'rotate-180' : ''}`} />
                    Parâmetros UTM
                    {hasUtm && <Badge variant="secondary" className="ml-2 text-xs">Configurado</Badge>}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">utm_source</Label>
                      <Input
                        value={utmSource}
                        onChange={(e) => updateUtm('utm_source', e.target.value)}
                        placeholder="facebook"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">utm_medium</Label>
                      <Input
                        value={utmMedium}
                        onChange={(e) => updateUtm('utm_medium', e.target.value)}
                        placeholder="cpc"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">utm_campaign</Label>
                      <Input
                        value={utmCampaign}
                        onChange={(e) => updateUtm('utm_campaign', e.target.value)}
                        placeholder="{{campaign.name}}"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">utm_content</Label>
                      <Input
                        value={utmContent}
                        onChange={(e) => updateUtm('utm_content', e.target.value)}
                        placeholder="{{ad.name}}"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">utm_term</Label>
                      <Input
                        value={utmTerm}
                        onChange={(e) => updateUtm('utm_term', e.target.value)}
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
    </div>
  );
});
