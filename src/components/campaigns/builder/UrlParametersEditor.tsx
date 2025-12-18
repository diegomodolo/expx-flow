import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface UrlParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  customParams?: string;
}

interface UrlParametersEditorProps {
  value: UrlParameters;
  onChange: (params: UrlParameters) => void;
  baseUrl?: string;
}

const DYNAMIC_VARIABLES = [
  { value: "{{campaign.name}}", label: "Nome da Campanha" },
  { value: "{{adset.name}}", label: "Nome do Conjunto" },
  { value: "{{ad.name}}", label: "Nome do Anúncio" },
  { value: "{{ad.id}}", label: "ID do Anúncio" },
  { value: "{{placement}}", label: "Posicionamento" },
  { value: "{{site_source_name}}", label: "Plataforma (fb/ig)" },
];

const DEFAULT_VALUES: UrlParameters = {
  utm_source: "facebook",
  utm_medium: "paid_social",
  utm_campaign: "{{campaign.name}}",
  utm_content: "{{ad.name}}",
  utm_term: "{{adset.name}}",
};

export function UrlParametersEditor({ value, onChange, baseUrl }: UrlParametersEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showVariables, setShowVariables] = useState(false);

  const handleChange = (field: keyof UrlParameters, newValue: string) => {
    onChange({ ...value, [field]: newValue });
  };

  const applyDefaults = () => {
    onChange({ ...value, ...DEFAULT_VALUES });
  };

  const buildPreviewUrl = () => {
    if (!baseUrl) return "";
    
    const params = new URLSearchParams();
    if (value.utm_source) params.append("utm_source", value.utm_source);
    if (value.utm_medium) params.append("utm_medium", value.utm_medium);
    if (value.utm_campaign) params.append("utm_campaign", value.utm_campaign);
    if (value.utm_content) params.append("utm_content", value.utm_content);
    if (value.utm_term) params.append("utm_term", value.utm_term);
    
    const queryString = params.toString();
    const customParams = value.customParams?.trim();
    
    if (!queryString && !customParams) return baseUrl;
    
    const separator = baseUrl.includes("?") ? "&" : "?";
    let url = queryString ? `${baseUrl}${separator}${queryString}` : baseUrl;
    
    if (customParams) {
      url += (url.includes("?") ? "&" : "?") + customParams;
    }
    
    return url;
  };

  const hasAnyValue = Object.values(value).some(v => v && v.trim());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Link className="h-4 w-4" />
          Parâmetros de URL (UTMs)
        </Label>
        {!hasAnyValue && (
          <Button type="button" variant="outline" size="sm" onClick={applyDefaults}>
            Usar padrões
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">utm_source</Label>
          <Input
            placeholder="facebook"
            value={value.utm_source || ""}
            onChange={(e) => handleChange("utm_source", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">utm_medium</Label>
          <Input
            placeholder="paid_social"
            value={value.utm_medium || ""}
            onChange={(e) => handleChange("utm_medium", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">utm_campaign</Label>
          <Input
            placeholder="{{campaign.name}}"
            value={value.utm_campaign || ""}
            onChange={(e) => handleChange("utm_campaign", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">utm_content</Label>
          <Input
            placeholder="{{ad.name}}"
            value={value.utm_content || ""}
            onChange={(e) => handleChange("utm_content", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">utm_term</Label>
        <Input
          placeholder="{{adset.name}}"
          value={value.utm_term || ""}
          onChange={(e) => handleChange("utm_term", e.target.value)}
        />
      </div>

      <Collapsible open={showVariables} onOpenChange={setShowVariables}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="w-full text-xs">
            {showVariables ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            Variáveis dinâmicas do Meta
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-md mt-1">
            {DYNAMIC_VARIABLES.map((variable) => (
              <code
                key={variable.value}
                className="text-xs px-2 py-1 bg-background rounded cursor-pointer hover:bg-primary/10 border"
                title={variable.label}
                onClick={() => navigator.clipboard.writeText(variable.value)}
              >
                {variable.value}
              </code>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Clique para copiar</p>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Parâmetros Adicionais (opcional)</Label>
        <Input
          placeholder="ref=meta&utm_id={{ad.id}}"
          value={value.customParams || ""}
          onChange={(e) => handleChange("customParams", e.target.value)}
        />
      </div>

      {baseUrl && hasAnyValue && (
        <div className="p-2 bg-muted/50 rounded-md">
          <Label className="text-xs text-muted-foreground">Preview da URL:</Label>
          <p className="text-xs font-mono break-all text-foreground/80 mt-1">
            {buildPreviewUrl()}
          </p>
        </div>
      )}
    </div>
  );
}
