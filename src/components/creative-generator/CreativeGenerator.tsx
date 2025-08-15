import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { CreativeTypeSelector } from "./CreativeTypeSelector";
import { ClientSelectorForCreatives } from "./ClientSelectorForCreatives";
import { ReferenceUploader } from "./ReferenceUploader";
import { ThemeSuggestionGenerator } from "./ThemeSuggestionGenerator";
import { CreativeContextValidator } from "./CreativeContextValidator";
import { VisualCreativeGenerator } from "./VisualCreativeGenerator";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface CreativeData {
  creativeType: string;
  clientId: string;
  references: File[];
  theme: string;
  context: {
    title: string;
    description: string;
    objective: string;
    targetAudience: string;
    copy: string;
    caption: string;
  };
  generatedImageUrl?: string;
}

export function CreativeGenerator() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<CreativeData>({
    creativeType: "",
    clientId: "",
    references: [],
    theme: "",
    context: {
      title: "",
      description: "",
      objective: "",
      targetAudience: "",
      copy: "",
      caption: "",
    },
  });

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setData({
      creativeType: "",
      clientId: "",
      references: [],
      theme: "",
      context: {
        title: "",
        description: "",
        objective: "",
        targetAudience: "",
        copy: "",
        caption: "",
      },
    });
  };

  const updateData = <K extends keyof CreativeData>(key: K, value: CreativeData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const updateContext = <K extends keyof CreativeData["context"]>(
    key: K, 
    value: CreativeData["context"][K]
  ) => {
    setData(prev => ({
      ...prev,
      context: { ...prev.context, [key]: value }
    }));
  };

  const canProceedFromStep1 = data.creativeType !== "";
  const canProceedFromStep2 = data.clientId !== "";
  const canProceedFromStep3 = true; // References are optional
  const canProceedFromStep4 = data.theme !== "";
  const canProceedFromStep5 = Object.values(data.context).some(value => value !== "");

  const steps = [
    { number: 1, title: "Tipo de Criativo", completed: canProceedFromStep1 },
    { number: 2, title: "Cliente", completed: canProceedFromStep2 },
    { number: 3, title: "Referências", completed: canProceedFromStep3 },
    { number: 4, title: "Tema", completed: canProceedFromStep4 },
    { number: 5, title: "Contexto", completed: canProceedFromStep5 },
    { number: 6, title: "Gerar", completed: !!data.generatedImageUrl },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Novo Criativo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Stepper steps={steps} currentStep={currentStep} />

        <div className="min-h-[500px]">
          {currentStep === 1 && (
            <CreativeTypeSelector
              selectedType={data.creativeType}
              onTypeSelect={(type) => updateData("creativeType", type)}
            />
          )}

          {currentStep === 2 && (
            <ClientSelectorForCreatives
              selectedClientId={data.clientId}
              onClientSelect={(clientId) => updateData("clientId", clientId)}
            />
          )}

          {currentStep === 3 && (
            <ReferenceUploader
              references={data.references}
              onReferencesChange={(files) => updateData("references", files)}
            />
          )}

          {currentStep === 4 && (
            <ThemeSuggestionGenerator
              clientId={data.clientId}
              creativeType={data.creativeType}
              references={data.references}
              selectedTheme={data.theme}
              onThemeSelect={(theme) => updateData("theme", theme)}
            />
          )}

          {currentStep === 5 && (
            <CreativeContextValidator
              context={data.context}
              onContextUpdate={updateContext}
              theme={data.theme}
              clientId={data.clientId}
              creativeType={data.creativeType}
            />
          )}

          {currentStep === 6 && (
            <VisualCreativeGenerator
              data={data}
              onImageGenerated={(url) => updateData("generatedImageUrl", url)}
            />
          )}
        </div>

        <div className="flex justify-between border-t pt-4">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            )}
          </div>

          <div className="space-x-2">
            {currentStep < 6 && (
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !canProceedFromStep1) ||
                  (currentStep === 2 && !canProceedFromStep2) ||
                  (currentStep === 4 && !canProceedFromStep4)
                }
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {currentStep === 6 && data.generatedImageUrl && (
              <Button variant="outline" onClick={handleReset}>
                Novo Criativo
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}