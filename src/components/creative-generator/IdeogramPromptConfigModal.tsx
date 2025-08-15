import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, RefreshCw, Save, X, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIdeogramPrompt } from "@/hooks/useIdeogramPrompt";

interface IdeogramPromptConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IdeogramPromptConfigModal({ open, onOpenChange }: IdeogramPromptConfigModalProps) {
  const { 
    prompt, 
    loading, 
    savePrompt, 
    resetPrompt, 
    getFinalPrompt, 
    isCustomized, 
    defaultPrompt 
  } = useIdeogramPrompt();
  
  const [editingPrompt, setEditingPrompt] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (open) {
      setEditingPrompt(getFinalPrompt());
      setValidationError("");
    }
  }, [open, getFinalPrompt]);

  const validatePrompt = (promptText: string) => {
    if (promptText.trim().length < 100) {
      return "O prompt deve ter pelo menos 100 caracteres.";
    }
    
    if (!promptText.includes('{textToUse}')) {
      return "O prompt deve conter a variável {textToUse}.";
    }
    
    return "";
  };

  const handleSave = async () => {
    const error = validatePrompt(editingPrompt);
    if (error) {
      setValidationError(error);
      return;
    }
    
    await savePrompt(editingPrompt);
    onOpenChange(false);
  };

  const handleReset = async () => {
    await resetPrompt();
    setEditingPrompt(defaultPrompt);
    setValidationError("");
  };

  const availableVariables = [
    "{textToUse}",
    "{clientName}",
    "{sectorContext}",
    "{audienceContext}",
    "{theme}",
    "{creativeType}",
    "{clientBriefing}"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configuração do Prompt Ideogram
            {isCustomized() && (
              <Badge variant="secondary">Personalizado</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Personalize o prompt usado para gerar criativos visuais com IA. O prompt padrão será usado se nenhuma personalização for definida.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Editor do Prompt */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="space-y-2 mb-4">
              <Label htmlFor="prompt-editor">Prompt Personalizado</Label>
              <div className="text-sm text-muted-foreground">
                Caracteres: {editingPrompt.length} / mínimo 100
              </div>
            </div>
            
            <Textarea
              id="prompt-editor"
              value={editingPrompt}
              onChange={(e) => {
                setEditingPrompt(e.target.value);
                setValidationError("");
              }}
              placeholder="Digite seu prompt personalizado..."
              className="flex-1 min-h-[300px] font-mono text-sm resize-none"
            />
            
            {validationError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 mt-4">
              <Button 
                onClick={handleSave} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Personalização
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={loading || !isCustomized()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Resetar para Padrão
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
            </div>
          </div>

          {/* Painel de Ajuda */}
          <div className="w-80 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Variáveis Disponíveis
                  </h4>
                  <div className="space-y-1">
                    {availableVariables.map((variable) => (
                      <Badge 
                        key={variable} 
                        variant="outline" 
                        className="mr-1 mb-1 font-mono cursor-pointer"
                        onClick={() => {
                          const textarea = document.getElementById('prompt-editor') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const newValue = editingPrompt.substring(0, start) + variable + editingPrompt.substring(end);
                            setEditingPrompt(newValue);
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(start + variable.length, start + variable.length);
                            }, 0);
                          }
                        }}
                      >
                        {variable}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Clique para inserir no prompt
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Dicas Importantes</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• A variável {"{textToUse}"} é obrigatória</li>
                    <li>• Mínimo de 100 caracteres</li>
                    <li>• Use instruções claras para controle de texto</li>
                    <li>• Inclua contexto visual relevante</li>
                    <li>• Mantenha regras de formatação</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Prompt Padrão</h4>
                  <div className="bg-muted p-3 rounded-md">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                      {defaultPrompt.substring(0, 200)}...
                    </pre>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este é o prompt usado quando não há personalização
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}