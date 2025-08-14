import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionCategoryProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: "analysis" | "content" | "report" | "strategy" | "contextual";
}

const variantStyles = {
  analysis: "text-blue-600 dark:text-blue-400",
  content: "text-green-600 dark:text-green-400", 
  report: "text-purple-600 dark:text-purple-400",
  strategy: "text-orange-600 dark:text-orange-400",
  contextual: "text-pink-600 dark:text-pink-400",
};

export function ActionCategory({ 
  title, 
  icon, 
  children, 
  defaultOpen = false,
  variant = "analysis"
}: ActionCategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <div className={cn("flex items-center gap-2", variantStyles[variant])}>
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
      </button>
      
      {isOpen && (
        <div className="mt-2 space-y-2 pl-6">
          {children}
        </div>
      )}
    </div>
  );
}