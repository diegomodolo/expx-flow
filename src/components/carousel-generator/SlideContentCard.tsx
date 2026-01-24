import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X, Play } from "lucide-react";

export interface SlideContent {
  slideNumber: number;
  type: string;
  headline: string;
  bodyText: string;
  visualDescription: string;
}

interface SlideContentCardProps {
  imageUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  thumbnailUrl?: string;
  content: SlideContent;
  onContentChange: (content: SlideContent) => void;
}

const TYPE_LABELS: Record<string, string> = {
  cover: "Capa",
  list_item: "Lista",
  tip: "Dica",
  question: "Pergunta",
  statistic: "Estatística",
  cta: "CTA",
  quote: "Citação",
  comparison: "Comparação",
  step: "Passo",
  conclusion: "Conclusão",
};

const TYPE_COLORS: Record<string, string> = {
  cover: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  list_item: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  tip: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  question: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  statistic: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  cta: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  quote: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  comparison: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  step: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  conclusion: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
};

export function SlideContentCard({
  imageUrl,
  mediaType,
  thumbnailUrl,
  content,
  onContentChange,
}: SlideContentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleSave = () => {
    onContentChange(editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const typeLabel = TYPE_LABELS[content.type] || content.type;
  const typeColor = TYPE_COLORS[content.type] || "bg-muted text-muted-foreground";

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Image */}
      <div className="relative w-full aspect-square rounded-md overflow-hidden border bg-muted">
        {mediaType === "VIDEO" ? (
          <div className="relative w-full h-full">
            <img
              src={thumbnailUrl || imageUrl}
              alt={`Slide ${content.slideNumber}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="w-6 h-6 text-white" />
            </div>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={`Slide ${content.slideNumber}`}
            className="w-full h-full object-cover"
          />
        )}
        {/* Slide number badge */}
        <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
          {content.slideNumber}
        </div>
      </div>

      {/* Content Card */}
      <div className="rounded-md border bg-card p-2 space-y-2">
        {/* Type Badge */}
        <Badge variant="secondary" className={`text-[10px] ${typeColor}`}>
          {typeLabel}
        </Badge>

        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editedContent.headline}
              onChange={(e) => setEditedContent({ ...editedContent, headline: e.target.value })}
              className="h-7 text-xs"
              placeholder="Headline"
            />
            <Textarea
              value={editedContent.bodyText}
              onChange={(e) => setEditedContent({ ...editedContent, bodyText: e.target.value })}
              className="min-h-[80px] text-xs resize-y"
              placeholder="Texto complementar"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleSave}
              >
                <Check className="w-3 h-3 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleCancel}
              >
                <X className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium line-clamp-2">
              {content.headline || "—"}
            </p>
            {content.bodyText && (
              <p className="text-[10px] text-muted-foreground line-clamp-2">
                {content.bodyText}
              </p>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-full text-[10px] gap-1"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="w-3 h-3" />
              Editar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
