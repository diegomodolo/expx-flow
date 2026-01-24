import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineStatusToggleProps {
  id: string;
  isActive: boolean;
  isLoading: boolean;
  disabled?: boolean;
  onToggle: (newStatus: boolean) => void;
}

export function InlineStatusToggle({
  id,
  isActive,
  isLoading,
  disabled = false,
  onToggle,
}: InlineStatusToggleProps) {
  return (
    <div className="flex items-center gap-2">
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <Switch
          checked={isActive}
          onCheckedChange={onToggle}
          disabled={disabled || isLoading}
          className={cn(
            "data-[state=checked]:bg-green-500",
            "data-[state=unchecked]:bg-muted"
          )}
        />
      )}
      <span
        className={cn(
          "text-xs font-medium",
          isActive ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
        )}
      >
        {isActive ? "ON" : "OFF"}
      </span>
    </div>
  );
}
