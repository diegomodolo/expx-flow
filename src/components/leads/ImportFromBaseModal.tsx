import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Plus, X, Loader2, DatabaseIcon, Search, Users, Filter, ChevronDown, ChevronUp } from "lucide-react";
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
  porte: string | null;
  natureza_juridica: string | null;
  simples_option: string | null;
  mei_option: string | null;
  data_abertura: string | null;
  bairro: string | null;
}

interface CnaeSummary {
  cnae: string;
  count: number;
}

interface Filters {
  uf: string;
  municipio: string;
  bairro: string;
  situacao_cadastral: string;
  porte: string;
  natureza_juridica: string;
  simples_option: string;
  mei_option: string;
  capital_social_min: string;
  capital_social_max: string;
  data_abertura_min: string;
  data_abertura_max: string;
  has_email: boolean;
  has_phone: boolean;
  razao_social: string;
}

const EMPTY_FILTERS: Filters = {
  uf: "",
  municipio: "",
  bairro: "",
  situacao_cadastral: "",
  porte: "",
  natureza_juridica: "",
  simples_option: "",
  mei_option: "",
  capital_social_min: "",
  capital_social_max: "",
  data_abertura_min: "",
  data_abertura_max: "",
  has_email: false,
  has_phone: false,
  razao_social: "",
};

const UF_OPTIONS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
];

