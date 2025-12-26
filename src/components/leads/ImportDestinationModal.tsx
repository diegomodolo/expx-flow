import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Users, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ImportDestinationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (destinations: { cnaePool: boolean; segmentId: string | null }) => void;
  companyId: string;
  isImporting?: boolean;
  selectedCount: number;
}

export function ImportDestinationModal({
  open,
  onOpenChange,
  onConfirm,
  companyId,
  isImporting = false,
  selectedCount,
}: ImportDestinationModalProps) {
  const [importToCnae, setImportToCnae] = useState(true);
  const [importToSegment, setImportToSegment] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  const { data: segments = [] } = useQuery({
    queryKey: ["lead-segments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_segments")
        .select("id, name, segment_type")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && open,
  });

  const handleConfirm = () => {
    if (!importToCnae && !importToSegment) return;
    onConfirm({
      cnaePool: importToCnae,
      segmentId: importToSegment ? selectedSegmentId : null,
    });
  };

  const canConfirm = importToCnae || (importToSegment && selectedSegmentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escolha o destino da importação</DialogTitle>
          <DialogDescription>
            Selecione onde deseja importar os {selectedCount} leads selecionados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Option 1: CNAE Pool */}
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
            <Checkbox
              id="cnae-pool"
              checked={importToCnae}
              onCheckedChange={(checked) => setImportToCnae(checked === true)}
            />
            <div className="flex-1">
              <Label htmlFor="cnae-pool" className="flex items-center gap-2 cursor-pointer font-medium">
                <Database className="h-4 w-4 text-primary" />
                Base CNAE (Pool de Leads)
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Leads são adicionados ao pool geral por código CNAE
              </p>
            </div>
          </div>

          {/* Option 2: Custom Segment */}
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
            <Checkbox
              id="segment"
              checked={importToSegment}
              onCheckedChange={(checked) => {
                setImportToSegment(checked === true);
                if (!checked) setSelectedSegmentId(null);
              }}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="segment" className="flex items-center gap-2 cursor-pointer font-medium">
                <Users className="h-4 w-4 text-primary" />
                Segmento Personalizado
              </Label>
              <p className="text-sm text-muted-foreground">
                Leads são atribuídos a um segmento existente
              </p>
              
              {importToSegment && (
                <Select
                  value={selectedSegmentId || ""}
                  onValueChange={setSelectedSegmentId}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione um segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((seg) => (
                      <SelectItem key={seg.id} value={seg.id}>
                        {seg.name}
                        {seg.segment_type && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            ({seg.segment_type})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              `Importar ${selectedCount} leads`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
