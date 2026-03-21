import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, X, BarChart3 } from "lucide-react";

interface WhatsAppPollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (question: string, options: string[], allowMultiple: boolean) => void;
  isSending: boolean;
}

export function WhatsAppPollDialog({
  open,
  onOpenChange,
  onSend,
  isSending,
}: WhatsAppPollDialogProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      resetForm();
    }
    onOpenChange(value);
  };

  const handleAddOption = () => {
    if (options.length < 12) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const filteredOptions = options.filter((opt) => opt.trim() !== "");
  const canSend =
    question.trim() !== "" && filteredOptions.length >= 2 && !isSending;

  const handleSend = () => {
    if (!canSend) return;
    onSend(question.trim(), filteredOptions, allowMultiple);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Nova Enquete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="poll-question">Pergunta</Label>
            <Input
              id="poll-question"
              placeholder="Digite sua pergunta..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Opções</Label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`Opção ${index + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                  />
                  <Button aria-label="Remover opção" type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                    disabled={options.length <= 2}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              disabled={options.length >= 12}
              className="mt-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar opção
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="allow-multiple"
              checked={allowMultiple}
              onCheckedChange={setAllowMultiple}
            />
            <Label htmlFor="allow-multiple" className="cursor-pointer">
              Permitir múltiplas respostas
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Enviar Enquete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
