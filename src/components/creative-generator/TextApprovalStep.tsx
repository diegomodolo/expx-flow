import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Edit3, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const handleValidateGrammar = async () => {
    if (!currentText.trim()) {
      toast({
        title: "Erro",
        description: "Digite um texto para validar",
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
    if (!currentText.trim()) {
      toast({
        title: "Erro",
        description: "O texto não pode estar vazio",
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
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            Este texto aparecerá EXATAMENTE como está escrito na imagem gerada
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
              disabled={!currentText.trim()}
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