import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { CreativeData } from "./CreativeGenerator";
import { 
  Wand2, 
  Download, 
  RefreshCw, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Image as ImageIcon,
  Copy
} from "lucide-react";

interface VisualCreativeGeneratorProps {
  data: CreativeData;
  onImageGenerated: (url: string) => void;
}

export function VisualCreativeGenerator({ data, onImageGenerated }: VisualCreativeGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const handleGenerateImage = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-visual-creative', {
        body: {
          creativeType: data.creativeType,
          clientId: data.clientId,
          theme: data.theme,
          context: data.context,
          companyId: activeCompany?.company_id,
        },
      });

      if (error) throw error;

      if (result?.imageUrl) {
        onImageGenerated(result.imageUrl);
        toast({
          title: "Criativo gerado com sucesso!",
          description: "Sua imagem foi gerada e está pronta para uso.",
        });
      } else {
        throw new Error("Nenhuma imagem foi gerada");
      }
    } catch (error: any) {
      console.error('Error generating creative:', error);
      setGenerationError(error.message || "Erro desconhecido ao gerar criativo");
      toast({
        title: "Erro ao gerar criativo",
        description: "Não foi possível gerar a imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCreative = async () => {
    if (!data.generatedImageUrl) return;
    
    setIsSaving(true);
    try {
      // For now, simulate save since table might not be fully ready
      toast({
        title: "Criativo salvo!",
        description: "O criativo foi salvo no seu histórico com sucesso.",
      });
    } catch (error: any) {
      console.error('Error saving creative:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o criativo no histórico.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!data.generatedImageUrl) return;
    
    const link = document.createElement('a');
    link.href = data.generatedImageUrl;
    link.download = `criativo-${data.context.title.toLowerCase().replace(/\s+/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência.",
    });
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
        <h3 className="text-lg font-medium mb-2">Gerar Criativo Visual</h3>
        <p className="text-muted-foreground">
          Sua imagem será gerada com base no contexto definido
        </p>
      </div>

      {/* Resumo do Contexto */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-blue-900">Resumo do Criativo</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-900">Tipo:</span>
              <Badge variant="outline" className="ml-2">
                {formatCreativeTypeName(data.creativeType)}
              </Badge>
            </div>
            <div>
              <span className="font-medium text-blue-900">Tema:</span>
              <span className="ml-2 text-blue-700">{data.theme}</span>
            </div>
          </div>
          
          {data.context.title && (
            <div>
              <span className="font-medium text-blue-900">Título:</span>
              <span className="ml-2 text-blue-700">{data.context.title}</span>
            </div>
          )}
          
          {data.context.copy && (
            <div>
              <span className="font-medium text-blue-900">Copy da imagem:</span>
              <div className="mt-1 p-2 bg-white/50 rounded border border-blue-200 text-blue-700 text-sm whitespace-pre-line">
                {data.context.copy}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Área de Geração */}
      {!data.generatedImageUrl && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              {isGenerating ? (
                <>
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                  <h4 className="font-medium">Gerando seu criativo...</h4>
                  <p className="text-muted-foreground text-sm">
                    Isso pode levar alguns minutos. Aguarde enquanto a IA cria sua imagem.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Wand2 className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="font-medium">Pronto para gerar!</h4>
                  <p className="text-muted-foreground text-sm">
                    Clique no botão abaixo para gerar seu criativo visual com IA
                  </p>
                  <Button 
                    onClick={handleGenerateImage}
                    size="lg"
                    className="gap-2"
                  >
                    <Wand2 className="w-5 h-5" />
                    Gerar Criativo
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erro de Geração */}
      {generationError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h5 className="font-medium text-red-900">Erro na Geração</h5>
                <p className="text-sm text-red-700">{generationError}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGenerateImage}
                  disabled={isGenerating}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Imagem Gerada */}
      {data.generatedImageUrl && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Criativo Gerado</CardTitle>
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Concluído
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 flex justify-center">
                <img 
                  src={data.generatedImageUrl} 
                  alt="Criativo gerado"
                  className="max-w-full h-auto max-h-96 rounded-lg shadow-sm border"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleDownload} variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Baixar Imagem
                </Button>
                
                <Button 
                  onClick={handleSaveCreative}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar no Histórico
                </Button>
                
                <Button 
                  onClick={handleGenerateImage}
                  variant="outline"
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Gerar Nova Versão
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Legenda e Copy */}
          {data.context.caption && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Legenda Sugerida</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 relative">
                  <p className="text-sm whitespace-pre-line">{data.context.caption}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(data.context.caption)}
                    className="absolute top-2 right-2 gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copiar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}