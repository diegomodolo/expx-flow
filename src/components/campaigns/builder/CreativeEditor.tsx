import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreativeData } from "@/hooks/useCampaignBuilder";
import { MediaUploader } from "./MediaUploader";
import { PixelSelector } from "./PixelSelector";
import { UrlParametersEditor } from "./UrlParametersEditor";
import { Separator } from "@/components/ui/separator";

interface CreativeEditorProps {
  creative: CreativeData;
  onChange: (updates: Partial<CreativeData>) => void;
  clientId: string;
  companyId: string;
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

export function CreativeEditor({ creative, onChange, clientId, companyId }: CreativeEditorProps) {
  const handleTypeChange = (type: CreativeData['type']) => {
    // Clear media when changing type
    onChange({ type, mediaUrls: [] });
  };

  return (
    <div className="space-y-4 pt-4">
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
        />
      </div>

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

      {/* Tracking Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">📊 Rastreamento</h4>
        
        <PixelSelector
          clientId={clientId}
          companyId={companyId}
          value={creative.pixelId}
          onChange={(pixelId) => onChange({ pixelId: pixelId || undefined })}
        />

        <UrlParametersEditor
          value={creative.urlParameters}
          onChange={(urlParameters) => onChange({ urlParameters })}
          baseUrl={creative.linkUrl}
        />
      </div>
    </div>
  );
}
