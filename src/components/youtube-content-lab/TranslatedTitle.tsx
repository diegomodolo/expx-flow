import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Languages, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TranslatedTitleProps {
  title: string;
  className?: string;
  showIcon?: boolean;
}

export function TranslatedTitle({ title, className, showIcon = true }: TranslatedTitleProps) {
  const { translateText, getTranslation, isTranslating, needsTranslation } = useTranslation();
  const [attempted, setAttempted] = useState(false);

  const isEnglish = needsTranslation(title);
  const translation = getTranslation(title);
  const loading = isTranslating(title);

  useEffect(() => {
    if (isEnglish && !translation && !attempted) {
      setAttempted(true);
      translateText(title);
    }
  }, [title, isEnglish, translation, attempted, translateText]);

  if (!isEnglish) {
    return (
      <span className={className} title={title}>
        {title}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      {/* Original title */}
      <div className={cn("flex items-start gap-1.5", className)} title={title}>
        <span className="line-clamp-2">{title}</span>
      </div>
      
      {/* Translation */}
      {loading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Traduzindo...</span>
        </div>
      ) : translation ? (
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
          {showIcon && <Languages className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />}
          <span className="italic line-clamp-2">{translation}</span>
        </div>
      ) : null}
    </div>
  );
}
