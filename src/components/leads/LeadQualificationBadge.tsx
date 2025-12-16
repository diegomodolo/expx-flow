import { cn } from "@/lib/utils";
import { Medal, Trophy, Award, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type LeadClassification = 'ouro' | 'prata' | 'bronze' | 'descartado' | null;

interface LeadQualificationBadgeProps {
  classification: LeadClassification;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  reason?: string;
}

const classificationConfig = {
  ouro: {
    label: 'Ouro',
    icon: Trophy,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    iconColor: 'text-amber-500',
    borderColor: 'border-amber-300 dark:border-amber-700',
  },
  prata: {
    label: 'Prata',
    icon: Medal,
    bgColor: 'bg-slate-100 dark:bg-slate-800/50',
    textColor: 'text-slate-700 dark:text-slate-300',
    iconColor: 'text-slate-400',
    borderColor: 'border-slate-300 dark:border-slate-600',
  },
  bronze: {
    label: 'Bronze',
    icon: Award,
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    iconColor: 'text-orange-500',
    borderColor: 'border-orange-300 dark:border-orange-700',
  },
  descartado: {
    label: 'Descartado',
    icon: Trash2,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    iconColor: 'text-red-500',
    borderColor: 'border-red-300 dark:border-red-700',
  },
};

const sizeConfig = {
  sm: {
    padding: 'px-2 py-0.5',
    text: 'text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    padding: 'px-3 py-1.5',
    text: 'text-base',
    icon: 'w-5 h-5',
  },
};

export function LeadQualificationBadge({
  classification,
  score,
  showScore = false,
  size = 'md',
  reason,
}: LeadQualificationBadgeProps) {
  if (!classification) {
    return (
      <span className={cn(
        "inline-flex items-center rounded-full border",
        "bg-muted text-muted-foreground border-border",
        sizeConfig[size].padding,
        sizeConfig[size].text
      )}>
        Não classificado
      </span>
    );
  }

  const config = classificationConfig[classification];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const badge = (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-medium",
      config.bgColor,
      config.textColor,
      config.borderColor,
      sizeStyles.padding,
      sizeStyles.text
    )}>
      <Icon className={cn(sizeStyles.icon, config.iconColor)} />
      <span>{config.label}</span>
      {showScore && score !== undefined && (
        <span className="opacity-70">({score})</span>
      )}
    </span>
  );

  if (reason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