const SITUACAO_OPTIONS = ["Ativa", "Baixada", "Inapta", "Suspensa", "Nula"];
const PORTE_OPTIONS = ["ME", "EPP", "Demais"];
const SIMPLES_OPTIONS = [
  { value: "S", label: "Sim" },
  { value: "N", label: "Não" },
];

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
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (filters.uf) count++;
    if (filters.municipio) count++;
    if (filters.bairro) count++;
    if (filters.situacao_cadastral) count++;
    if (filters.porte) count++;
    if (filters.natureza_juridica) count++;
    if (filters.simples_option) count++;
    if (filters.mei_option) count++;
    if (filters.capital_social_min) count++;
    if (filters.capital_social_max) count++;
    if (filters.data_abertura_min) count++;
    if (filters.data_abertura_max) count++;
    if (filters.has_email) count++;
    if (filters.has_phone) count++;
    if (filters.razao_social) count++;
    setActiveFilterCount(count);
  }, [filters]);

  const applyFilters = useCallback((query: any) => {
    if (filters.uf) query = query.eq("uf", filters.uf);
    if (filters.municipio) query = query.ilike("municipio", `%${filters.municipio}%`);
    if (filters.bairro) query = query.ilike("bairro", `%${filters.bairro}%`);
    if (filters.situacao_cadastral) query = query.eq("situacao_cadastral", filters.situacao_cadastral);
    if (filters.porte) query = query.eq("porte", filters.porte);
    if (filters.natureza_juridica) query = query.ilike("natureza_juridica", `%${filters.natureza_juridica}%`);
    if (filters.simples_option) query = query.eq("simples_option", filters.simples_option);
    if (filters.mei_option) query = query.eq("mei_option", filters.mei_option);
    if (filters.capital_social_min) query = query.gte("capital_social", parseFloat(filters.capital_social_min));
    if (filters.capital_social_max) query = query.lte("capital_social", parseFloat(filters.capital_social_max));
    if (filters.data_abertura_min) query = query.gte("data_abertura", filters.data_abertura_min);
    if (filters.data_abertura_max) query = query.lte("data_abertura", filters.data_abertura_max);
    if (filters.has_email) query = query.not("email", "is", null).neq("email", "");
    if (filters.has_phone) query = query.not("phone", "is", null).neq("phone", "");
    if (filters.razao_social) query = query.ilike("razao_social", `%${filters.razao_social}%`);
    return query;
  }, [filters]);

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

      let query = supabase
        .from("cnae_lead_pool")
        .select("id, razao_social, nome_fantasia, cnae_code, cnae_description, cnpj, email, phone, municipio, uf, capital_social, situacao_cadastral, porte, natureza_juridica, simples_option, mei_option, data_abertura, bairro", { count: "exact" })
        .eq("company_id", companyId)
        .or(cnaeFilters);

      query = applyFilters(query);

      const { data, error, count } = await query
        .order("capital_social", { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) throw error;

      setLeads(data || []);
      setTotalMatching(count || 0);

      // CNAE summary counts (with filters)
      const summaryPromises = cnaes.map(async (cnae) => {
        let q = supabase
          .from("cnae_lead_pool")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("cnae_code", cnae);
        q = applyFilters(q);
        const { count: cnaeCount } = await q;
        return { cnae, count: cnaeCount || 0 };
      });
      setCnaeSummary(await Promise.all(summaryPromises));

      // Check already in pool
      if (count && count > 0) {
        let poolQuery = supabase
          .from("lead_master_pool")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .or(cnaeFilters.replace(/cnae_code/g, "cnae_code"));
        const { count: existingCount } = await poolQuery;
        setAlreadyInPool(existingCount || 0);
      } else {
        setAlreadyInPool(0);
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
      toast.error("Erro ao buscar leads da base CNAE");
    } finally {
      setIsLoading(false);
    }
  }, [cnaes, companyId, applyFilters]);

  useEffect(() => {
    if (open) {
      setCnaes(segment.cnaes || []);
      setHasSearched(false);
      setFilters(EMPTY_FILTERS);
      setFiltersOpen(false);
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
    if (e.key === "Enter") { e.preventDefault(); handleAddCnae(); }
  };

  const updateFilter = (key: keyof Filters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
  };

  const handleImport = async () => {
    if (cnaes.length === 0) return;
    setIsImporting(true);

    try {
      const cnaeFilters = cnaes.map(c => `cnae_code.eq.${c}`).join(",");

      // Fetch ALL matching leads with filters (paginated)
      const allLeads: Array<{ cnpj: string; razao_social: string | null; nome_fantasia: string | null; cnae_code: string; cnae_description: string | null; email: string | null; phone: string | null; municipio: string | null; uf: string | null; capital_social: number | null }> = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("cnae_lead_pool")
          .select("cnpj, razao_social, nome_fantasia, cnae_code, cnae_description, email, phone, municipio, uf, capital_social")
          .eq("company_id", companyId)
          .or(cnaeFilters);
        
        query = applyFilters(query);

        const { data, error } = await query.range(from, from + pageSize - 1);

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

      // Dedup by CNPJ
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

      if (insertedIds.length > 0) {
        for (let i = 0; i < insertedIds.length; i += 500) {
          const batch = insertedIds.slice(i, i + 500).map(leadId => ({
            lead_id: leadId,
            segment_id: segment.id,
          }));
          await supabase.from("lead_segment_assignments").insert(batch);
        }
      }

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
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DatabaseIcon className="h-5 w-5" />
            Importar da Base CNAE — {segment.name}
          </DialogTitle>
          <DialogDescription>
            Busque leads da sua base de CNAEs, aplique filtros e importe para este segmento.
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
                placeholder="Código CNAE (ex: 4930202)"
                value={cnaeInput}
                onChange={(e) => setCnaeInput(e.target.value)}
                onKeyDown={handleCnaeKeyDown}
                className="font-mono"
              />
              <Button variant="outline" onClick={handleAddCnae} disabled={!cnaeInput.trim()} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {cnaes.length > 0 && (
              <div className="flex flex-wrap gap-2">
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

          {/* Filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="text-xs">{activeFilterCount}</Badge>
                  )}
                </div>
                {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                {/* Row 1: Location */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">UF</Label>
                    <Select value={filters.uf} onValueChange={(v) => updateFilter("uf", v === "_all" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Todos</SelectItem>
                        {UF_OPTIONS.map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Município</Label>
                    <Input className="h-8 text-xs" placeholder="Buscar..." value={filters.municipio} onChange={(e) => updateFilter("municipio", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bairro</Label>
                    <Input className="h-8 text-xs" placeholder="Buscar..." value={filters.bairro} onChange={(e) => updateFilter("bairro", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Razão Social</Label>
                    <Input className="h-8 text-xs" placeholder="Buscar..." value={filters.razao_social} onChange={(e) => updateFilter("razao_social", e.target.value)} />
                  </div>
                </div>

                {/* Row 2: Status */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Situação Cadastral</Label>
                    <Select value={filters.situacao_cadastral} onValueChange={(v) => updateFilter("situacao_cadastral", v === "_all" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Todas</SelectItem>
                        {SITUACAO_OPTIONS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Porte</Label>
                    <Select value={filters.porte} onValueChange={(v) => updateFilter("porte", v === "_all" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Todos</SelectItem>
                        {PORTE_OPTIONS.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Simples Nacional</Label>
                    <Select value={filters.simples_option} onValueChange={(v) => updateFilter("simples_option", v === "_all" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Todos</SelectItem>
                        {SIMPLES_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">MEI</Label>
                    <Select value={filters.mei_option} onValueChange={(v) => updateFilter("mei_option", v === "_all" ? "" : v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all">Todos</SelectItem>
                        {SIMPLES_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 3: Financial & Date */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Capital Social Mín (R$)</Label>
                    <Input className="h-8 text-xs font-mono" type="number" placeholder="0" value={filters.capital_social_min} onChange={(e) => updateFilter("capital_social_min", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Capital Social Máx (R$)</Label>
                    <Input className="h-8 text-xs font-mono" type="number" placeholder="∞" value={filters.capital_social_max} onChange={(e) => updateFilter("capital_social_max", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Abertura Desde</Label>
                    <Input className="h-8 text-xs" type="date" value={filters.data_abertura_min} onChange={(e) => updateFilter("data_abertura_min", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Abertura Até</Label>
                    <Input className="h-8 text-xs" type="date" value={filters.data_abertura_max} onChange={(e) => updateFilter("data_abertura_max", e.target.value)} />
                  </div>
                </div>

                {/* Row 4: Natureza Jurídica + Contact + Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Natureza Jurídica</Label>
                    <Input className="h-8 text-xs" placeholder="Buscar..." value={filters.natureza_juridica} onChange={(e) => updateFilter("natureza_juridica", e.target.value)} />
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="has_email" checked={filters.has_email} onCheckedChange={(v) => updateFilter("has_email", !!v)} />
                      <Label htmlFor="has_email" className="text-xs cursor-pointer">Com e-mail</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="has_phone" checked={filters.has_phone} onCheckedChange={(v) => updateFilter("has_phone", !!v)} />
                      <Label htmlFor="has_phone" className="text-xs cursor-pointer">Com telefone</Label>
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-2 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs">
                      Limpar filtros
                    </Button>
                    <Button size="sm" onClick={fetchLeads} disabled={isLoading || cnaes.length === 0} className="text-xs">
                      {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
                      Buscar
                    </Button>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Search button when filters closed */}
          {!filtersOpen && (
            <Button onClick={fetchLeads} disabled={isLoading || cnaes.length === 0} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Buscar na base
            </Button>
          )}

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
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-center">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="max-w-[180px]">
                        <div className="truncate font-medium text-sm">
                          {lead.nome_fantasia || lead.razao_social || "—"}
                        </div>
                        {lead.nome_fantasia && lead.razao_social && lead.nome_fantasia !== lead.razao_social && (
                          <div className="text-xs text-muted-foreground truncate">{lead.razao_social}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{lead.cnpj || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{lead.cnae_code}</TableCell>
                      <TableCell className="text-xs max-w-[130px]">
                        <div className="truncate">{lead.email || lead.phone || "—"}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {lead.municipio && lead.uf ? `${lead.municipio}/${lead.uf}` : lead.uf || "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {lead.capital_social ? `R$ ${lead.capital_social.toLocaleString("pt-BR")}` : "—"}
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
                  Exibindo 50 de {totalMatching.toLocaleString("pt-BR")} leads
                </div>
              )}
            </ScrollArea>
          ) : hasSearched ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhum lead encontrado com esses filtros</p>
            </div>
          ) : cnaes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Adicione CNAEs acima para buscar leads na base</p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={isImporting || !hasSearched || totalMatching <= 0}>
            {isImporting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importando...</>
            ) : (
              <><DatabaseIcon className="h-4 w-4 mr-2" />Importar ~{newToImport.toLocaleString("pt-BR")} leads</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
