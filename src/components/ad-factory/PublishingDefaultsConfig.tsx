import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, MousePointer, Activity, Settings2, RefreshCw, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMetaPixels, MetaPixel } from "@/hooks/useMetaPixels";
import { Skeleton } from "@/components/ui/skeleton";

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

const DEFAULT_URL_PARAMS = "utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}";

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
  clientId: string;
  companyId: string;
  compact?: boolean;
}

export function PublishingDefaultsConfig({ config, onChange, clientId, companyId, compact = false }: Props) {
  const [suggestedUrl, setSuggestedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const { pixels, loading: loadingPixels, fetchPixels, syncPixels, syncing } = useMetaPixels(clientId, companyId);

  // Fetch suggested URL from active campaigns
  useEffect(() => {
    const fetchSuggestedUrl = async () => {
      if (!clientId) return;
      
      setLoadingUrl(true);
      try {
        // Get URL from ads of active campaigns
        const { data } = await supabase
          .from("ads")
          .select("link_url")
          .eq("client_id", clientId)
          .eq("is_active", true)
          .not("link_url", "is", null)
          .limit(1);
        
        if (data && data.length > 0 && data[0].link_url) {
          // Clean up URL - remove existing utm params
          try {
            const url = new URL(data[0].link_url);
            url.search = ""; // Remove all query params
            setSuggestedUrl(url.toString());
          } catch {
            setSuggestedUrl(data[0].link_url.split("?")[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching suggested URL:", error);
      } finally {
        setLoadingUrl(false);
      }
    };

    fetchSuggestedUrl();
  }, [clientId]);

  // Fetch pixels on mount
  useEffect(() => {
    if (clientId && companyId) {
      fetchPixels();
    }
  }, [clientId, companyId, fetchPixels]);

  // Set default URL params if not set
  useEffect(() => {
    if (!config.default_url_params) {
      onChange({ default_url_params: DEFAULT_URL_PARAMS });
    }
  }, []);

  const handleUseSuggestedUrl = () => {
    if (suggestedUrl) {
      onChange({ default_destination_url: suggestedUrl });
    }
  };

  const primaryPixel = pixels.find(p => p.is_primary);

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="destination_url" className="flex items-center gap-2 text-sm">
              <Link className="h-3.5 w-3.5" />
              URL de Destino
            </Label>
            <div className="flex gap-2">
              <Input
                id="destination_url"
                placeholder="https://seusite.com/pagina"
                value={config.default_destination_url || ""}
                onChange={(e) => onChange({ default_destination_url: e.target.value || null })}
                className="flex-1"
              />
              {suggestedUrl && !config.default_destination_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleUseSuggestedUrl}
                  title="Usar URL sugerida"
                >
                  <Lightbulb className="h-4 w-4" />
                </Button>
              )}
            </div>
            {suggestedUrl && !config.default_destination_url && (
              <p className="text-xs text-muted-foreground">
                Sugestão: {suggestedUrl}
              </p>
            )}
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pixel_id" className="flex items-center gap-2 text-sm">
              <Activity className="h-3.5 w-3.5" />
              Pixel
            </Label>
            <div className="flex gap-2">
              {loadingPixels ? (
                <Skeleton className="h-10 flex-1" />
              ) : (
                <Select
                  value={config.default_pixel_id || "none"}
                  onValueChange={(value) => onChange({ default_pixel_id: value === "none" ? null : value })}
                >
                  <SelectTrigger id="pixel_id" className="flex-1">
                    <SelectValue placeholder="Selecione um Pixel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {pixels.map((pixel) => (
                      <SelectItem key={pixel.id} value={pixel.pixel_id}>
                        {pixel.pixel_name} {pixel.is_primary && "(Principal)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={syncPixels}
                disabled={syncing}
                title="Sincronizar pixels"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
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
              placeholder="utm_source={{site_source_name}}&utm_medium=paid"
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
        <div className="space-y-2">
          <Label htmlFor="destination_url" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            URL de Destino
          </Label>
          <div className="flex gap-2">
            <Input
              id="destination_url"
              placeholder="https://seusite.com/pagina"
              value={config.default_destination_url || ""}
              onChange={(e) => onChange({ default_destination_url: e.target.value || null })}
              className="flex-1"
            />
            {suggestedUrl && !config.default_destination_url && (
              <Button
                type="button"
                variant="outline"
                onClick={handleUseSuggestedUrl}
                className="shrink-0"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Usar Sugestão
              </Button>
            )}
          </div>
          {loadingUrl ? (
            <Skeleton className="h-4 w-48" />
          ) : suggestedUrl && !config.default_destination_url ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Sugestão baseada em campanhas ativas: <span className="font-medium">{suggestedUrl}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Página para onde os usuários serão direcionados
            </p>
          )}
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

        <div className="space-y-2">
          <Label htmlFor="pixel_id" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Pixel de Rastreamento
          </Label>
          <div className="flex gap-2">
            {loadingPixels ? (
              <Skeleton className="h-10 flex-1" />
            ) : (
              <Select
                value={config.default_pixel_id || "none"}
                onValueChange={(value) => onChange({ default_pixel_id: value === "none" ? null : value })}
              >
                <SelectTrigger id="pixel_id" className="flex-1">
                  <SelectValue placeholder="Selecione um Pixel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {pixels.length === 0 ? "Nenhum pixel encontrado" : "Nenhum"}
                  </SelectItem>
                  {pixels.map((pixel) => (
                    <SelectItem key={pixel.id} value={pixel.pixel_id}>
                      {pixel.pixel_name} {pixel.is_primary && "(Principal)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={syncPixels}
              disabled={syncing}
              className="shrink-0"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              Sincronizar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {pixels.length > 0 
              ? `${pixels.length} pixel(s) disponível(is)${primaryPixel ? ` • Principal: ${primaryPixel.pixel_name}` : ""}`
              : "Clique em Sincronizar para buscar os pixels da conta"
            }
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="url_params" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Parâmetros URL (UTM)
          </Label>
          <Input
            id="url_params"
            placeholder="utm_source={{site_source_name}}&utm_medium=paid&utm_campaign={{campaign.name}}"
            value={config.default_url_params || ""}
            onChange={(e) => onChange({ default_url_params: e.target.value || null })}
          />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Parâmetros adicionados à URL de destino. Use variáveis dinâmicas:</p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li><code className="bg-muted px-1 rounded">{"{{campaign.name}}"}</code> - Nome da campanha</li>
              <li><code className="bg-muted px-1 rounded">{"{{adset.name}}"}</code> - Nome do conjunto</li>
              <li><code className="bg-muted px-1 rounded">{"{{ad.name}}"}</code> - Nome do anúncio</li>
              <li><code className="bg-muted px-1 rounded">{"{{site_source_name}}"}</code> - Plataforma (fb/ig)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
