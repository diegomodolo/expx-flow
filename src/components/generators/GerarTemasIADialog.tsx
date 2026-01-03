import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, TrendingUp, AlertCircle } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { useMarketResearchInsights } from "@/hooks/useMarketResearchInsights";
import { cn } from "@/lib/utils";

interface GeneratedTheme {
  topic: string;
  pain_point: string;
  opportunity: string;
  sentiment: "positive" | "negative" | "neutral";
  relevance_score: number;
}

interface GerarTemasIADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onThemesAdded: () => void;
}

export function GerarTemasIADialog({ 
  open, 
  onOpenChange, 
  clientId, 
  onThemesAdded 
}: GerarTemasIADialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [themes, setThemes] = useState<GeneratedTheme[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  const { createInsight } = useMarketResearchInsights(clientId);

  const generateThemes = async () => {
    if (!activeCompany?.company_id) {
      toast({
        title: "Erro",
        description: "Empresa não selecionada",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setThemes([]);
    setSelectedThemes(new Set());

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-research-themes', {
        body: { clientId, companyId: activeCompany.company_id }
      });

      if (fnError) throw fnError;

      if (data.success && data.themes) {
        setThemes(data.themes);
        // Select all by default
        setSelectedThemes(new Set(data.themes.map((_: GeneratedTheme, i: number) => i)));
      } else {
        setError(data.error || "Erro ao gerar temas");
      }
    } catch (err) {
      console.error("Error generating themes:", err);
      setError("Erro ao comunicar com a IA. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = (index: number) => {
    const newSelected = new Set(selectedThemes);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedThemes(newSelected);
  };

  const selectAll = () => {
    setSelectedThemes(new Set(themes.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedThemes(new Set());
  };

  const handleSave = async () => {
    if (selectedThemes.size === 0) {
      toast({
        title: "Nenhum tema selecionado",
        description: "Selecione pelo menos um tema para adicionar",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const selectedThemesList = themes.filter((_, i) => selectedThemes.has(i));
      
      for (const theme of selectedThemesList) {
        await createInsight({
          topic: theme.topic,
          pain_point: theme.pain_point,
          opportunity: theme.opportunity,
          sentiment: theme.sentiment,
          relevance_score: theme.relevance_score,
          source_type: 'research',
        });
      }

      toast({
        title: "Temas adicionados!",
        description: `${selectedThemesList.length} tema(s) de pesquisa adicionado(s) com sucesso.`,
      });

      onThemesAdded();
      onOpenChange(false);
      setThemes([]);
      setSelectedThemes(new Set());
    } catch (err) {
      console.error("Error saving themes:", err);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar os temas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!loading && !saving) {
      onOpenChange(false);
      setThemes([]);
      setSelectedThemes(new Set());
      setError(null);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'negative': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'Positivo';
      case 'negative': return 'Negativo';
      default: return 'Neutro';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Temas com IA
          </DialogTitle>
          <DialogDescription>
            A IA irá analisar o briefing do cliente e sugerir temas de pesquisa relevantes para criar anúncios.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {themes.length === 0 && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center mb-6">
                Clique no botão abaixo para gerar temas de pesquisa baseados no briefing do cliente.
              </p>
              <Button onClick={generateThemes} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Gerar Temas
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Analisando briefing e gerando temas...</p>
              <p className="text-xs text-muted-foreground mt-2">Isso pode levar alguns segundos</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive font-medium mb-4">{error}</p>
              <Button variant="outline" onClick={generateThemes}>
                Tentar novamente
              </Button>
            </div>
          )}

          {themes.length > 0 && !loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedThemes.size} de {themes.length} temas selecionados
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Selecionar todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Limpar seleção
                  </Button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                {themes.map((theme, index) => (
                  <div
                    key={index}
                    className={cn(
                      "border rounded-lg p-4 cursor-pointer transition-all",
                      selectedThemes.has(index) 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-muted-foreground/30"
                    )}
                    onClick={() => toggleTheme(index)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedThemes.has(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium">{theme.topic}</h4>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={getSentimentColor(theme.sentiment)}>
                              {getSentimentLabel(theme.sentiment)}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <TrendingUp className="h-3 w-3" />
                              {theme.relevance_score}%
                            </div>
                          </div>
                        </div>
                        
                        {theme.pain_point && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Dor:</span> {theme.pain_point}
                          </p>
                        )}
                        
                        {theme.opportunity && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Oportunidade:</span> {theme.opportunity}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading || saving}>
            Cancelar
          </Button>
          {themes.length > 0 && (
            <Button 
              onClick={handleSave} 
              disabled={selectedThemes.size === 0 || saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                `Adicionar ${selectedThemes.size} Tema(s)`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
