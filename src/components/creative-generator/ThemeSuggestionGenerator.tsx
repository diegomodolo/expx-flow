import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/hooks/useClients";
import { Sparkles, Lightbulb, Wand2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReferenceItem } from "./ReferenceUploader";

interface ThemeSuggestion {
  title: string;
  description: string;
  rationale: string;
}

interface ThemeSuggestionGeneratorProps {
  clientId: string;
  creativeType: string;
  references: ReferenceItem[];
  selectedTheme: string;
  onThemeSelect: (theme: string) => void;
}

export function ThemeSuggestionGenerator({
  clientId,
  creativeType,
  references,
  selectedTheme,
  onThemeSelect,
}: ThemeSuggestionGeneratorProps) {
  const [suggestions, setSuggestions] = useState<ThemeSuggestion[]>([]);
  const [customTheme, setCustomTheme] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { clients } = useClients();
  
  const client = clients?.find(c => c.id === clientId);

  useEffect(() => {
    if (clientId && creativeType) {
      generateSuggestions();
    }
  }, [clientId, creativeType]);

  const generateSuggestions = async () => {
    if (!client) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-creative-suggestions', {
        body: {
          clientId,
          creativeType,
          clientBriefing: client.ai_briefing,
          clientSector: client.sector,
          targetAudience: client.target_audience,
          voiceTone: client.voice_tone,
          hasReferences: references.length > 0,
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      toast({
        title: "Erro ao gerar sugestões",
        description: "Não foi possível gerar sugestões automáticas. Você pode inserir um tema personalizado.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCustomThemeSubmit = () => {
    if (customTheme.trim()) {
      onThemeSelect(customTheme.trim());
      toast({
        title: "Tema personalizado definido",
        description: "Seu tema personalizado foi definido com sucesso.",
      });
    }
  };

  const formatCreativeTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      'instagram-feed': 'Post para Feed',
      'instagram-stories': 'Stories',
      'facebook-cover': 'Capa de Facebook',
      'youtube-cover': 'Capa de YouTube',
      'youtube-thumbnail': 'Thumbnail para vídeo',
      'facebook-ad': 'Criativo para Anúncio',
      'email-banner': 'Banner para E-mail',
      'website-banner': 'Banner para Site',
      'whatsapp-business': 'WhatsApp Business',
      'pinterest-pin': 'Pin do Pinterest',
      'reels-cover': 'Capa para Reels',
      'tiktok-cover': 'Capa para TikTok',
      'linkedin-post': 'Post do LinkedIn',
      'carousel-post': 'Carrossel',
      'remarketing-ad': 'Remarketing',
      'awareness-campaign': 'Campanha de Conscientização',
      'institutional-post': 'Post Institucional',
      'event-promotion': 'Divulgação de Evento',
      'seasonal-post': 'Post Comemorativo',
      'product-mockup': 'Mockup de Produto',
    };
    return typeMap[type] || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Definir Tema do Criativo</h3>
        <p className="text-muted-foreground">
          Escolha um tema sugerido pela IA ou crie um tema personalizado para seu{" "}
          <strong>{formatCreativeTypeName(creativeType)}</strong>
        </p>
      </div>

      {client && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              <span className="font-medium">Contexto do Cliente</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Cliente:</span> {client.name}
              </div>
              <div>
                <span className="font-medium">Setor:</span> {client.sector}
              </div>
              {client.target_audience && (
                <div className="md:col-span-2">
                  <span className="font-medium">Público-alvo:</span> {client.target_audience}
                </div>
              )}
              {client.voice_tone && (
                <div className="md:col-span-2">
                  <span className="font-medium">Tom de voz:</span> {client.voice_tone}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isGenerating && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
              <h4 className="font-medium mb-2">Gerando sugestões personalizadas...</h4>
              <p className="text-muted-foreground text-sm">
                Analisando o briefing do cliente e tipo de criativo
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && !isGenerating && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Sugestões de Tema</h4>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              Gerado por IA
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {suggestions.map((suggestion, index) => (
              <Card
                key={index}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                  selectedTheme === suggestion.title
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => onThemeSelect(suggestion.title)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Wand2 className="w-4 h-4 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-sm mb-1">{suggestion.title}</h5>
                      <p className="text-sm text-muted-foreground mb-2">
                        {suggestion.description}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        💡 {suggestion.rationale}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Ou crie um tema personalizado</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={generateSuggestions}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Gerar Novas Sugestões
          </Button>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="custom-theme">Tema Personalizado</Label>
          <Textarea
            id="custom-theme"
            placeholder="Ex: Promoção de Black Friday com desconto de 50% para produtos premium..."
            value={customTheme}
            onChange={(e) => setCustomTheme(e.target.value)}
            rows={3}
          />
          <Button 
            onClick={handleCustomThemeSubmit}
            disabled={!customTheme.trim()}
            className="w-full"
          >
            Usar Tema Personalizado
          </Button>
        </div>
      </div>

      {selectedTheme && (
        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="w-5 h-5 text-primary" />
            <span className="font-medium">Tema Selecionado</span>
          </div>
          <p className="text-sm">{selectedTheme}</p>
        </div>
      )}
    </div>
  );
}