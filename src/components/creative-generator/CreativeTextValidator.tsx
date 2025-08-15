import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

interface CreativeTextValidatorProps {
  text: string;
  creativeType: string;
}

export function CreativeTextValidator({ text, creativeType }: CreativeTextValidatorProps) {
  const validateText = (text: string, creativeType: string) => {
    const results = [];
    
    // Verificar comprimento por tipo
    const maxLengths: Record<string, number> = {
      'instagram-stories': 80,
      'instagram-feed': 120,
      'facebook-ad': 150,
      'youtube-thumbnail': 60,
      'website-banner': 100,
      'whatsapp-business': 100,
      'linkedin-post': 150
    };

    const maxLength = maxLengths[creativeType] || 200;
    
    if (text.length > maxLength) {
      results.push({
        type: 'error',
        message: `Texto muito longo para ${creativeType}. Máximo: ${maxLength} caracteres. Atual: ${text.length}`
      });
    } else if (text.length > maxLength * 0.8) {
      results.push({
        type: 'warning',
        message: `Texto próximo ao limite para ${creativeType}. ${text.length}/${maxLength} caracteres`
      });
    }

    // Verificar palavras em inglês
    const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by|get|buy|now|best|free|new|sale|offer)\b/gi;
    if (englishWords.test(text)) {
      results.push({
        type: 'error',
        message: 'Texto contém palavras em inglês. Use apenas português brasileiro.'
      });
    }

    // Verificar caracteres especiais problemáticos
    const problematicChars = /[^\p{L}\p{N}\p{P}\p{Z}\p{S}]/gu;
    if (problematicChars.test(text)) {
      results.push({
        type: 'error',
        message: 'Texto contém caracteres especiais que podem causar problemas'
      });
    }

    // Verificar se há muitas quebras de linha (problema para alguns tipos)
    const lineBreaks = (text.match(/\n/g) || []).length;
    if (lineBreaks > 3 && ['instagram-stories', 'youtube-thumbnail'].includes(creativeType)) {
      results.push({
        type: 'warning',
        message: 'Muitas quebras de linha podem prejudicar a legibilidade em ' + creativeType
      });
    }

    // Verificar se há texto muito fragmentado
    if (text.split(/\s+/).length > 15 && ['instagram-stories', 'youtube-thumbnail'].includes(creativeType)) {
      results.push({
        type: 'warning',
        message: 'Muito texto pode ser difícil de ler em ' + creativeType
      });
    }

    return results;
  };

  const validationResults = validateText(text, creativeType);
  const hasErrors = validationResults.some(r => r.type === 'error');
  const hasWarnings = validationResults.some(r => r.type === 'warning');

  if (validationResults.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          Texto validado e adequado para {creativeType}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      {validationResults.map((result, index) => (
        <Alert 
          key={index}
          className={
            result.type === 'error' 
              ? "border-red-200 bg-red-50" 
              : "border-yellow-200 bg-yellow-50"
          }
        >
          {result.type === 'error' ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : (
            <Info className="h-4 w-4 text-yellow-600" />
          )}
          <AlertDescription className={
            result.type === 'error' ? "text-red-700" : "text-yellow-700"
          }>
            {result.message}
          </AlertDescription>
        </Alert>
      ))}
      
      <div className="flex gap-2 mt-2">
        <Badge variant={hasErrors ? "destructive" : hasWarnings ? "secondary" : "default"}>
          {hasErrors ? "Requer correção" : hasWarnings ? "Atenção" : "Validado"}
        </Badge>
        <Badge variant="outline">
          {text.length} caracteres
        </Badge>
      </div>
    </div>
  );
}