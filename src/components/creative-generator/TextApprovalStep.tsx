import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Edit3, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreativeTextValidator } from "./CreativeTextValidator";

interface TextApprovalStepProps {
  text: string;
  onTextApproved: (approvedText: string) => void;
  creativeType: string;
}

export function TextApprovalStep({ text, onTextApproved, creativeType }: TextApprovalStepProps) {
  const [currentText, setCurrentText] = useState(text);
  const [isValidating, setIsValidating] = useState(false);
  const [hasBeenValidated, setHasBeenValidated] = useState(false);
  const { toast } = useToast();

  // Validações de texto obrigatórias
  const validateTextContent = (text: string): { isValid: boolean; error?: string } => {
    if (!text.trim()) {
      return { isValid: false, error: "O texto não pode estar vazio" };
    }

    // Verificar se tem caracteres especiais problemáticos
    const problematicChars = /[^\p{L}\p{N}\p{P}\p{Z}\p{S}]/gu;
    if (problematicChars.test(text)) {
      return { isValid: false, error: "O texto contém caracteres especiais que podem causar problemas na renderização" };
    }

    // Verificar comprimento por tipo de criativo
    const maxLengths: Record<string, number> = {
      'instagram-stories': 80,
      'instagram-feed': 120,
      'facebook-ad': 150,
      'youtube-thumbnail': 60,
      'website-banner': 100
    };

    const maxLength = maxLengths[creativeType] || 200;
    if (text.length > maxLength) {
      return { 
        isValid: false, 
        error: `O texto é muito longo para ${creativeType}. Máximo: ${maxLength} caracteres. Atual: ${text.length}` 
      };
    }

    // Verificar se contém palavras em inglês comuns (básico)
    const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi;
    if (englishWords.test(text)) {
      return { isValid: false, error: "O texto contém palavras em inglês. Use apenas português brasileiro." };
    }

    return { isValid: true };
  };

  const handleValidateGrammar = async () => {
    if (!currentText.trim()) {
      toast({
        title: "Erro",
        description: "Digite um texto para validar",
        variant: "destructive"
      });
      return;
    }

    // Validação prévia obrigatória
    const preValidation = validateTextContent(currentText);
    if (!preValidation.isValid) {
      toast({
        title: "Erro de Validação",
        description: preValidation.error,
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-text-grammar', {
        body: { text: currentText }
      });

      if (error) throw error;

      if (data.hasChanges) {
        setCurrentText(data.correctedText);
        toast({
          title: "Texto Corrigido",
          description: "Foram encontrados e corrigidos alguns erros de português",
        });
      } else {
        toast({
          title: "Texto Aprovado",
          description: "O texto está correto gramaticalmente",
        });
      }
      
      setHasBeenValidated(true);
    } catch (error) {
      console.error('Error validating grammar:', error);
      toast({
        title: "Erro na Validação",
        description: "Não foi possível validar o texto. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleApproveText = () => {
    // Validação final obrigatória antes da aprovação
    const validation = validateTextContent(currentText);
    if (!validation.isValid) {
      toast({
        title: "Erro de Validação",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    // Verificar se foi validado gramaticalmente
    if (!hasBeenValidated) {
      toast({
        title: "Validação Obrigatória",
        description: "É obrigatório validar a gramática antes de aprovar o texto",
        variant: "destructive"
      });
      return;
    }

    onTextApproved(currentText);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Aprovação do Texto</h3>
        <p className="text-muted-foreground">
          Revise e aprove o texto que será inserido na imagem. Este texto será usado EXATAMENTE como está.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Texto do Criativo - {creativeType}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={currentText}
            onChange={(e) => {
              setCurrentText(e.target.value);
              setHasBeenValidated(false);
            }}
            placeholder="Digite o texto que aparecerá na imagem..."
            className="min-h-[120px] text-base"
          />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              Este texto aparecerá EXATAMENTE como está escrito na imagem gerada
            </div>
            
            <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
              <strong>Validação obrigatória:</strong> É necessário validar a gramática antes de aprovar o texto
            </div>
            
            {currentText && (
              <CreativeTextValidator text={currentText} creativeType={creativeType} />
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleValidateGrammar}
              disabled={isValidating || !currentText.trim()}
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Validar Gramática
                </>
              )}
            </Button>

            <Button
              onClick={handleApproveText}
              disabled={!currentText.trim() || !hasBeenValidated}
              className="bg-primary hover:bg-primary/90"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprovar e Gerar Imagem
            </Button>
          </div>

          {hasBeenValidated && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              Texto validado e pronto para uso
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <h4 className="font-medium mb-2">Preview do Texto:</h4>
          <div className="p-3 bg-background rounded border">
            <pre className="whitespace-pre-wrap text-sm font-medium">
              {currentText || "Digite o texto acima para ver o preview..."}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}