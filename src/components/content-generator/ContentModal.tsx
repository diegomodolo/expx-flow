import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { ClientStep } from "./ClientStep";
import { ThemeStep } from "./ThemeStep";
import { ResultStep } from "./ResultStep";
import { ContentType } from "./ContentTypes";
import { X } from "lucide-react";

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: ContentType;
}

export interface GenerationData {
  clientId: string;
  theme: string;
  generatedContent?: string;
}

export function ContentModal({ isOpen, onClose, contentType }: ContentModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<GenerationData>({
    clientId: "",
    theme: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleNext = () => {
    if (currentStep < 3) {
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
      clientId: "",
      theme: "",
    });
    setIsGenerating(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const updateData = (key: keyof GenerationData, value: string) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const canProceedFromStep1 = data.clientId !== "";
  const canProceedFromStep2 = data.theme !== "";

  const steps = [
    { number: 1, title: "Cliente", completed: canProceedFromStep1 },
    { number: 2, title: "Tema", completed: canProceedFromStep2 },
    { number: 3, title: "Resultado", completed: !!data.generatedContent },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ zIndex: 50 }}>
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{contentType.icon}</span>
              {contentType.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {contentType.description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          <Stepper steps={steps} currentStep={currentStep} />

          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <ClientStep
                selectedClientId={data.clientId}
                onClientSelect={(clientId) => updateData("clientId", clientId)}
              />
            )}

            {currentStep === 2 && (
              <ThemeStep
                clientId={data.clientId}
                contentType={contentType}
                selectedTheme={data.theme}
                onThemeSelect={(theme) => updateData("theme", theme)}
              />
            )}

            {currentStep === 3 && (
              <ResultStep
                contentType={contentType}
                data={data}
                isGenerating={isGenerating}
                setIsGenerating={setIsGenerating}
                onContentGenerated={(content) => updateData("generatedContent", content)}
              />
            )}
          </div>

          <div className="flex justify-between border-t pt-4">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  Voltar
                </Button>
              )}
            </div>

            <div className="space-x-2">
              {currentStep < 3 && (
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && !canProceedFromStep1) ||
                    (currentStep === 2 && !canProceedFromStep2)
                  }
                >
                  Próximo
                </Button>
              )}

              {currentStep === 3 && (
                <Button variant="outline" onClick={handleReset}>
                  Nova Geração
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}