import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StudioSlide } from "./types";
import { Copy, RefreshCw } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  slides: StudioSlide[];
}

export function CaptionModal({ open, onOpenChange, projectId, slides }: Props) {
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generate = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-carousel-caption",
        {
          body: {
            project_id: projectId,
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
      setCaption(data.caption ?? "");
      setHashtags(
        Array.isArray(data.hashtags)
          ? data.hashtags.join(" ")
          : (data.hashtags ?? ""),
      );
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao gerar legenda");
    } finally {
      setIsLoading(false);
    }
  };

  const copyAll = () => {
    const text = hashtags ? `${caption}\n\n${hashtags}` : caption;
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  // Gerar automaticamente ao abrir (apenas se ainda não gerou)
  useEffect(() => {
    if (open && !caption && !isLoading) {
      generate();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Legenda + Hashtags</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            Gerando legenda...
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              value={hashtags ? `${caption}\n\n${hashtags}` : caption}
              onChange={(e) => {
                const val = e.target.value;
                const parts = val.split("\n\n");
                setCaption(parts[0] ?? "");
                setHashtags(parts.slice(1).join("\n\n") ?? "");
              }}
              className="min-h-[160px] text-sm"
              placeholder="Cole aqui na legenda do Instagram..."
            />
            <p className="text-xs text-muted-foreground">
              Cole diretamente na legenda do Instagram. Edite conforme
              necessário.
            </p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={copyAll}>
                <Copy className="w-4 h-4 mr-2" /> Copiar tudo
              </Button>
              <Button variant="outline" onClick={generate} disabled={isLoading}>
                <RefreshCw className="w-4 h-4 mr-2" /> Regerar com IA
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
