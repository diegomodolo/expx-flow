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
  razao_social: string | null;
  nome_fantasia: string | null;
  cnae_code: string;
  cnae_description: string | null;
  cnpj: string;
  email: string | null;
  phone: string | null;
  municipio: string | null;
  uf: string | null;
  capital_social: number | null;
  situacao_cadastral: string | null;
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
  const [alreadyInPool, setAlreadyInPool] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [cnaeSummary, setCnaeSummary] = useState<CnaeSummary[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchLeads = useCallback(async () => {
    if (cnaes.length === 0) {
      setLeads([]);
      setTotalMatching(0);
      setAlreadyInPool(0);
      setCnaeSummary([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const cnaeFilters = cnaes.map(c => `cnae_code.eq.${c}`).join(",");

      // Get count and preview from cnae_lead_pool
      const { data, error, count } = await supabase
        .from("cnae_lead_pool")
        .select("id, razao_social, nome_fantasia, cnae_code, cnae_description, cnpj, email, phone, municipio, uf, capital_social, situacao_cadastral", { count: "exact" })
        .eq("company_id", companyId)
        .or(cnaeFilters)
        .order("capital_social", { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) throw error;

      setLeads(data || []);
      setTotalMatching(count || 0);

      // CNAE summary counts
      const summaryPromises = cnaes.map(async (cnae) => {
        const { count: cnaeCount } = await supabase
          .from("cnae_lead_pool")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("cnae_code", cnae);
        return { cnae, count: cnaeCount || 0 };
      });
      setCnaeSummary(await Promise.all(summaryPromises));

      // Check how many CNPJs already exist in lead_master_pool (already imported)
      if (data && data.length > 0) {
        const sampleCnpjs = data.map(l => l.cnpj).filter(Boolean);
        if (sampleCnpjs.length > 0) {
          const { count: existingCount } = await supabase
            .from("lead_master_pool")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .or(cnaeFilters.replace(/cnae_code/g, "cnae_code"));
          setAlreadyInPool(existingCount || 0);
        }
      } else {
        setAlreadyInPool(0);
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
      toast.error("Erro ao buscar leads da base CNAE");
    } finally {
      setIsLoading(false);
    }
  }, [cnaes, companyId]);

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
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

      // Fetch ALL matching leads from cnae_lead_pool (paginated)
      const allLeads: Array<{ cnpj: string; razao_social: string | null; nome_fantasia: string | null; cnae_code: string; cnae_description: string | null; email: string | null; phone: string | null; municipio: string | null; uf: string | null; capital_social: number | null }> = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("cnae_lead_pool")
          .select("cnpj, razao_social, nome_fantasia, cnae_code, cnae_description, email, phone, municipio, uf, capital_social")
          .eq("company_id", companyId)
          .or(cnaeFilters)
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allLeads.push(...data);
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      if (allLeads.length === 0) {
        toast.info("Nenhum lead encontrado");
        return;
      }

      // Check which CNPJs already exist in lead_master_pool
      const allCnpjs = allLeads.map(l => l.cnpj).filter(Boolean);
      const existingCnpjs = new Set<string>();
      
      for (let i = 0; i < allCnpjs.length; i += 500) {
        const batch = allCnpjs.slice(i, i + 500);
        const { data: existing } = await supabase
          .from("lead_master_pool")
          .select("cnpj")
          .eq("company_id", companyId)
          .in("cnpj", batch);
        existing?.forEach(e => { if (e.cnpj) existingCnpjs.add(e.cnpj); });
      }

      const newLeads = allLeads.filter(l => !existingCnpjs.has(l.cnpj));

      if (newLeads.length === 0) {
        toast.info("Todos os leads dessa base CNAE já estão importados");
        return;
      }

      // Insert into lead_master_pool
      const batchSize = 100;
      const insertedIds: string[] = [];

      for (let i = 0; i < newLeads.length; i += batchSize) {
        const batch = newLeads.slice(i, i + batchSize).map(lead => ({
          company_id: companyId,
          full_name: lead.nome_fantasia || lead.razao_social || lead.cnpj,
          company_name: lead.razao_social,
          company_trade_name: lead.nome_fantasia,
          cnpj: lead.cnpj,
          cnae_code: lead.cnae_code,
          cnae_description: lead.cnae_description,
          email: lead.email,
          phone: lead.phone,
          city: lead.municipio,
          state: lead.uf,
          share_capital: lead.capital_social,
          global_score: 0,
          total_conversions: 0,
          total_value: 0,
          created_at: new Date().toISOString(),
          first_captured_at: new Date().toISOString(),
        }));

        const { data: inserted, error } = await supabase
          .from("lead_master_pool")
          .insert(batch as any)
          .select("id");

        if (error) {
          console.error("Batch insert error:", error);
          // Try one by one
          for (const lead of batch) {
            const { data: single, error: singleErr } = await supabase
              .from("lead_master_pool")
              .insert(lead as any)
              .select("id")
              .maybeSingle();
            if (!singleErr && single) insertedIds.push(single.id);
          }
        } else if (inserted) {
          insertedIds.push(...inserted.map(r => r.id));
        }
      }

      // Assign to segment
      if (insertedIds.length > 0) {
        for (let i = 0; i < insertedIds.length; i += 500) {
          const batch = insertedIds.slice(i, i + 500).map(leadId => ({
            lead_id: leadId,
            segment_id: segment.id,
          }));
          await supabase.from("lead_segment_assignments").insert(batch);
        }
      }

      // Update segment CNAEs if changed
      const cnaesChanged = JSON.stringify(cnaes.sort()) !== JSON.stringify((segment.cnaes || []).sort());
      if (cnaesChanged) {
        await supabase.from("lead_segments").update({ cnaes }).eq("id", segment.id);
      }

      toast.success(`${insertedIds.length} leads importados da base CNAE para "${segment.name}"`);
      queryClient.invalidateQueries({ queryKey: ["lead-segments-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["lead-pool"] });
      onOpenChange(false);
    } catch (err) {
      console.error("Error importing:", err);
      toast.error("Erro ao importar leads");
    } finally {
      setIsImporting(false);
    }
  };

  const newToImport = Math.max(0, totalMatching - alreadyInPool);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DatabaseIcon className="h-5 w-5" />
            Importar da Base CNAE — {segment.name}
          </DialogTitle>
          <DialogDescription>
            Busque leads da sua base de CNAEs e importe para este segmento e para o pool principal.
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
                placeholder="Digite o código CNAE (ex: 4930202)"
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
                <div className="text-2xl font-bold">{totalMatching.toLocaleString("pt-BR")}</div>
                <div className="text-xs text-muted-foreground">Na base CNAE</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{alreadyInPool.toLocaleString("pt-BR")}</div>
                <div className="text-xs text-muted-foreground">Já no pool principal</div>
              </div>
              <div className="rounded-lg border p-3 text-center bg-primary/5">
                <div className="text-2xl font-bold text-primary">~{newToImport.toLocaleString("pt-BR")}</div>
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
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>CNAE</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead className="text-center">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate font-medium text-sm">
                          {lead.nome_fantasia || lead.razao_social || "—"}
                        </div>
                        {lead.nome_fantasia && lead.razao_social && lead.nome_fantasia !== lead.razao_social && (
                          <div className="text-xs text-muted-foreground truncate">{lead.razao_social}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {lead.cnpj || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {lead.cnae_code}
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px]">
                        <div className="truncate">{lead.email || lead.phone || "—"}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {lead.municipio && lead.uf ? `${lead.municipio}/${lead.uf}` : lead.uf || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={lead.situacao_cadastral === "Ativa" ? "default" : "secondary"} className="text-xs">
                          {lead.situacao_cadastral || "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalMatching > 50 && (
                <div className="text-center py-2 text-xs text-muted-foreground border-t">
                  Exibindo 50 de {totalMatching.toLocaleString("pt-BR")} leads (ordenados por capital social)
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
            disabled={isImporting || !hasSearched || totalMatching <= 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importando...
              </>
            ) : (
              <>
                <DatabaseIcon className="h-4 w-4 mr-2" />
                Importar ~{newToImport.toLocaleString("pt-BR")} leads
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
