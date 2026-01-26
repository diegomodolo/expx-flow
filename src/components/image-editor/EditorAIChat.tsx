import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, 
  ImagePlus, 
  Sparkles, 
  Palette, 
  Image as ImageIcon, 
  LayoutGrid, 
  Wand2,
  Loader2,
  X,
} from 'lucide-react';
import { AIMessage } from './hooks/useImageEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface EditorAIChatProps {
  messages: AIMessage[];
  isProcessing: boolean;
  currentImageUrl: string;
  onSendMessage: (message: string, imageUrl?: string) => void;
  onImageGenerated: (newImageUrl: string) => void;
  clientId: string;
  companyId: string;
}

const quickActions = [
  { label: 'Mudar cores', icon: Palette, prompt: 'Altere o esquema de cores da imagem mantendo o layout e elementos principais' },
  { label: 'Mudar fundo', icon: ImageIcon, prompt: 'Substitua o fundo da imagem por algo mais adequado e profissional' },
  { label: 'Melhorar layout', icon: LayoutGrid, prompt: 'Melhore a composição e balanceamento visual da imagem' },
  { label: 'Aprimorar', icon: Wand2, prompt: 'Melhore a qualidade geral da imagem, ajustando cores, contraste e nitidez' },
];

export const EditorAIChat: React.FC<EditorAIChatProps> = ({
  messages,
  isProcessing,
  currentImageUrl,
  onSendMessage,
  onImageGenerated,
  clientId,
  companyId,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!inputValue.trim() && !attachedImage) return;
    
    const messageText = inputValue.trim();
    const imageToMerge = attachedImage;
    
    setInputValue('');
    setAttachedImage(null);
    
    onSendMessage(messageText, imageToMerge || undefined);
    
    await generateWithAI(messageText, imageToMerge || undefined);
  };

  const generateWithAI = async (prompt: string, additionalImage?: string) => {
    if (!currentImageUrl) {
      toast({
        title: 'Erro',
        description: 'Nenhuma imagem para editar',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
        body: {
          creativeType: 'instagram_feed',
          clientId,
          companyId,
          theme: 'Edição de imagem',
          context: {
            title: '',
            description: '',
            copy: '',
            contextOnly: {
              isEditingExisting: true,
              hasMergeImage: !!additionalImage,
            }
          },
          references: [currentImageUrl],
          extraPrompt: prompt,
          additionalImageToMerge: additionalImage,
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onImageGenerated(data.imageUrl);
        onSendMessage(`✅ Imagem editada com sucesso!`, data.imageUrl);
      } else {
        throw new Error('Nenhuma imagem gerada');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: 'Erro na geração',
        description: 'Não foi possível processar a edição. Tente novamente.',
        variant: 'destructive',
      });
      onSendMessage('❌ Erro ao processar a edição. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    onSendMessage(prompt);
    generateWithAI(prompt);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-[350px] bg-card border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-primary">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Assistente de Edição</h3>
            <p className="text-xs text-muted-foreground">Descreva as alterações desejadas</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-border">
        <p className="text-xs text-muted-foreground mb-2">Ações rápidas:</p>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => handleQuickAction(action.prompt)}
              disabled={isGenerating || isProcessing}
            >
              <action.icon className="h-3 w-3 mr-1" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>Descreva as alterações que deseja fazer na imagem ou use as ações rápidas acima.</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    <Sparkles className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p>{message.content}</p>
                {message.imageUrl && (
                  <img
                    src={message.imageUrl}
                    alt="Attached"
                    className="mt-2 rounded max-w-full max-h-32 object-cover"
                  />
                )}
              </div>
            </div>
          ))}
          
          {(isGenerating || isProcessing) && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando edição...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Attached Image Preview */}
      {attachedImage && (
        <div className="px-4 py-2 border-t border-border">
          <div className="relative inline-block">
            <img
              src={attachedImage}
              alt="Attached"
              className="h-16 w-16 object-cover rounded"
            />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Imagem para mesclar</p>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating || isProcessing}
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva a alteração..."
            disabled={isGenerating || isProcessing}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={(!inputValue.trim() && !attachedImage) || isGenerating || isProcessing}
          >
            {isGenerating || isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
    </div>
  );
};
