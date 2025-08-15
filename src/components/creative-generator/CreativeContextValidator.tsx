import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText, Target, Users, MessageSquare, Quote } from "lucide-react";

interface CreativeContext {
  title: string;
  description: string;
  objective: string;
  targetAudience: string;
  copy: string;
  caption: string;
}

interface CreativeContextValidatorProps {
  context: CreativeContext;
  onContextUpdate: <K extends keyof CreativeContext>(key: K, value: CreativeContext[K]) => void;
}

export function CreativeContextValidator({ context, onContextUpdate }: CreativeContextValidatorProps) {
  const completedFields = Object.values(context).filter(value => value.trim() !== "").length;
  const totalFields = Object.keys(context).length;
  const completionPercentage = Math.round((completedFields / totalFields) * 100);

  const fieldConfigs = [
    {
      key: "title" as keyof CreativeContext,
      label: "Título/Headline",
      placeholder: "Ex: Black Friday 2024 - Até 50% OFF",
      icon: FileText,
      description: "Título principal que aparecerá no criativo",
      required: true,
    },
    {
      key: "description" as keyof CreativeContext,
      label: "Descrição da Peça",
      placeholder: "Ex: Criativo promocional para Black Friday destacando descontos em produtos premium",
      icon: FileText,
      description: "Descrição detalhada do que o criativo deve comunicar",
      multiline: true,
      required: true,
    },
    {
      key: "objective" as keyof CreativeContext,
      label: "Objetivo do Criativo",
      placeholder: "Ex: Aumentar vendas durante Black Friday, gerar leads, aumentar awareness",
      icon: Target,
      description: "Qual o objetivo principal desta peça",
      required: true,
    },
    {
      key: "targetAudience" as keyof CreativeContext,
      label: "Público-alvo Específico",
      placeholder: "Ex: Mulheres 25-45 anos, classe B/C, interessadas em moda",
      icon: Users,
      description: "Público específico para este criativo (pode ser diferente do cliente geral)",
      required: false,
    },
    {
      key: "copy" as keyof CreativeContext,
      label: "Copy da Imagem",
      placeholder: "Ex: BLACK FRIDAY\\n50% OFF\\nCompre agora!",
      icon: Quote,
      description: "Texto que deve aparecer na imagem (máximo 3-4 linhas)",
      multiline: true,
      required: true,
    },
    {
      key: "caption" as keyof CreativeContext,
      label: "Legenda Sugerida",
      placeholder: "Ex: 🔥 BLACK FRIDAY chegou! Corre que é só até domingo! #BlackFriday #Promoção",
      icon: MessageSquare,
      description: "Legenda para acompanhar o post nas redes sociais",
      multiline: true,
      required: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium mb-2">Validar Contexto Criativo</h3>
          <p className="text-muted-foreground">
            Revise e aprove o contexto antes de gerar a imagem
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
            {completionPercentage}% completo
          </Badge>
          {completionPercentage === 100 && (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {fieldConfigs.map((field) => {
          const Icon = field.icon;
          const value = context[field.key];
          const isCompleted = value.trim() !== "";
          
          return (
            <Card 
              key={field.key} 
              className={cn(
                "transition-all duration-200",
                isCompleted ? "border-green-200 bg-green-50/50" : "border-border"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn(
                    "w-4 h-4",
                    isCompleted ? "text-green-600" : "text-muted-foreground"
                  )} />
                  <CardTitle className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </CardTitle>
                  {isCompleted && (
                    <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {field.description}
                </p>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <Label htmlFor={field.key} className="sr-only">
                    {field.label}
                  </Label>
                  
                  {field.multiline ? (
                    <Textarea
                      id={field.key}
                      placeholder={field.placeholder}
                      value={value}
                      onChange={(e) => onContextUpdate(field.key, e.target.value)}
                      rows={field.key === "copy" ? 4 : 3}
                      className={cn(
                        "resize-none",
                        isCompleted && "border-green-300 focus:border-green-400"
                      )}
                    />
                  ) : (
                    <Input
                      id={field.key}
                      placeholder={field.placeholder}
                      value={value}
                      onChange={(e) => onContextUpdate(field.key, e.target.value)}
                      className={cn(
                        isCompleted && "border-green-300 focus:border-green-400"
                      )}
                    />
                  )}
                  
                  {field.key === "copy" && (
                    <p className="text-xs text-muted-foreground">
                      💡 Use \\n para quebras de linha. Mantenha o texto conciso para melhor legibilidade.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {completionPercentage > 60 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <h5 className="font-medium text-blue-900">Contexto quase pronto!</h5>
                <p className="text-sm text-blue-700">
                  {completionPercentage === 100 
                    ? "Todos os campos estão preenchidos. Você pode prosseguir para a geração da imagem."
                    : `Complete os campos obrigatórios restantes para prosseguir.`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {completionPercentage < 50 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <h5 className="font-medium text-yellow-900">Mais informações necessárias</h5>
                <p className="text-sm text-yellow-700">
                  Preencha pelo menos os campos obrigatórios (*) para gerar um criativo de qualidade.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}