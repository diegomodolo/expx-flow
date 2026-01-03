import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, FileText, Type, MessageSquare, MousePointer, Activity, Settings2 } from "lucide-react";

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

export interface PublishingDefaults {
  default_destination_url: string | null;
  default_primary_text: string | null;
  default_headline: string | null;
  default_description: string | null;
  default_cta: string | null;
  default_pixel_id: string | null;
  default_url_params: string | null;
}

interface Props {
  config: PublishingDefaults;
  onChange: (config: Partial<PublishingDefaults>) => void;
  compact?: boolean;
}

export function PublishingDefaultsConfig({ config, onChange, compact = false }: Props) {
  if (compact) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="destination_url" className="flex items-center gap-2 text-sm">
              <Link className="h-3.5 w-3.5" />
              URL de Destino
            </Label>
            <Input
              id="destination_url"
              placeholder="https://seusite.com/pagina"
              value={config.default_destination_url || ""}
              onChange={(e) => onChange({ default_destination_url: e.target.value || null })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta" className="flex items-center gap-2 text-sm">
              <MousePointer className="h-3.5 w-3.5" />
              Botão CTA
            </Label>
            <Select
              value={config.default_cta || "LEARN_MORE"}
              onValueChange={(value) => onChange({ default_cta: value })}
            >
              <SelectTrigger id="cta">
                <SelectValue placeholder="Selecione o CTA" />
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
          <Label htmlFor="primary_text" className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            Texto Principal
          </Label>
          <Textarea
            id="primary_text"
            placeholder="Texto principal do anúncio..."
            rows={2}
            value={config.default_primary_text || ""}
            onChange={(e) => onChange({ default_primary_text: e.target.value || null })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="headline" className="flex items-center gap-2 text-sm">
              <Type className="h-3.5 w-3.5" />
              Título
            </Label>
            <Input
              id="headline"
              placeholder="Título do anúncio"
              value={config.default_headline || ""}
              onChange={(e) => onChange({ default_headline: e.target.value || null })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2 text-sm">
              <FileText className="h-3.5 w-3.5" />
              Descrição
            </Label>
            <Input
              id="description"
              placeholder="Descrição do anúncio"
              value={config.default_description || ""}
              onChange={(e) => onChange({ default_description: e.target.value || null })}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pixel_id" className="flex items-center gap-2 text-sm">
              <Activity className="h-3.5 w-3.5" />
              Pixel ID
            </Label>
            <Input
              id="pixel_id"
              placeholder="ID do Pixel Meta"
              value={config.default_pixel_id || ""}
              onChange={(e) => onChange({ default_pixel_id: e.target.value || null })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url_params" className="flex items-center gap-2 text-sm">
              <Settings2 className="h-3.5 w-3.5" />
              Parâmetros URL
            </Label>
            <Input
              id="url_params"
              placeholder="utm_source=meta&utm_medium=cpc"
              value={config.default_url_params || ""}
              onChange={(e) => onChange({ default_url_params: e.target.value || null })}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Configurações Padrão de Publicação
        </CardTitle>
        <CardDescription>
          Defina valores padrão que serão usados ao publicar anúncios no Meta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="destination_url" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              URL de Destino
            </Label>
            <Input
              id="destination_url"
              placeholder="https://seusite.com/pagina"
              value={config.default_destination_url || ""}
              onChange={(e) => onChange({ default_destination_url: e.target.value || null })}
            />
            <p className="text-xs text-muted-foreground">
              Página para onde os usuários serão direcionados
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta" className="flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Botão CTA
            </Label>
            <Select
              value={config.default_cta || "LEARN_MORE"}
              onValueChange={(value) => onChange({ default_cta: value })}
            >
              <SelectTrigger id="cta">
                <SelectValue placeholder="Selecione o CTA" />
              </SelectTrigger>
              <SelectContent>
                {CTA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Texto do botão de ação do anúncio
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="primary_text" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Texto Principal
          </Label>
          <Textarea
            id="primary_text"
            placeholder="Texto principal do anúncio que aparece acima da imagem..."
            rows={3}
            value={config.default_primary_text || ""}
            onChange={(e) => onChange({ default_primary_text: e.target.value || null })}
          />
          <p className="text-xs text-muted-foreground">
            Texto que aparece acima do criativo no feed
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="headline" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Título
            </Label>
            <Input
              id="headline"
              placeholder="Título chamativo do anúncio"
              value={config.default_headline || ""}
              onChange={(e) => onChange({ default_headline: e.target.value || null })}
            />
            <p className="text-xs text-muted-foreground">
              Headline que aparece abaixo da imagem
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Descrição
            </Label>
            <Input
              id="description"
              placeholder="Breve descrição do anúncio"
              value={config.default_description || ""}
              onChange={(e) => onChange({ default_description: e.target.value || null })}
            />
            <p className="text-xs text-muted-foreground">
              Descrição adicional do link (nem sempre exibida)
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pixel_id" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Pixel ID
            </Label>
            <Input
              id="pixel_id"
              placeholder="Ex: 123456789012345"
              value={config.default_pixel_id || ""}
              onChange={(e) => onChange({ default_pixel_id: e.target.value || null })}
            />
            <p className="text-xs text-muted-foreground">
              ID do Pixel do Meta para rastreamento de conversões
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url_params" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Parâmetros URL (UTM)
            </Label>
            <Input
              id="url_params"
              placeholder="utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}"
              value={config.default_url_params || ""}
              onChange={(e) => onChange({ default_url_params: e.target.value || null })}
            />
            <p className="text-xs text-muted-foreground">
              Parâmetros adicionados à URL de destino
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
