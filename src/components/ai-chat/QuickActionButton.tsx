import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionButtonProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  variant?: "analysis" | "content" | "report" | "strategy" | "contextual";
}

const variantStyles = {
  analysis: "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-200",
  content: "border-green-200 bg-green-50 hover:bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-950 dark:hover:bg-green-900 dark:text-green-200",
  report: "border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:hover:bg-purple-900 dark:text-purple-200",
  strategy: "border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:hover:bg-orange-900 dark:text-orange-200",
  contextual: "border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-800 dark:border-pink-800 dark:bg-pink-950 dark:hover:bg-pink-900 dark:text-pink-200",
};

export function QuickActionButton({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  disabled = false,
  variant = "analysis"
}: QuickActionButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left h-auto p-3 border-2 transition-all duration-200",
              variantStyles[variant],
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={onClick}
            disabled={disabled}
          >
            <div className="flex items-start gap-3">
              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {title}
                </div>
              </div>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="text-sm">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}