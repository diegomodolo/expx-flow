import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineBudgetInputProps {
  id: string;
  currentBudget: number;
  budgetType: "daily" | "lifetime";
  isLoading: boolean;
  disabled?: boolean;
  onSave: (newBudget: number) => void;
}

export function InlineBudgetInput({
  id,
  currentBudget,
  budgetType,
  isLoading,
  disabled = false,
  onSave,
}: InlineBudgetInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentBudget.toFixed(2));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(currentBudget.toFixed(2));
  }, [currentBudget]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && numValue !== currentBudget) {
      onSave(numValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setValue(currentBudget.toFixed(2));
      setIsEditing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Salvando...</span>
      </div>
    );
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => !disabled && setIsEditing(true)}
        disabled={disabled}
        className={cn(
          "text-sm font-medium text-left px-2 py-1 rounded-md transition-colors",
          "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        R$ {currentBudget.toFixed(2)}
        <span className="text-xs text-muted-foreground ml-1">
          /{budgetType === "daily" ? "dia" : "total"}
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">R$</span>
      <Input
        ref={inputRef}
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-24 h-7 text-sm"
      />
    </div>
  );
}
