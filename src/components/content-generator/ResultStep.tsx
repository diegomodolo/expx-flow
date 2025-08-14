import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Copy, Save, Plus, RefreshCw, Sparkles } from "lucide-react";
import { ContentType } from "./ContentTypes";
import { GenerationData } from "./ContentModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";

interface ResultStepProps {
  contentType: ContentType;
  data: GenerationData;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  onContentGenerated: (content: string) => void;
}

export function ResultStep({ 
  contentType, 
  data, 
  isGenerating, 
  setIsGenerating, 
  onContentGenerated 
}: ResultStepProps) {
  const [editedContent, setEditedContent] = useState("");
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  useEffect(() => {
    if (!data.generatedContent && data.clientId && data.theme) {
      generateContent();
    }
  }, [data.clientId, data.theme]);

  useEffect(() => {
    if (data.generatedContent) {
      setEditedContent(data.generatedContent);
    }
  }, [data.generatedContent]);

  const generateContent = async () => {
    if (!data.clientId || !data.theme || !activeCompany) {
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-content-ai', {
        body: {
          contentType: contentType.id,
          clientId: data.clientId,
          theme: data.theme,
          companyId: activeCompany.company_id
        }
      });

      if (error) {
        console.error('Error generating content:', error);
        toast({
          title: "Erro ao gerar conteúdo",
          description: "Tente novamente em alguns segundos.",
          variant: "destructive",
        });
        return;
      }

      if (result?.content) {
        onContentGenerated(result.content);
        toast({
          title: "Conteúdo gerado com sucesso!",
          description: "O conteúdo foi criado usando IA.",
        });
      } else {
        throw new Error("Nenhum conteúdo foi retornado");
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao gerar conteúdo",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      toast({
        title: "Conteúdo copiado!",
        description: "O conteúdo foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o conteúdo.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!user || !activeCompany || !data.clientId) {
      toast({
        title: "Erro ao salvar",
        description: "Dados de usuário não encontrados.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('content_generations')
        .insert({
          user_id: user.id,
          company_id: activeCompany.company_id,
          client_id: data.clientId,
          content_type: contentType.id,
          theme: data.theme,
          generated_content: editedContent,
          status: 'saved'
        });

      if (error) {
        console.error('Error saving content:', error);
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar o conteúdo.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Conteúdo salvo!",
        description: "O conteúdo foi salvo como rascunho.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao salvar",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = () => {
    onContentGenerated("");
    setEditedContent("");
    generateContent();
  };

  if (isGenerating) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Gerando conteúdo...</h3>
          <p className="text-muted-foreground text-center">
            Nossa IA está criando conteúdo personalizado baseado no cliente e tema selecionados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generation Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-primary">Conteúdo Gerado</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{contentType.title}</Badge>
            <Badge variant="outline">{data.theme}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Generated Content */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span>Resultado</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isGenerating}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="O conteúdo gerado aparecerá aqui..."
            className="min-h-[300px] resize-none"
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCopy} variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
            
            <Button onClick={handleSave} variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Salvar como Rascunho
            </Button>
            
            <Button variant="outline" disabled>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar à Campanha
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Você pode editar o conteúdo acima antes de copiá-lo ou salvá-lo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}