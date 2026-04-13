import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Save,
  CalendarPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CarouselStyle } from "./types";

interface Props {
  style: CarouselStyle;
  onStyleChange: (s: CarouselStyle) => void;
  slideIndex: number;
  slidesTotal: number;
  onPrev: () => void;
  onNext: () => void;
  onOpenCaption: () => void;
  onOpenRegenerate: () => void;
  onOpenSendToPlan: () => void;
  onSave: () => Promise<void>;
}

export function StudioTopBar({
  style,
  onStyleChange,
  slideIndex,
  slidesTotal,
  onPrev,
  onNext,
  onOpenCaption,
  onOpenRegenerate,
  onOpenSendToPlan,
  onSave,
}: Props) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
      toast.success("Carrossel salvo!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-card flex-shrink-0">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs hover:text-foreground gap-1"
          onClick={() => navigate("/geradores/carrosseis")}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <div className="w-px h-4 bg-border" />

        {(["minimalist", "profile"] as CarouselStyle[]).map((s) => (
          <button
            key={s}
            onClick={() => onStyleChange(s)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              style === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {s === "minimalist" ? "Minimalista" : "Profile"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <button
          onClick={onPrev}
          disabled={slideIndex === 0}
          className="disabled:opacity-30 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        Slide {slideIndex + 1} de {slidesTotal}
        <button
          onClick={onNext}
          disabled={slideIndex === slidesTotal - 1}
          className="disabled:opacity-30 hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs hover:text-foreground"
          onClick={onOpenRegenerate}
        >
          <Sparkles className="w-4 h-4 mr-1" />
          Prompt IA
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs hover:text-foreground"
          onClick={onOpenCaption}
        >
          <FileText className="w-4 h-4 mr-1" />
          Legenda
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs hover:text-foreground"
          onClick={onOpenSendToPlan}
        >
          <CalendarPlus className="w-4 h-4 mr-1" />
          Enviar ao Planejamento
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        <Button
          size="sm"
          className="text-xs gap-1"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
