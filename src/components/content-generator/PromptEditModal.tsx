import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, Save, Eye } from "lucide-react";
import { useContentPrompts } from "@/hooks/useContentPrompts";

// Default prompts from the edge function
const defaultPrompts: Record<string, string> = {
  "copy-anuncio": "Crie um copy persuasivo para anúncio pago com foco no tema '${theme}'. Considere o contexto do cliente: ${clientContext}. Use técnicas de copywriting, gatilhos mentais e inclua uma CTA clara.",
  "legenda-instagram": "Crie uma legenda envolvente para Instagram sobre '${theme}' considerando o contexto: ${clientContext}. Use emojis estratégicos, hashtags relevantes e tom de voz adequado ao público.",
  "post-linkedin": "Desenvolva um post profissional para LinkedIn sobre '${theme}' baseado no contexto: ${clientContext}. Mantenha tom profissional, agregue valor e incentive engajamento.",
  "script-video": "Escreva um roteiro para vídeo de 60-90 segundos sobre '${theme}' considerando: ${clientContext}. Estruture com gancho inicial, desenvolvimento e CTA final.",
  "email-marketing": "Crie um email marketing persuasivo sobre '${theme}' para o contexto: ${clientContext}. Inclua assunto atrativo, corpo envolvente e CTA clara.",
  "prompt-gpt4": "Crie um prompt otimizado para GPT-4 gerar conteúdo sobre '${theme}' no contexto: ${clientContext}. O prompt deve ser claro, específico e incluir instruções detalhadas para maximizar a qualidade do output.",
  "prompt-midjourney": "Gere um prompt técnico para Midjourney criar imagens sobre '${theme}' baseado em: ${clientContext}. Inclua estilo visual, composição, iluminação, parâmetros técnicos (--ar, --v, --style) e palavras-chave específicas.",
  "prompt-dalle": "Desenvolva um prompt detalhado para DALL-E sobre '${theme}' considerando: ${clientContext}. Seja específico sobre estilo, cores, composição, elementos visuais e atmosfera desejada.",
  "prompt-veo3": "Crie um prompt completo para Veo 3 (Google) gerar vídeo sobre '${theme}' baseado em: ${clientContext}. Inclua descrição da cena, movimentos de câmera, estilo visual, duração e elementos específicos.",
  "prompt-runwayml": "Desenvolva um prompt para RunwayML sobre '${theme}' considerando: ${clientContext}. Especifique tipo de edição/geração, estilo visual, transições e efeitos desejados.",
  "prompt-elevenlabs": "Crie instruções para ElevenLabs sobre '${theme}' baseado em: ${clientContext}. Inclua tom de voz, emoção, velocidade, sotaque e estilo de leitura apropriado.",
  "prompt-pika": "Gere um prompt para Pika Labs sobre '${theme}' considerando: ${clientContext}. Especifique estilo de animação, transições, efeitos visuais e atmosfera do vídeo.",
  "prompt-leonardo": "Desenvolva um prompt para Leonardo AI sobre '${theme}' baseado em: ${clientContext}. Inclua estilo artístico, técnica, paleta de cores e elementos compositivos específicos.",
  "prompt-kaiber": "Crie um prompt para Kaiber sobre '${theme}' considerando: ${clientContext}. Especifique estilo de transformação, ritmo, efeitos visuais e sincronização com música.",
  "prompt-canva": "Desenvolva sugestões para Canva Magic Write sobre '${theme}' baseado em: ${clientContext}. Inclua tipo de design, elementos visuais, copy e estilo adequado.",
  "prompt-notion": "Crie prompts para Notion AI sobre '${theme}' considerando: ${clientContext}. Especifique tipo de documento, estrutura, seções e formato de organização desejado."
};

interface PromptEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: any;
}

export function PromptEditModal({ isOpen, onClose, contentType }: PromptEditModalProps) {
  const { savePrompt, resetPrompt, getPromptForContentType } = useContentPrompts();
  const [customPrompt, setCustomPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const defaultPrompt = defaultPrompts[contentType?.id] || "Prompt padrão não encontrado";
  const currentCustomPrompt = getPromptForContentType(contentType?.id);

  useEffect(() => {
    if (contentType) {
      setCustomPrompt(currentCustomPrompt || "");
    }
  }, [contentType, currentCustomPrompt]);

  const handleSave = async () => {
    if (!contentType) return;

    try {
      setIsSaving(true);
      await savePrompt(contentType.id, customPrompt, defaultPrompt);
      onClose();
    } catch (error) {
      console.error('Error saving prompt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!contentType) return;

    try {
      setIsResetting(true);
      await resetPrompt(contentType.id);
      setCustomPrompt("");
      onClose();
    } catch (error) {
      console.error('Error resetting prompt:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const getPreviewPrompt = () => {
    const promptToPreview = customPrompt.trim() || defaultPrompt;
    return promptToPreview
      .replace('${theme}', '[SEU_TEMA]')
      .replace('${clientContext}', '[CONTEXTO_DO_CLIENTE]');
  };

  if (!contentType) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-xl">{contentType.icon}</span>
            <div>
              <div className="font-semibold">{contentType.title}</div>
              <div className="text-sm text-muted-foreground font-normal">
                {contentType.description}
              </div>
            </div>
            {currentCustomPrompt && (
              <Badge variant="default">Customizado</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Editar</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Prompt Padrão */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Prompt Padrão</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={defaultPrompt}
                    readOnly
                    className="h-32 text-sm bg-muted text-muted-foreground resize-none"
                  />
                </CardContent>
              </Card>

              {/* Prompt Customizado */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Prompt Customizado</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Digite seu prompt customizado aqui... (deixe vazio para usar o padrão)"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="h-32 text-sm resize-none"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Variáveis disponíveis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Variáveis Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="font-mono">
                    ${'{theme}'}
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    ${'{clientContext}'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use essas variáveis no seu prompt. Elas serão substituídas automaticamente
                  pelos dados do cliente e tema selecionados.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview do Prompt Final</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={getPreviewPrompt()}
                  readOnly
                  className="h-48 text-sm bg-muted text-muted-foreground resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Este é o prompt que será enviado para a IA. As variáveis serão substituídas
                  pelos valores reais no momento da geração.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div>
            {currentCustomPrompt && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isResetting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isResetting ? "Resetando..." : "Resetar para Padrão"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}