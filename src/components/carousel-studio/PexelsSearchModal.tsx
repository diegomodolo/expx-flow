import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ExternalLink, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PexelsPhoto {
  id: number;
  photographer: string;
  alt: string;
  url_page: string;
  thumb: string;
  large: string;
  original: string;
  width: number;
  height: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string | null;
  initialQuery?: string;
  orientation?: "landscape" | "portrait" | "square";
  onSelect: (photo: PexelsPhoto) => void;
}

export function PexelsSearchModal({
  open,
  onOpenChange,
  companyId,
  initialQuery,
  orientation,
  onSelect,
}: Props) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery ?? "");
      setPhotos([]);
      setSelectedId(null);
      setHasSearched(false);
    }
  }, [open, initialQuery]);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Digite algo para buscar");
      return;
    }
    if (!companyId) {
      toast.error("Empresa não identificada");
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "search-pexels-photos",
        {
          body: {
            company_id: companyId,
            query: query.trim(),
            per_page: 24,
            orientation,
          },
        },
      );
      if (error) {
        let msg = error.message;
        try {
          const ctx = error as { context?: Response };
          if (ctx.context) {
            const body = await ctx.context.json();
            msg = body?.error ?? msg;
          }
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      if (!data?.success)
        throw new Error(data?.error || "Erro ao buscar fotos");
      setPhotos(data.photos as PexelsPhoto[]);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao buscar no Pexels");
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const p = photos.find((x) => x.id === selectedId);
    if (!p) return;
    onSelect(p);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Buscar foto no Pexels</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Ex: marketing digital, café, escritório..."
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : photos.length === 0 && hasSearched ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhuma foto encontrada. Tente outro termo.
            </div>
          ) : photos.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Digite um termo e clique em Buscar.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {photos.map((p) => {
                const isSelected = selectedId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`relative group aspect-square rounded overflow-hidden border-2 transition-all ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-border"
                    }`}
                  >
                    <img
                      src={p.thumb}
                      alt={p.alt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                      <p className="text-[10px] text-white truncate">
                        © {p.photographer}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t gap-2">
          <a
            href="https://www.pexels.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Fotos por Pexels
            <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedId}>
              Usar foto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
