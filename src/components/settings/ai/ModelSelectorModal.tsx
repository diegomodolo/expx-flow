import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star, Search, Loader2 } from "lucide-react";
import { useOpenRouterModels } from "@/hooks/useOpenRouterModels";
import { useAIFavoriteModels } from "@/hooks/useAIFavoriteModels";
import { cn } from "@/lib/utils";

interface ModelSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (modelId: string) => void;
  selectedModelId?: string;
  title?: string;
}

function getProviderFromId(modelId: string): string {
  return modelId.split("/")[0] || "unknown";
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (num === 0) return "Grátis";
  return `$${(num * 1_000_000).toFixed(2)}/M`;
}

export function ModelSelectorModal({
  open,
  onOpenChange,
  onSelect,
  selectedModelId,
  title = "Selecionar Modelo",
}: ModelSelectorModalProps) {
  const { models, isLoading } = useOpenRouterModels();
  const { favorites, toggleFavorite } = useAIFavoriteModels();
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string | null>(null);

  const providers = useMemo(() => {
    const set = new Set(models.map((m) => getProviderFromId(m.id)));
    return Array.from(set).sort();
  }, [models]);

  const filteredModels = useMemo(() => {
    let result = models;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
      );
    }

    if (providerFilter) {
      result = result.filter((m) => getProviderFromId(m.id) === providerFilter);
    }

    // Favoritos no topo
    result.sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 0 : 1;
      const bFav = favorites.includes(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [models, search, providerFilter, favorites]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!grid-rows-[auto_1fr] max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Provider filters */}
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <Badge
              variant={providerFilter === null ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setProviderFilter(null)}
            >
              Todos
            </Badge>
            {providers.map((p) => (
              <Badge
                key={p}
                variant={providerFilter === p ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() =>
                  setProviderFilter(p === providerFilter ? null : p)
                }
              >
                {p}
              </Badge>
            ))}
          </div>

          {/* Models list */}
          <div className="overflow-y-auto min-h-0 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredModels.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">
                Nenhum modelo encontrado
              </p>
            ) : (
              <div className="space-y-1">
                {filteredModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      onSelect(model.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      "hover:bg-muted/50",
                      selectedModelId === model.id &&
                        "bg-primary/10 ring-1 ring-primary",
                    )}
                  >
                    {/* Favorite */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite.mutate(model.id);
                      }}
                      className="shrink-0"
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          favorites.includes(model.id)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground",
                        )}
                      />
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {model.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {model.id}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {model.context_length
                          ? `${(model.context_length / 1000).toFixed(0)}k ctx`
                          : "—"}
                      </p>
                      {model.pricing && (
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(model.pricing.prompt)} in
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
