import { getLabelColor, WhatsAppLabel } from "@/hooks/useWhatsAppLabels";
import { cn } from "@/lib/utils";

interface WhatsAppLabelBadgeProps {
  label: WhatsAppLabel;
  size?: "sm" | "md";
  onRemove?: () => void;
}

export function WhatsAppLabelBadge({ label, size = "sm", onRemove }: WhatsAppLabelBadgeProps) {
  const colorInfo = getLabelColor(label.color);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
      style={{ 
        backgroundColor: colorInfo.bg, 
        color: colorInfo.text 
      }}
    >
      {label.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:opacity-70"
        >
          ×
        </button>
      )}
    </span>
  );
}

interface WhatsAppLabelListProps {
  labels: WhatsAppLabel[];
  maxVisible?: number;
  size?: "sm" | "md";
}

export function WhatsAppLabelList({ labels, maxVisible = 2, size = "sm" }: WhatsAppLabelListProps) {
  if (labels.length === 0) return null;

  const visibleLabels = labels.slice(0, maxVisible);
  const hiddenCount = labels.length - maxVisible;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visibleLabels.map((label) => (
        <WhatsAppLabelBadge key={label.id} label={label} size={size} />
      ))}
      {hiddenCount > 0 && (
        <span className={cn(
          "text-muted-foreground",
          size === "sm" ? "text-xs" : "text-sm"
        )}>
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
