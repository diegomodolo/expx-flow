import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Loader2 } from "lucide-react";

interface ThemeSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  themeSuggestions: string[];
  isLoading: boolean;
  onSelectTheme: (theme: string) => void;
}

export function ThemeSelectorModal({
  open,
  onOpenChange,
  themeSuggestions,
  isLoading,
  onSelectTheme,
}: ThemeSelectorModalProps) {
  const [selectedOption, setSelectedOption] = useState<string>("custom");
  const [customTheme, setCustomTheme] = useState("");

  const handleConfirm = () => {
    const theme = selectedOption === "custom" ? customTheme.trim() : selectedOption;
    if (theme) {
      onSelectTheme(theme);
    }
  };

  const canConfirm = selectedOption === "custom" 
    ? customTheme.trim().length > 0 
    : selectedOption.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Escolha o Tema
          </DialogTitle>
          <DialogDescription>
            A IA analisou as imagens do carrossel de referência.
            Escolha um tema para gerar o novo conteúdo:
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">
              Analisando imagens...
            </span>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <RadioGroup
              value={selectedOption}
              onValueChange={setSelectedOption}
              className="space-y-3"
            >
              {themeSuggestions.map((theme, index) => (
                <Label
                  key={index}
                  htmlFor={`theme-${index}`}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedOption === theme
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <RadioGroupItem
                    value={theme}
                    id={`theme-${index}`}
                    className="mt-0.5"
                  />
                  <span className="text-sm">{theme}</span>
                </Label>
              ))}

              <Label
                htmlFor="theme-custom"
                className={`flex flex-col gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedOption === "custom"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem
                    value="custom"
                    id="theme-custom"
                    className="mt-0.5"
                  />
                  <span className="text-sm font-medium">Tema personalizado</span>
                </div>
                {selectedOption === "custom" && (
                  <Input
                    value={customTheme}
                    onChange={(e) => setCustomTheme(e.target.value)}
                    placeholder="Digite seu tema aqui..."
                    className="mt-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </Label>
            </RadioGroup>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Conteúdo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
