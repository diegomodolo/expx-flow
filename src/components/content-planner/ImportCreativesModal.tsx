import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image as ImageIcon, Check } from "lucide-react";

interface Creative {
  id: string;
  image_url: string | null;
  caption: string | null;
  status: string;
  created_at: string;
}

interface ImportCreativesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onImport: (creatives: { image_url: string; caption: string }[]) => Promise<void>;
}

export function ImportCreativesModal({
  open,
  onOpenChange,
  clientId,
  onImport,
}: ImportCreativesModalProps) {
  const { activeCompany } = useCompany();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const { data: creatives, isLoading } = useQuery({
    queryKey: ["import-creatives", clientId, activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id || !clientId) return [];

      const { data, error } = await supabase
        .from("creative_generation_queue")
        .select("id, image_url, caption, status, created_at")
        .eq("client_id", clientId)
        .eq("company_id", activeCompany.company_id)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Creative[];
    },
    enabled: open && !!activeCompany?.company_id && !!clientId,
  });

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!creatives) return;
    if (selectedIds.size === creatives.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(creatives.map((c) => c.id)));
    }
  };

  const handleImport = async () => {
    if (!creatives || selectedIds.size === 0) return;

    setIsImporting(true);
    try {
      const selectedCreatives = creatives
        .filter((c) => selectedIds.has(c.id))
        .map((c) => ({
          image_url: c.image_url || "",
          caption: c.caption || "",
        }));

      await onImport(selectedCreatives);
      setSelectedIds(new Set());
      onOpenChange(false);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Criativos da Fábrica</DialogTitle>
          <DialogDescription>
            Selecione os criativos que deseja importar para o planejamento de conteúdo.
            Apenas criativos em aberto ou aprovados são exibidos.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : creatives && creatives.length > 0 ? (
          <>
            <div className="flex items-center justify-between py-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-sm"
              >
                {selectedIds.size === creatives.length ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
              <Badge variant="outline">
                {selectedIds.size} de {creatives.length} selecionados
              </Badge>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
                {creatives.map((creative) => {
                  const isSelected = selectedIds.has(creative.id);
                  return (
                    <div
                      key={creative.id}
                      className={`relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleToggle(creative.id)}
                    >
                      {/* Aspect ratio 3:4 container */}
                      <div className="aspect-[3/4] bg-muted relative">
                        {creative.image_url ? (
                          <img
                            src={creative.image_url}
                            alt="Creative"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                        )}

                        {/* Selection overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-6 h-6 text-primary-foreground" />
                            </div>
                          </div>
                        )}

                        {/* Checkbox */}
                        <div className="absolute top-2 right-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggle(creative.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-background/80"
                          />
                        </div>

                        {/* Status badge */}
                        <div className="absolute bottom-2 left-2">
                          <Badge
                            variant={creative.status === "approved" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {creative.status === "approved" ? "Aprovado" : "Em aberto"}
                          </Badge>
                        </div>
                      </div>

                      {/* Caption preview */}
                      {creative.caption && (
                        <div className="p-2 bg-background">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {creative.caption}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhum criativo disponível
            </h3>
            <p className="text-sm text-muted-foreground">
              Não há criativos em aberto ou aprovados para este cliente.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedIds.size === 0 || isImporting}
            className="gap-2"
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Importar {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
