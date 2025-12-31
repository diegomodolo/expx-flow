import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Copy, Trash2, ChevronDown, Link2, Image as ImageIcon, Upload, Sparkles, Instagram, X } from "lucide-react";
import { FeedPreview } from "@/components/campaigns/builder/FeedPreview";
import { EditableCreative, CTA_OPTIONS } from "./types";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditableCreativeCardProps {
  creative: EditableCreative;
  index: number;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  onChange: (creative: EditableCreative) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function EditableCreativeCard({
  creative,
  index,
  clientId,
  clientName,
  clientAvatar,
  onChange,
  onDuplicate,
  onRemove,
  canRemove,
}: EditableCreativeCardProps) {
  const [showUtm, setShowUtm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = <K extends keyof EditableCreative>(
    key: K,
    value: EditableCreative[K]
  ) => {
    onChange({ ...creative, [key]: value });
  };

  const handleUtmChange = (key: keyof EditableCreative['urlParameters'], value: string) => {
    onChange({
      ...creative,
      urlParameters: { ...creative.urlParameters, [key]: value },
    });
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `creatives/${clientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-assets')
        .getPublicUrl(filePath);

      handleChange('mediaUrls', [publicUrl]);
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploading(false);
    }
  }, [clientId, handleChange]);

  const handleGenerateAI = useCallback(async () => {
    if (!creative.headline && !creative.body) {
      toast.error('Preencha o título ou texto principal para gerar a imagem');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const prompt = `Crie uma imagem profissional para anúncio de mídia social. 
        Título: ${creative.headline || 'Sem título'}
        Texto: ${creative.body || 'Sem texto'}
        Descrição: ${creative.description || 'Sem descrição'}
        Estilo: moderno, profissional, adequado para Instagram e Facebook.`;

      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: { prompt, clientId }
      });

      if (error) throw error;
      if (data?.imageUrl) {
        handleChange('mediaUrls', [data.imageUrl]);
        toast.success('Imagem gerada com sucesso!');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Erro ao gerar imagem com IA');
    } finally {
      setIsGeneratingAI(false);
    }
  }, [creative.headline, creative.body, creative.description, clientId, handleChange]);

  const handleRemoveMedia = useCallback(() => {
    handleChange('mediaUrls', []);
  }, [handleChange]);

  // For FeedPreview compatibility
  const previewCreative = {
    id: creative.id,
    type: creative.type,
    mediaUrls: creative.mediaUrls,
    body: creative.body,
    title: creative.headline,
    description: creative.description,
    linkUrl: creative.linkUrl,
    callToAction: creative.callToAction,
    urlParameters: creative.urlParameters,
  };

  return (
    <Card className="border-l-4 border-l-primary/50">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  Criativo {index + 1}
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    isExpanded && "rotate-180"
                  )} />
                </CardTitle>
              </Button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onDuplicate} title="Duplicar">
                <Copy className="w-4 h-4" />
              </Button>
              {canRemove && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onRemove}
                  className="text-destructive hover:text-destructive"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-2">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Left Column - Inputs */}
              <div className="space-y-4">
                {/* Headline */}
                <div className="space-y-2">
                  <Label>Título (Headline)</Label>
                  <Input
                    value={creative.headline}
                    onChange={(e) => handleChange('headline', e.target.value)}
                    placeholder="Título chamativo do anúncio"
                    maxLength={40}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {creative.headline.length}/40
                  </p>
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <Label>Texto Principal</Label>
                  <Textarea
                    value={creative.body}
                    onChange={(e) => handleChange('body', e.target.value)}
                    placeholder="Texto que acompanha o anúncio..."
                    className="min-h-[100px]"
                    maxLength={125}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {creative.body.length}/125
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    value={creative.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Descrição adicional..."
                    maxLength={30}
                  />
                </div>

                {/* Link URL */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Link de Destino
                  </Label>
                  <Input
                    value={creative.linkUrl}
                    onChange={(e) => handleChange('linkUrl', e.target.value)}
                    placeholder="https://seusite.com.br/pagina"
                    type="url"
                  />
                </div>

                {/* CTA */}
                <div className="space-y-2">
                  <Label>Botão de Ação (CTA)</Label>
                  <Select
                    value={creative.callToAction}
                    onValueChange={(value) => handleChange('callToAction', value)}
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

                {/* UTM Parameters */}
                <Collapsible open={showUtm} onOpenChange={setShowUtm}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span>Parâmetros UTM</span>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform",
                        showUtm && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">utm_source</Label>
                        <Input
                          value={creative.urlParameters.utm_source || ''}
                          onChange={(e) => handleUtmChange('utm_source', e.target.value)}
                          placeholder="facebook"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">utm_medium</Label>
                        <Input
                          value={creative.urlParameters.utm_medium || ''}
                          onChange={(e) => handleUtmChange('utm_medium', e.target.value)}
                          placeholder="cpc"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">utm_campaign</Label>
                        <Input
                          value={creative.urlParameters.utm_campaign || ''}
                          onChange={(e) => handleUtmChange('utm_campaign', e.target.value)}
                          placeholder="nome_campanha"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">utm_content</Label>
                        <Input
                          value={creative.urlParameters.utm_content || ''}
                          onChange={(e) => handleUtmChange('utm_content', e.target.value)}
                          placeholder="variante_a"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Right Column - Preview with inline controls */}
              <div className="space-y-2">
                <Label>Pré-visualização</Label>
                <div className="border rounded-lg overflow-hidden bg-muted/30">
                  {/* Preview Area */}
                  <div className="relative">
                    <FeedPreview
                      creative={previewCreative}
                      clientName={clientName}
                      clientAvatar={clientAvatar}
                    />
                    
                    {/* Remove media button when media exists */}
                    {creative.mediaUrls && creative.mediaUrls.length > 0 && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-80 hover:opacity-100"
                        onClick={handleRemoveMedia}
                        title="Remover mídia"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="p-3 border-t bg-background flex flex-wrap gap-2">
                    {/* Upload button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={isUploading}
                      asChild
                    >
                      <label className="cursor-pointer">
                        <Upload className="w-4 h-4" />
                        {isUploading ? 'Enviando...' : 'Enviar'}
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                      </label>
                    </Button>

                    {/* Generate with AI button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={handleGenerateAI}
                      disabled={isGeneratingAI}
                    >
                      <Sparkles className="w-4 h-4" />
                      {isGeneratingAI ? 'Gerando...' : 'Gerar com IA'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
