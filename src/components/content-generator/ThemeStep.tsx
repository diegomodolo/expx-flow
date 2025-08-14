import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Sparkles } from "lucide-react";
import { ContentType } from "./ContentTypes";
import { useClients } from "@/hooks/useClients";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useCompetitors } from "@/hooks/useCompetitors";

interface ThemeStepProps {
  clientId: string;
  contentType: ContentType;
  selectedTheme: string;
  onThemeSelect: (theme: string) => void;
}

export function ThemeStep({ clientId, contentType, selectedTheme, onThemeSelect }: ThemeStepProps) {
  const [customTheme, setCustomTheme] = useState("");
  const [suggestedThemes, setSuggestedThemes] = useState<string[]>([]);
  const { clients } = useClients();
  const { campaigns } = useCampaigns();
  const { competitors } = useCompetitors();

  const client = clients.find(c => c.id === clientId);

  useEffect(() => {
    if (client) {
      generateSuggestedThemes();
    }
  }, [client, clientId]);

  const generateSuggestedThemes = () => {
    const themes: string[] = [];
    
    // Base themes from client briefing
    if (client?.objectives) {
      themes.push(`Soluções para ${client.objectives.toLowerCase()}`);
    }
    
    if (client?.sector) {
      themes.push(`Tendências no setor ${client.sector.toLowerCase()}`);
      themes.push(`Inovação em ${client.sector.toLowerCase()}`);
    }

    if (client?.product_name) {
      themes.push(`Benefícios do ${client.product_name}`);
      themes.push(`Como escolher ${client.product_name}`);
    }

    // Themes from recent campaigns
    const clientCampaigns = campaigns.filter(c => c.client_id === clientId);
    if (clientCampaigns.length > 0) {
      themes.push("Performance de campanhas recentes");
      themes.push("Cases de sucesso");
    }

    // Themes based on competitors
    const clientCompetitors = competitors.filter(c => c.client_id === clientId);
    if (clientCompetitors.length > 0) {
      themes.push("Diferenciais competitivos");
      themes.push("Análise de mercado");
    }

    // Generic themes based on content type
    const genericThemes = getGenericThemesByContentType(contentType.id);
    themes.push(...genericThemes);

    // Remove duplicates and limit to 6
    setSuggestedThemes([...new Set(themes)].slice(0, 6));
  };

  const getGenericThemesByContentType = (contentTypeId: string): string[] => {
    const themeMap: Record<string, string[]> = {
      'roteiro-tiktok': ['Dicas rápidas', 'Trending topics', 'Desafios virais'],
      'roteiro-youtube-shorts': ['Tutorial express', 'Curiosidades', 'Dicas práticas'],
      'titulos-youtube': ['Como fazer', 'Segredos revelados', 'Guia completo'],
      'ideias-instagram': ['Behind the scenes', 'Dicas do dia', 'Transformação'],
      'facebook-ads': ['Oferta especial', 'Benefícios únicos', 'Testemunhos'],
      'email-marketing': ['Novidades exclusivas', 'Oferta limitada', 'Conteúdo premium'],
      'landing-page': ['Solução definitiva', 'Resultado garantido', 'Transformação'],
      'post-comemorativo': ['Dia das Mães', 'Black Friday', 'Natal'],
      'post-autoridade': ['Case de sucesso', 'Premiação recebida', 'Certificação'],
    };

    return themeMap[contentTypeId] || ['Novidades do mercado', 'Dicas especializadas', 'Tendências atuais'];
  };

  const handleThemeSelect = (theme: string) => {
    onThemeSelect(theme);
    setCustomTheme("");
  };

  const handleCustomThemeSubmit = () => {
    if (customTheme.trim()) {
      onThemeSelect(customTheme.trim());
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Escolha o Tema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Selecione um tema sugerido baseado no perfil do cliente ou digite um tema personalizado.
          </p>

          {/* Suggested Themes */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Temas Sugeridos
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {suggestedThemes.map((theme, index) => (
                <Button
                  key={index}
                  variant={selectedTheme === theme ? "default" : "outline"}
                  className="justify-start h-auto p-3 text-left"
                  onClick={() => handleThemeSelect(theme)}
                >
                  {theme}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Theme */}
          <div className="space-y-3">
            <Label htmlFor="custom-theme" className="text-sm font-medium">
              Tema Personalizado
            </Label>
            <div className="flex gap-2">
              <Input
                id="custom-theme"
                placeholder="Digite seu tema personalizado..."
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomThemeSubmit()}
              />
              <Button 
                onClick={handleCustomThemeSubmit}
                disabled={!customTheme.trim()}
              >
                Usar
              </Button>
            </div>
          </div>

          {/* Selected Theme Display */}
          {selectedTheme && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                <Sparkles className="w-4 h-4" />
                Tema Selecionado
              </div>
              <Badge variant="secondary" className="mt-2">
                {selectedTheme}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Context */}
      {client && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h4 className="font-medium text-sm mb-2">Contexto do Cliente:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Cliente:</strong> {client.name} ({client.company})</p>
              {client.sector && <p><strong>Setor:</strong> {client.sector}</p>}
              {client.target_audience && <p><strong>Público:</strong> {client.target_audience}</p>}
              {client.voice_tone && <p><strong>Tom:</strong> {client.voice_tone}</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}