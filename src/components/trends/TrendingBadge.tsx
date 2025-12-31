import React from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendingBadgeProps {
  interest?: number;
  isHot?: boolean;
  className?: string;
  showValue?: boolean;
}

export function TrendingBadge({ 
  interest = 0, 
  isHot = false, 
  className,
  showValue = true 
}: TrendingBadgeProps) {
  if (interest === 0 && !isHot) return null;

  const getVariant = () => {
    if (isHot || interest >= 80) return "destructive";
    if (interest >= 50) return "default";
    return "secondary";
  };

  const getIcon = () => {
    if (isHot || interest >= 80) {
      return <Flame className="w-3 h-3" />;
    }
    return <TrendingUp className="w-3 h-3" />;
  };

  const getLabel = () => {
    if (isHot) return "Em Alta";
    if (interest >= 80) return "Muito Popular";
    if (interest >= 50) return "Popular";
    return "Tendência";
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={cn("gap-1 text-xs", className)}
    >
      {getIcon()}
      {getLabel()}
      {showValue && interest > 0 && (
        <span className="ml-0.5 opacity-80">{interest}%</span>
      )}
    </Badge>
  );
}
