import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";
import { useCompany } from "@/contexts/CompanyContext";
import { useVisualCreatives } from "@/hooks/useVisualCreatives";
import { useFacebookPages } from "@/hooks/useFacebookPages";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, 
  Loader2, 
  Download, 
  Save, 
  RefreshCw, 
  Calendar, 
  Copy, 
  ChevronDown, 
  ImagePlus, 
  X,
  Check,
  Wand2
} from "lucide-react";
import { NewPostModal } from "@/components/scheduling/NewPostModal";

// Tipos de criativos disponíveis
const CREATIVE_TYPES = [
  { id: "instagram_feed", name: "Instagram Feed", dimensions: "1080x1080", aspectRatio: "1:1" },
  { id: "instagram_story", name: "Instagram Story", dimensions: "1080x1920", aspectRatio: "9:16" },
  { id: "instagram_reels", name: "Instagram Reels", dimensions: "1080x1920", aspectRatio: "9:16" },
  { id: "facebook_feed", name: "Facebook Feed", dimensions: "1200x628", aspectRatio: "1.91:1" },
  { id: "facebook_story", name: "Facebook Story", dimensions: "1080x1920", aspectRatio: "9:16" },
  { id: "whatsapp_status", name: "WhatsApp Status", dimensions: "1080x1920", aspectRatio: "9:16" },
  { id: "linkedin_post", name: "LinkedIn Post", dimensions: "1200x627", aspectRatio: "1.91:1" },
  { id: "youtube_thumbnail", name: "YouTube Thumbnail", dimensions: "1280x720", aspectRatio: "16:9" },
  { id: "tiktok_video", name: "TikTok", dimensions: "1080x1920", aspectRatio: "9:16" },
  { id: "banner_horizontal", name: "Banner Horizontal", dimensions: "1920x600", aspectRatio: "32:10" },
  { id: "banner_vertical", name: "Banner Vertical", dimensions: "600x1200", aspectRatio: "1:2" },
  { id: "twitter_post", name: "Twitter/X Post", dimensions: "1200x675", aspectRatio: "16:9" },
];

interface GeneratedCreative {
  id: string;
  imageUrl: string;
  caption: string;
  type: string;
  typeName: string;
}

