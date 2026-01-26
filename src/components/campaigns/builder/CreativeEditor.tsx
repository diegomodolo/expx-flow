import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreativeData } from "@/hooks/useCampaignBuilder";
import { MediaUploader } from "./MediaUploader";
import { UrlParametersEditor } from "./UrlParametersEditor";
import { FeedPreview } from "./FeedPreview";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2 } from "lucide-react";
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

const CREATIVE_TYPES = [
  { value: 'IMAGE', label: 'Imagem Única' },
  { value: 'VIDEO', label: 'Vídeo' },
  { value: 'CAROUSEL', label: 'Carrossel' },
];

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'BOOK_NOW', label: 'Reserve Agora' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'GET_QUOTE', label: 'Obter Cotação' },
  { value: 'APPLY_NOW', label: 'Candidatar-se' },
  { value: 'SUBSCRIBE', label: 'Assinar' },
  { value: 'WATCH_MORE', label: 'Assistir Mais' },
  { value: 'SEND_MESSAGE', label: 'Enviar Mensagem' },
  { value: 'GET_OFFER', label: 'Obter Oferta' },
];

export function CreativeEditor({ creative, onChange, clientId, companyId, clientName, clientAvatar }: CreativeEditorProps) {
  const [generatingTexts, setGeneratingTexts] = useState(false);
  const { toast } = useToast();

  const handleTypeChange = (type: CreativeData['type']) => {
    // Clear media when changing type
    onChange({ type, mediaUrls: [] });
  };

  const handleGenerateTexts = async () => {
    if (!clientId) {
      toast({
        title: "Erro",
        description: "Cliente não identificado.",
        variant: "destructive",
      });
      return;
    }

    if (creative.mediaUrls.length === 0) {
      toast({
        title: "Adicione uma imagem",
        description: "É necessário ter uma imagem no criativo para gerar os textos.",
        variant: "destructive",
      });
      return;
    }

    // Get the first image (for carousel, use the first one)
    const imageUrl = creative.mediaUrls[0];

    setGeneratingTexts(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-creative-texts', {
        body: { clientId, imageUrl },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Apply generated texts
      onChange({
        body: data.data.body || creative.body,
        title: data.data.title || creative.title,
        description: data.data.description || creative.description,
        linkUrl: data.data.linkUrl || creative.linkUrl,
        callToAction: data.data.callToAction || creative.callToAction,
      });

      toast({
        title: "Textos gerados!",
        description: "Os campos foram preenchidos com base na imagem e no briefing do cliente.",
      });
    } catch (err: any) {
      console.error("Error generating texts:", err);
      toast({
        title: "Erro ao gerar textos",
        description: err.message || "Não foi possível gerar os textos.",
        variant: "destructive",
      });
    } finally {
      setGeneratingTexts(false);
    }
  };

  const canGenerateTexts = clientId && creative.mediaUrls.length > 0 && creative.type !== 'VIDEO';

  return (
    <div className="space-y-6 pt-4">
      {/* Form Fields */}
      <div className="space-y-4">
        {/* Type Selection */}
        <div className="space-y-2">
          <Label>Tipo de Criativo</Label>
          <Select
            value={creative.type}
            onValueChange={(value) => handleTypeChange(value as CreativeData['type'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CREATIVE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Media Upload */}
        <div className="space-y-2">
          <Label>Mídia *</Label>
          <MediaUploader
            mediaUrls={creative.mediaUrls}
            onChange={(urls) => onChange({ mediaUrls: urls })}
            type={creative.type}
            clientId={clientId}
            companyId={companyId}
            creativeContext={{
              title: creative.title,
              description: creative.description,
              body: creative.body,
            }}
          />
        </div>

        {/* Generate Texts with AI Button */}
        {canGenerateTexts && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateTexts}
            disabled={generatingTexts}
            className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/5"
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

        {/* Text Content */}
        <div className="space-y-2">
          <Label htmlFor="creative-body">Texto Principal *</Label>
          <Textarea
            id="creative-body"
            placeholder="Escreva o texto do seu anúncio..."
            value={creative.body}
            onChange={(e) => onChange({ body: e.target.value })}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {creative.body.length}/125 caracteres (recomendado)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="creative-title">Título</Label>
            <Input
              id="creative-title"
              placeholder="Título do anúncio"
              value={creative.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Máx: 40 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="creative-description">Descrição</Label>
            <Input
              id="creative-description"
              placeholder="Descrição adicional"
              value={creative.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </div>
        </div>

        {/* Link & CTA */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="creative-link">URL de Destino *</Label>
            <Input
              id="creative-link"
              type="url"
              placeholder="https://seusite.com.br"
              value={creative.linkUrl}
              onChange={(e) => onChange({ linkUrl: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Botão de Ação</Label>
            <Select
              value={creative.callToAction}
              onValueChange={(value) => onChange({ callToAction: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CTA_OPTIONS.map((cta) => (
                  <SelectItem key={cta.value} value={cta.value}>
                    {cta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="my-4" />

        {/* URL Parameters */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">🔗 Parâmetros de URL</h4>
          
          <UrlParametersEditor
            value={creative.urlParameters}
            onChange={(urlParameters) => onChange({ urlParameters })}
            baseUrl={creative.linkUrl}
          />
        </div>
      </div>

      {/* Feed Preview - Always below */}
      <div>
        <FeedPreview
          creative={creative}
          clientName={clientName}
          clientAvatar={clientAvatar}
        />
      </div>
    </div>
  );
}
