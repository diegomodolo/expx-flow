import { useState } from "react";
import { Tag, Plus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { WhatsAppLabel, getLabelColor, useWhatsAppLabels } from "@/hooks/useWhatsAppLabels";

interface WhatsAppLabelPickerProps {
  phone: string;
  currentLabelIds: string[];
  companyId: string | undefined;
  instanceId: string | null;
  onLabelsChange?: (labelIds: string[]) => void;
}

export function WhatsAppLabelPicker({
  phone,
  currentLabelIds,
  companyId,
  instanceId,
  onLabelsChange,
}: WhatsAppLabelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingLabelId, setLoadingLabelId] = useState<string | null>(null);
  
  const { labels, isLoading, addLabelToChat, removeLabelFromChat } = useWhatsAppLabels(companyId, instanceId);

  const handleToggleLabel = async (label: WhatsAppLabel) => {
    const isSelected = currentLabelIds.includes(label.id);
    setLoadingLabelId(label.id);

    try {
      let success: boolean;
      if (isSelected) {
        success = await removeLabelFromChat(phone, label.id);
        if (success) {
          onLabelsChange?.(currentLabelIds.filter(id => id !== label.id));
        }
      } else {
        success = await addLabelToChat(phone, label.id);
        if (success) {
          onLabelsChange?.([...currentLabelIds, label.id]);
        }
      }
    } finally {
      setLoadingLabelId(null);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Gerenciar etiquetas"
        >
          <Tag className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">
            Etiquetas
          </p>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : labels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma etiqueta disponível
            </p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {labels.map((label) => {
                const isSelected = currentLabelIds.includes(label.id);
                const colorInfo = getLabelColor(label.color);
                const isLoadingThis = loadingLabelId === label.id;

                return (
                  <button
                    key={label.id}
                    onClick={() => handleToggleLabel(label)}
                    disabled={loadingLabelId !== null}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                      "hover:bg-muted/50",
                      isSelected && "bg-muted"
                    )}
                  >
                    <div
                      className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: colorInfo.bg }}
                    >
                      {isLoadingThis ? (
                        <Loader2 className="h-3 w-3 animate-spin" style={{ color: colorInfo.text }} />
                      ) : isSelected ? (
                        <Check className="h-3 w-3" style={{ color: colorInfo.text }} />
                      ) : null}
                    </div>
                    <span className="flex-1 text-left truncate">{label.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
