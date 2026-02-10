import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Plus, X, Loader2, DatabaseIcon, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ImportFromBaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  segment: {
    id: string;
    name: string;
    cnaes: string[];
  };
}

interface LeadPreview {
  id: string;
  full_name: string | null;
  company_name: string | null;
  cnae_code: string | null;
  cnae_description: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  lead_classification: string | null;
  global_score: number | null;
}

interface CnaeSummary {
  cnae: string;
  count: number;
}

export const ImportFromBaseModal = ({ open, onOpenChange, companyId, segment }: ImportFromBaseModalProps) => {
  const queryClient = useQueryClient();
  const [cnaes, setCnaes] = useState<string[]>(segment.cnaes || []);
  const [cnaeInput, setCnaeInput] = useState("");
  const [leads, setLeads] = useState<LeadPreview[]>([]);
  const [totalMatching, setTotalMatching] = useState(0);
  const [alreadyAssigned, setAlreadyAssigned] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [cnaeSummary, setCnaeSummary] = useState<CnaeSummary[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchLeads = useCallback(async () => {
    if (cnaes.length === 0) {
      setLeads([]);
      setTotalMatching(0);
      setAlreadyAssigned(0);
      setCnaeSummary([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const cnaeFilters = cnaes.map(c => `cnae_code.eq.${c}`).join(",");

      // Get count and preview leads
      const { data, error, count } = await supabase
        .from("lead_master_pool")
        .select("id, full_name, company_name, cnae_code, cnae_description, email, phone, city, state, lead_classification, global_score", { count: "exact" })
        .eq("company_id", companyId)
        .or(cnaeFilters)
        .order("global_score", { ascending: false })
        .limit(50);

      if (error) throw error;

      setLeads(data || []);
      setTotalMatching(count || 0);

      // Calculate CNAE summary
      if (count && count > 0) {
        const summaryMap = new Map<string, number>();
        // For accurate counts per CNAE, query each
        for (const cnae of cnaes) {
          const { count: cnaeCount } = await supabase
            .from("lead_master_pool")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("cnae_code", cnae);
          summaryMap.set(cnae, cnaeCount || 0);
        }
        setCnaeSummary(Array.from(summaryMap.entries()).map(([cnae, cnt]) => ({ cnae, count: cnt })));
      } else {
        setCnaeSummary(cnaes.map(c => ({ cnae: c, count: 0 })));
      }

      // Check how many are already assigned
      const allIds = data?.map(l => l.id) || [];
      if (allIds.length > 0) {
        const { data: existing } = await supabase
          .from("lead_segment_assignments")
          .select("lead_id")
          .eq("segment_id", segment.id)
          .in("lead_id", allIds);
        setAlreadyAssigned(existing?.length || 0);
      } else {
        setAlreadyAssigned(0);
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
      toast.error("Erro ao buscar leads da base");
    } finally {
      setIsLoading(false);
    }
  }, [cnaes, companyId, segment.id]);

  // Fetch on open
  useEffect(() => {
    if (open) {
      setCnaes(segment.cnaes || []);
      setHasSearched(false);
    }
  }, [open, segment.cnaes]);

  useEffect(() => {
    if (open && cnaes.length > 0) {
      fetchLeads();
    }
  }, [open]); // Only auto-fetch on open

  const handleAddCnae = () => {
    const cnae = cnaeInput.trim().replace(/\D/g, "");
    if (!cnae) return;
    if (cnaes.includes(cnae)) {
      toast.error("CNAE já adicionado");
      return;
    }
    setCnaes(prev => [...prev, cnae]);
    setCnaeInput("");
  };

  const handleRemoveCnae = (cnaeToRemove: string) => {
    setCnaes(prev => prev.filter(c => c !== cnaeToRemove));
  };

  const handleCnaeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCnae();
    }
  };

  const handleImport = async () => {
    if (cnaes.length === 0) return;
    setIsImporting(true);

    try {
      const cnaeFilters = cnaes.map(c => `cnae_code.eq.${c}`).join(",");

      // Fetch ALL matching lead IDs (paginated)
      const allLeadIds: string[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("lead_master_pool")
          .select("id")
          .eq("company_id", companyId)
          .or(cnaeFilters)
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allLeadIds.push(...data.map(l => l.id));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      if (allLeadIds.length === 0) {
        toast.info("Nenhum lead encontrado");
        return;
      }

      // Fetch existing assignments
      const existingIds = new Set<string>();
      for (let i = 0; i < allLeadIds.length; i += 500) {
        const batch = allLeadIds.slice(i, i + 500);
        const { data: existing } = await supabase
          .from("lead_segment_assignments")
          .select("lead_id")
          .eq("segment_id", segment.id)
          .in("lead_id", batch);
        existing?.forEach(e => existingIds.add(e.lead_id));
      }

      const newIds = allLeadIds.filter(id => !existingIds.has(id));

      if (newIds.length === 0) {
        toast.info("Todos os leads já estão neste segmento");
        return;
      }

      // Batch insert
      const batchSize = 500;
      for (let i = 0; i < newIds.length; i += batchSize) {
        const batch = newIds.slice(i, i + batchSize).map(leadId => ({
          lead_id: leadId,
          segment_id: segment.id,
        }));
        const { error: insertError } = await supabase
          .from("lead_segment_assignments")
          .insert(batch);
        if (insertError) throw insertError;
      }

      // Also update segment CNAEs if changed
      const cnaesChanged = JSON.stringify(cnaes.sort()) !== JSON.stringify((segment.cnaes || []).sort());
      if (cnaesChanged) {
        await supabase
          .from("lead_segments")
          .update({ cnaes })
          .eq("id", segment.id);
      }

      toast.success(`${newIds.length} leads importados para "${segment.name}"`);
      queryClient.invalidateQueries({ queryKey: ["lead-segments-dashboard"] });
      onOpenChange(false);
    } catch (err) {
      console.error("Error importing:", err);
      toast.error("Erro ao importar leads");
    } finally {
      setIsImporting(false);
    }
  };

  const classificationColor = (c: string | null) => {
    switch (c) {
      case "ouro": return "text-yellow-500";
      case "prata": return "text-muted-foreground";
      case "bronze": return "text-amber-600";
      default: return "text-muted-foreground";
    }
  };

  const newToImport = totalMatching - alreadyAssigned;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DatabaseIcon className="h-5 w-5" />
            Importar da Base — {segment.name}
          </DialogTitle>
          <DialogDescription>
            Busque leads existentes na sua base pelo CNAE e importe para este segmento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* CNAE Editor */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              CNAEs para busca
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite o código CNAE (ex: 6201501)"
                value={cnaeInput}
                onChange={(e) => setCnaeInput(e.target.value)}
                onKeyDown={handleCnaeKeyDown}
                className="font-mono"
              />
              <Button variant="outline" onClick={handleAddCnae} disabled={!cnaeInput.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button onClick={fetchLeads} disabled={isLoading || cnaes.length === 0}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2">Buscar</span>
              </Button>
            </div>

            {cnaes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {cnaes.map((cnae) => {
                  const summary = cnaeSummary.find(s => s.cnae === cnae);
                  return (
                    <Badge key={cnae} variant="secondary" className="flex items-center gap-1 font-mono">
                      {cnae}
                      {summary !== undefined && (
                        <span className="text-xs text-muted-foreground ml-1">({summary.count})</span>
                      )}
                      <button type="button" onClick={() => handleRemoveCnae(cnae)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Cards */}
          {hasSearched && !isLoading && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{totalMatching}</div>
                <div className="text-xs text-muted-foreground">Total encontrados</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{alreadyAssigned}</div>
                <div className="text-xs text-muted-foreground">Já no segmento</div>
              </div>
              <div className="rounded-lg border p-3 text-center bg-primary/5">
                <div className="text-2xl font-bold text-primary">{newToImport > 0 ? newToImport : 0}</div>
                <div className="text-xs text-muted-foreground">Novos para importar</div>
              </div>
            </div>
          )}

          {/* Leads Preview Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Buscando leads...</span>
            </div>
          ) : hasSearched && leads.length > 0 ? (
            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa / Nome</TableHead>
                    <TableHead>CNAE</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Class.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate font-medium text-sm">
                          {lead.company_name || lead.full_name || "—"}
                        </div>
                        {lead.company_name && lead.full_name && lead.full_name !== lead.company_name && (
                          <div className="text-xs text-muted-foreground truncate">{lead.full_name}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {lead.cnae_code || "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px]">
                        <div className="truncate">{lead.email || lead.phone || "—"}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {lead.city && lead.state ? `${lead.city}/${lead.state}` : lead.state || "—"}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-sm font-medium">
                        {lead.global_score ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs font-medium capitalize ${classificationColor(lead.lead_classification)}`}>
                          {lead.lead_classification || "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalMatching > 50 && (
                <div className="text-center py-2 text-xs text-muted-foreground border-t">
                  Exibindo 50 de {totalMatching} leads (ordenados por score)
                </div>
              )}
            </ScrollArea>
          ) : hasSearched ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhum lead encontrado com esses CNAEs</p>
            </div>
          ) : cnaes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Adicione CNAEs acima para buscar leads na base</p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || !hasSearched || newToImport <= 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importando...
              </>
            ) : (
              <>
                <DatabaseIcon className="h-4 w-4 mr-2" />
                Importar {newToImport > 0 ? newToImport : 0} leads
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