export function CreativeGeneratorSimplified() {
  const { toast } = useToast();
  const { clients } = useClients();
  const { activeCompany } = useCompany();
  const { createCreative } = useVisualCreatives();
  const { pages, instagramAccounts } = useFacebookPages();

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["instagram_feed"]);
  const [quantity, setQuantity] = useState(1);
  const [theme, setTheme] = useState("");
  const [copyText, setCopyText] = useState("");
  const [references, setReferences] = useState<File[]>([]);
  const [showReferences, setShowReferences] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCreatives, setGeneratedCreatives] = useState<GeneratedCreative[]>([]);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  // Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCreativeForSchedule, setSelectedCreativeForSchedule] = useState<GeneratedCreative | null>(null);

  // Derived state
  const selectedClient = useMemo(() => 
    clients?.find(c => c.id === selectedClientId), 
    [clients, selectedClientId]
  );

  const activeClients = useMemo(() => 
    clients?.filter(c => !c.is_canceled) || [], 
    [clients]
  );

  const canGenerate = selectedClientId && selectedTypes.length > 0 && theme.trim();

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeId)) {
        if (prev.length === 1) return prev; // Manter pelo menos um
        return prev.filter(t => t !== typeId);
      }
      return [...prev, typeId];
    });
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    setReferences(prev => [...prev, ...validFiles].slice(0, 3)); // Máximo 3
  };

  const removeReference = (index: number) => {
    setReferences(prev => prev.filter((_, i) => i !== index));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (!canGenerate || !activeCompany?.company_id) return;

    setIsGenerating(true);
    setGeneratedCreatives([]);
    
    const totalToGenerate = selectedTypes.length * quantity;
    setGenerationProgress({ current: 0, total: totalToGenerate });

    try {
      // Converter referências para base64
      const referenceBase64 = await Promise.all(
        references.map(f => convertFileToBase64(f))
      );

      const newCreatives: GeneratedCreative[] = [];

      for (const typeId of selectedTypes) {
        const typeInfo = CREATIVE_TYPES.find(t => t.id === typeId)!;
        
        for (let i = 0; i < quantity; i++) {
          setGenerationProgress(prev => ({ ...prev, current: prev.current + 1 }));

          const variationPrompt = quantity > 1 
            ? `Esta é a variação ${i + 1} de ${quantity}. Crie uma versão única e diferente das anteriores, mantendo o mesmo tema mas com visual diferenciado.`
            : "";

          const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
            body: {
              creativeType: typeId,
              clientId: selectedClientId,
              theme: theme,
              companyId: activeCompany.company_id,
              references: referenceBase64,
              approvedText: copyText || undefined,
              context: {
                title: theme,
                description: `${theme} ${variationPrompt}`.trim(),
                objective: "engajamento",
                targetAudience: selectedClient?.target_audience || "",
                imageCopy: copyText,
                suggestedCaption: ""
              }
            }
          });

          if (error) throw error;

          if (data?.imageUrl) {
            newCreatives.push({
              id: `${typeId}-${i}-${Date.now()}`,
              imageUrl: data.imageUrl,
              caption: data.caption || "",
              type: typeId,
              typeName: typeInfo.name
            });
            setGeneratedCreatives([...newCreatives]);
          }
        }
      }

      toast({
        title: "Criativos gerados!",
        description: `${newCreatives.length} criativo(s) gerado(s) com sucesso.`,
      });

    } catch (error: any) {
      console.error('Erro ao gerar criativos:', error);
      toast({
        title: "Erro na geração",
        description: error.message || "Não foi possível gerar os criativos.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  const handleDownload = async (creative: GeneratedCreative) => {
    try {
      const response = await fetch(creative.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `criativo-${creative.type}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: "Download iniciado" });
    } catch (error) {
      toast({ title: "Erro no download", variant: "destructive" });
    }
  };

  const handleSave = async (creative: GeneratedCreative) => {
    if (!selectedClient || !activeCompany?.company_id) return;

    try {
      await createCreative({
        company_id: activeCompany.company_id,
        client_id: selectedClientId,
        client_name: selectedClient.name,
        creative_type: creative.type,
        theme: theme,
        title: theme,
        description: theme,
        objective: "engajamento",
        target_audience: selectedClient.target_audience || "",
        copy_text: copyText,
        caption: creative.caption,
        image_url: creative.imageUrl,
        status: 'completed'
      });
    } catch (error) {
      // Toast já exibido pelo hook
    }
  };

  const handleCopyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
    toast({ title: "Legenda copiada!" });
  };

  const handleSchedule = (creative: GeneratedCreative) => {
    setSelectedCreativeForSchedule(creative);
    setShowScheduleModal(true);
  };

  const handleRegenerate = async (creative: GeneratedCreative) => {
    // Regenerar apenas este criativo específico
    setIsGenerating(true);
    
    try {
      const referenceBase64 = await Promise.all(
        references.map(f => convertFileToBase64(f))
      );

      const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
        body: {
          creativeType: creative.type,
          clientId: selectedClientId,
          theme: theme,
          companyId: activeCompany?.company_id,
          references: referenceBase64,
          approvedText: copyText || undefined,
          context: {
            title: theme,
            description: `${theme} - Nova versão regenerada`,
            objective: "engajamento",
            targetAudience: selectedClient?.target_audience || "",
            imageCopy: copyText,
            suggestedCaption: ""
          }
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedCreatives(prev => 
          prev.map(c => c.id === creative.id 
            ? { ...c, imageUrl: data.imageUrl, caption: data.caption || "" }
            : c
          )
        );
        toast({ title: "Criativo regenerado!" });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao regenerar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Coluna Esquerda - Configurações */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Configurar Criativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {activeClients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <span>{client.name}</span>
                        {client.ai_briefing && (
                          <Badge variant="secondary" className="text-xs">IA</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipos de Criativo */}
            <div className="space-y-2">
              <Label>Tipo de Criativo * (clique para selecionar múltiplos)</Label>
              <div className="flex flex-wrap gap-2">
                {CREATIVE_TYPES.map(type => (
                  <Badge
                    key={type.id}
                    variant={selectedTypes.includes(type.id) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => handleTypeToggle(type.id)}
                  >
                    {selectedTypes.includes(type.id) && <Check className="w-3 h-3 mr-1" />}
                    {type.name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecionados: {selectedTypes.map(t => CREATIVE_TYPES.find(ct => ct.id === t)?.name).join(", ")}
              </p>
            </div>

            {/* Quantidade */}
            <div className="space-y-2">
              <Label>Quantidade de variações por tipo: {quantity}</Label>
              <Slider
                value={[quantity]}
                onValueChange={([val]) => setQuantity(val)}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Total de criativos a gerar: {selectedTypes.length * quantity}
              </p>
            </div>

            {/* Tema/Descrição */}
            <div className="space-y-2">
              <Label>Tema / Descrição do Criativo *</Label>
              <Textarea
                placeholder="Ex: Promoção de Black Friday com 50% de desconto em todos os produtos"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                rows={3}
              />
            </div>

            {/* Copy da Imagem (texto que aparece na arte) */}
            <div className="space-y-2">
              <Label>Texto na Imagem (opcional)</Label>
              <Input
                placeholder="Ex: 50% OFF, Compre Agora, etc."
                value={copyText}
                onChange={(e) => setCopyText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Este texto aparecerá diretamente na arte. Deixe vazio para a IA gerar.
              </p>
            </div>

            {/* Referências Visuais (colapsável) */}
            <Collapsible open={showReferences} onOpenChange={setShowReferences}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <ImagePlus className="w-4 h-4" />
                    Referências Visuais ({references.length}/3)
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showReferences ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-3">
                <div className="flex gap-2">
                  {references.map((file, idx) => (
                    <div key={idx} className="relative w-20 h-20">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Ref ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removeReference(idx)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {references.length < 3 && (
                    <label className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleReferenceUpload}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Adicione imagens de referência para guiar o estilo visual
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* Botão Gerar */}
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando {generationProgress.current}/{generationProgress.total}...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar {selectedTypes.length * quantity} Criativo(s)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Coluna Direita - Resultados */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Criativos Gerados</h3>
        
        {generatedCreatives.length === 0 && !isGenerating && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Os criativos gerados aparecerão aqui</p>
              <p className="text-sm">Configure as opções ao lado e clique em "Gerar"</p>
            </CardContent>
          </Card>
        )}

        {isGenerating && generatedCreatives.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="font-medium">Gerando criativos...</p>
              <p className="text-sm text-muted-foreground">
                {generationProgress.current} de {generationProgress.total}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4">
          {generatedCreatives.map((creative) => (
            <Card key={creative.id} className="overflow-hidden">
              <div className="aspect-square relative bg-muted">
                <img
                  src={creative.imageUrl}
                  alt={creative.typeName}
                  className="w-full h-full object-contain"
                />
                <Badge className="absolute top-2 left-2">
                  {creative.typeName}
                </Badge>
              </div>
              <CardContent className="p-4 space-y-3">
                {creative.caption && (
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Legenda sugerida:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => handleCopyCaption(creative.caption)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm line-clamp-3">{creative.caption}</p>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleDownload(creative)}>
                    <Download className="w-4 h-4 mr-1" />
                    Baixar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleSave(creative)}>
                    <Save className="w-4 h-4 mr-1" />
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleSchedule(creative)}>
                    <Calendar className="w-4 h-4 mr-1" />
                    Agendar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleRegenerate(creative)}
                    disabled={isGenerating}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                    Nova Versão
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal de Agendamento */}
      {selectedCreativeForSchedule && (
        <NewPostModal
          open={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedCreativeForSchedule(null);
          }}
          pages={pages}
          instagramAccounts={instagramAccounts}
          initialMediaUrls={[selectedCreativeForSchedule.imageUrl]}
          initialCaption={selectedCreativeForSchedule.caption}
          initialClientId={selectedClientId}
        />
      )}
    </div>
  );
}
