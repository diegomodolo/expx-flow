// src/components/carousel-studio/sections/CaptionSection.tsx
import { useState, useEffect, useRef } from "react";
import { SidebarSection } from "../SidebarSection";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StudioSlide, StudioProject } from "../types";

interface Props {
  project: StudioProject;
  slides: StudioSlide[];
  onChange: (patch: Partial<StudioProject>) => void;
}

export function CaptionSection({ project, slides, onChange }: Props) {
  const [caption, setCaption] = useState(project.caption ?? "");
  const [hashtags, setHashtags] = useState(project.hashtags ?? "");
  const [isGenerating, setIsGenerating] = useState(false);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const hashtagsRef = useRef<HTMLTextAreaElement>(null);

  // Sincroniza com mudanças externas somente quando o campo não está focado
  useEffect(() => {
    if (document.activeElement !== captionRef.current) {
      setCaption(project.caption ?? "");
    }
  }, [project.caption]);

  useEffect(() => {
    if (document.activeElement !== hashtagsRef.current) {
      setHashtags(project.hashtags ?? "");
    }
  }, [project.hashtags]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-carousel-caption",
        {
          body: {
            project_id: project.id,
            slides: slides.map((s) => ({
              headline: s.headline,
              subtitle: s.subtitle,
            })),
          },
        },
      );
      if (error) throw error;
      if (!data?.success)
        throw new Error(data?.error || "Falha ao gerar legenda");
      const newCaption = data.caption ?? "";
      const newHashtags = Array.isArray(data.hashtags)
        ? data.hashtags.join(" ")
        : (data.hashtags ?? "");
      setCaption(newCaption);
      setHashtags(newHashtags);
      onChange({ caption: newCaption, hashtags: newHashtags || null });
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao gerar legenda");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const text = hashtags ? `${caption}\n\n${hashtags}` : caption;
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <SidebarSection title="Legenda + Hashtags">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Legenda</Label>
        <Textarea
          ref={captionRef}
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
            onChange({ caption: e.target.value || null });
          }}
          className="bg-background border-border text-foreground text-sm min-h-[100px] resize-none"
          placeholder="Legenda do post no Instagram..."
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Hashtags</Label>
        <Textarea
          ref={hashtagsRef}
          value={hashtags}
          onChange={(e) => {
            setHashtags(e.target.value);
            onChange({ hashtags: e.target.value || null });
          }}
          className="bg-background border-border text-foreground text-sm min-h-[60px] resize-none"
          placeholder="#marketing #carrossel..."
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          <RefreshCw
            className={`w-3 h-3 mr-1 ${isGenerating ? "animate-spin" : ""}`}
          />
          {isGenerating ? "Gerando..." : "Gerar com IA"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={handleCopy}
          disabled={!caption}
        >
          <Copy className="w-3 h-3 mr-1" />
          Copiar
        </Button>
      </div>
    </SidebarSection>
  );
}
