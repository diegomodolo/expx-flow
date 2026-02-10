import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Trophy, Medal, Award, Trash2, RefreshCw, Plus, Edit, X, Building2, Search, LayoutGrid, DatabaseIcon, Loader2 } from "lucide-react";
import { useLeadScoring } from "@/hooks/useLeadScoring";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ListaCnaeImportModal } from "./ListaCnaeImportModal";
import { useCompany } from "@/contexts/CompanyContext";

interface LeadSegmentsDashboardProps {
  companyId?: string;
  openCreateDialog?: boolean;
  onCreateDialogChange?: (open: boolean) => void;
}

interface SegmentMetrics {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
  segment_type: string;
  cnaes: string[];
  lead_count: number;
  avg_score: number;
  total_value: number;
  ouro_count: number;
  prata_count: number;
  bronze_count: number;
  descartado_count: number;
  last_lead_at: string | null;
  created_at: string;
}

interface RecalculateProgress {
  segmentId: string;
  segmentName: string;
  total: number;
  processed: number;
}

interface FormData {
  name: string;
  description: string;
  segment_type: string;
  cnaes: string[];
}

const SEGMENT_TYPES = [
  { value: 'sector', label: 'Setor' },
  { value: 'behavior', label: 'Comportamento' },
  { value: 'location', label: 'Localização' },
  { value: 'value', label: 'Valor' },
  { value: 'custom', label: 'Personalizado' },
];

// Helper to fetch ALL assignments (paginated to avoid 1000 limit)
async function fetchAllAssignments(segmentId: string): Promise<string[]> {
  const allLeadIds: string[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('lead_segment_assignments')
      .select('lead_id')
      .eq('segment_id', segmentId)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (data && data.length > 0) {
      allLeadIds.push(...data.map(a => a.lead_id));
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allLeadIds;
}

export const LeadSegmentsDashboard = ({ 
  companyId: propCompanyId,
  openCreateDialog,
  onCreateDialogChange 
}: LeadSegmentsDashboardProps) => {
  const { activeCompany } = useCompany();
  const companyId = propCompanyId || activeCompany?.company_id;
  
  const queryClient = useQueryClient();
  const { scoreAndSaveLead } = useLeadScoring();
  const [recalculateProgressMap, setRecalculateProgressMap] = useState<Map<string, RecalculateProgress>>(new Map());

  // Form state for create/edit dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', description: '', segment_type: 'custom', cnaes: [] });
  const [cnaeInput, setCnaeInput] = useState('');

  // Modal states
  const [importModalSegment, setImportModalSegment] = useState<{ id: string; name: string; cnaes: string[] } | null>(null);
  const [importingFromBase, setImportingFromBase] = useState<string | null>(null);

  // Sync dialog state with external prop
  useEffect(() => {
    if (openCreateDialog && !editingId) {
      setIsDialogOpen(true);
    }
  }, [openCreateDialog, editingId]);

  // Notify parent when dialog closes
  const handleDialogChange = (open: boolean) => {
    if (!open) resetForm();
    setIsDialogOpen(open);
    onCreateDialogChange?.(open);
  };

  const { data: segments, isLoading } = useQuery({
    queryKey: ['lead-segments-dashboard', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Fetch all segments
      const { data: segmentsData } = await supabase
        .from('lead_segments')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (!segmentsData?.length) return [];

      // For each segment, fetch aggregated metrics
      const metricsPromises = segmentsData.map(async (segment) => {
        // Get ALL lead IDs in this segment (paginated)
        const leadIds = await fetchAllAssignments(segment.id);
        
        if (leadIds.length === 0) {
          return {
            ...segment,
            cnaes: segment.cnaes || [],
            lead_count: 0,
            avg_score: 0,
            total_value: 0,
            ouro_count: 0,
            prata_count: 0,
            bronze_count: 0,
            descartado_count: 0,
            last_lead_at: null
          } as SegmentMetrics;
        }

        // Get aggregated data (batch to avoid URL limits with large IN lists)
        const leads: Array<{ global_score: number | null; total_value: number | null; lead_classification: string | null; created_at: string }> = [];
        const chunkSize = 500;

        for (let i = 0; i < leadIds.length; i += chunkSize) {
          const chunkIds = leadIds.slice(i, i + chunkSize);
          const { data: chunkData, error } = await supabase
            .from('lead_master_pool')
            .select('global_score, total_value, lead_classification, created_at')
            .eq('company_id', companyId)
            .in('id', chunkIds);

          if (error) throw error;
          if (chunkData?.length) leads.push(...chunkData);
        }

        const avgScore = leads.length > 0 
          ? Math.round(leads.reduce((sum, l) => sum + (l.global_score || 0), 0) / leads.length)
          : 0;
        const totalValue = leads.reduce((sum, l) => sum + (l.total_value || 0), 0);
        
        const ouroCount = leads.filter(l => l.lead_classification === 'ouro').length;
        const prataCount = leads.filter(l => l.lead_classification === 'prata').length;
        const bronzeCount = leads.filter(l => l.lead_classification === 'bronze').length;
        const descartadoCount = leads.filter(l => l.lead_classification === 'descartado').length;
        
        const sortedLeads = [...leads].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastLeadAt = sortedLeads[0]?.created_at || null;

        return {
          ...segment,
          cnaes: segment.cnaes || [],
          lead_count: leads.length,
          avg_score: avgScore,
          total_value: totalValue,
          ouro_count: ouroCount,
          prata_count: prataCount,
          bronze_count: bronzeCount,
          descartado_count: descartadoCount,
          last_lead_at: lastLeadAt
        } as SegmentMetrics;
      });

      return Promise.all(metricsPromises);
    },
    enabled: !!companyId
  });

  // Mutations for CRUD
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const { error } = await supabase
        .from('lead_segments')
        .insert({ 
          company_id: companyId, 
          name: data.name, 
          description: data.description || null, 
          segment_type: data.segment_type,
          cnaes: data.cnaes
        });
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['lead-segments-dashboard'] }); 
      resetForm(); 
      toast.success("Segmento criado!"); 
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const { error } = await supabase
        .from('lead_segments')
        .update({ 
          name: data.name, 
          description: data.description || null, 
          segment_type: data.segment_type,
          cnaes: data.cnaes
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['lead-segments-dashboard'] }); 
      resetForm(); 
      toast.success("Segmento atualizado!"); 
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { 
      const { error } = await supabase.from('lead_segments').delete().eq('id', id); 
      if (error) throw error; 
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['lead-segments-dashboard'] }); 
      toast.success("Segmento removido!"); 
    }
  });

  const resetForm = () => { 
    setFormData({ name: '', description: '', segment_type: 'custom', cnaes: [] }); 
    setCnaeInput('');
    setEditingId(null); 
    setIsDialogOpen(false); 
  };

  const handleEdit = (seg: SegmentMetrics) => { 
    setEditingId(seg.id); 
    setFormData({ 
      name: seg.name, 
      description: seg.description || '', 
      segment_type: seg.segment_type,
      cnaes: seg.cnaes || []
    }); 
    setCnaeInput('');
    setIsDialogOpen(true); 
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) { toast.error("Digite um nome"); return; }
    if (editingId) updateMutation.mutate({ id: editingId, data: formData });
    else createMutation.mutate(formData);
  };

  const handleAddCnae = () => {
    const cnae = cnaeInput.trim().replace(/\D/g, '');
    if (!cnae) return;
    if (formData.cnaes.includes(cnae)) {
      toast.error("CNAE já adicionado");
      return;
    }
    setFormData(prev => ({ ...prev, cnaes: [...prev.cnaes, cnae] }));
    setCnaeInput('');
  };

  const handleRemoveCnae = (cnaeToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      cnaes: prev.cnaes.filter(c => c !== cnaeToRemove) 
    }));
  };

  const handleCnaeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCnae();
    }
  };

  const handleRecalculateSegmentScores = async (segmentId: string, segmentName: string) => {
    if (recalculateProgressMap.has(segmentId)) {
      toast.info(`Segmento "${segmentName}" já está sendo recalculado.`);
      return;
    }

    try {
      const leadIds = await fetchAllAssignments(segmentId);

      if (leadIds.length === 0) {
        toast.info(`Segmento "${segmentName}" não possui leads para recalcular.`);
        return;
      }

      setRecalculateProgressMap(prev => {
        const newMap = new Map(prev);
        newMap.set(segmentId, {
          segmentId,
          segmentName,
          total: leadIds.length,
          processed: 0
        });
        return newMap;
      });

      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < leadIds.length; i += batchSize) {
        const batchIds = leadIds.slice(i, i + batchSize);
        const { data: leadsData, error } = await supabase
          .from('lead_master_pool')
          .select('*')
          .in('id', batchIds);

        if (error) throw error;

        for (const lead of leadsData || []) {
          await scoreAndSaveLead(lead.id, lead);
          processed++;
          
          if (processed % 10 === 0 || processed === leadIds.length) {
            const currentProcessed = processed;
            setRecalculateProgressMap(prev => {
              const newMap = new Map(prev);
              const existing = newMap.get(segmentId);
              if (existing) {
                newMap.set(segmentId, { ...existing, processed: currentProcessed });
              }
              return newMap;
            });
          }
        }
      }

      toast.success(`${processed} leads do segmento "${segmentName}" recalculados!`);
      queryClient.invalidateQueries({ queryKey: ['lead-segments-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['lead-pool'] });
    } catch (error) {
      console.error('Error recalculating segment scores:', error);
      toast.error(`Erro ao recalcular scores do segmento "${segmentName}"`);
    } finally {
      setRecalculateProgressMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(segmentId);
        return newMap;
      });
    }
  };

  const handleImportFromBase = async (segmentId: string, segmentName: string, cnaes: string[]) => {
    if (!companyId || cnaes.length === 0) return;
    setImportingFromBase(segmentId);

    try {
      // Build OR filter for cnae_code matching any of the segment's CNAEs
      const cnaeFilters = cnaes.map(c => `cnae_code.eq.${c}`).join(',');

      // Fetch all leads from lead_master_pool matching any CNAE
      const { data: matchingLeads, error: fetchError } = await supabase
        .from('lead_master_pool')
        .select('id')
        .eq('company_id', companyId)
        .or(cnaeFilters);

      if (fetchError) throw fetchError;

      if (!matchingLeads || matchingLeads.length === 0) {
        toast.info(`Nenhum lead na base com CNAEs do segmento "${segmentName}"`);
        return;
      }

      // Fetch existing assignments to avoid duplicates
      const existingLeadIds = new Set(await fetchAllAssignments(segmentId));

      const newLeadIds = matchingLeads
        .map(l => l.id)
        .filter(id => !existingLeadIds.has(id));

      if (newLeadIds.length === 0) {
        toast.info(`Todos os leads com esses CNAEs já estão no segmento "${segmentName}"`);
        return;
      }

      // Batch insert assignments
      const batchSize = 500;
      for (let i = 0; i < newLeadIds.length; i += batchSize) {
        const batch = newLeadIds.slice(i, i + batchSize).map(leadId => ({
          lead_id: leadId,
          segment_id: segmentId,
        }));
        const { error: insertError } = await supabase
          .from('lead_segment_assignments')
          .insert(batch);
        if (insertError) throw insertError;
      }

      toast.success(`${newLeadIds.length} leads importados da base para "${segmentName}"`);
      queryClient.invalidateQueries({ queryKey: ['lead-segments-dashboard'] });
    } catch (error) {
      console.error('Error importing from base:', error);
      toast.error(`Erro ao importar leads da base para "${segmentName}"`);
    } finally {
      setImportingFromBase(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create/Edit Dialog - kept separate to open from multiple places */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Criar"} Segmento</DialogTitle>
            <DialogDescription>Segmentos organizam leads por características.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input 
                placeholder="Ex: Leads Quentes" 
                value={formData.name} 
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={formData.segment_type} 
                onValueChange={(v) => setFormData(p => ({ ...p, segment_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                placeholder="Descreva..." 
                value={formData.description} 
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} 
                rows={2} 
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                CNAEs (para integração ListaCNAE)
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite o código CNAE (ex: 6201501)"
                  value={cnaeInput}
                  onChange={(e) => setCnaeInput(e.target.value)}
                  onKeyDown={handleCnaeKeyDown}
                  className="font-mono"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddCnae}
                  disabled={!cnaeInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Adicione os CNAEs relacionados a este segmento para usar na importação via ListaCNAE
              </p>
              
              {formData.cnaes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.cnaes.map((cnae) => (
                    <Badge 
                      key={cnae} 
                      variant="secondary" 
                      className="flex items-center gap-1 font-mono"
                    >
                      {cnae}
                      <button
                        type="button"
                        onClick={() => handleRemoveCnae(cnae)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Visão por Segmentos
          </CardTitle>
          <CardDescription>
            Métricas agregadas e gerenciamento de segmentos
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Progress cards when recalculating */}
          {recalculateProgressMap.size > 0 && (
            <div className="mb-6 space-y-3">
              {Array.from(recalculateProgressMap.values()).map((progress) => (
                <div 
                  key={progress.segmentId} 
                  className="p-4 border rounded-lg bg-muted/50 animate-fade-in"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Recalculando scores: {progress.segmentName}
                    </span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {progress.processed} / {progress.total}
                    </span>
                  </div>
                  <Progress 
                    value={(progress.processed / progress.total) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.round((progress.processed / progress.total) * 100)}% concluído
                  </p>
                </div>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : segments && segments.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">CNAEs</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Score médio</TableHead>
                    <TableHead className="text-right">Valor total</TableHead>
                    <TableHead className="text-right">
                      <Trophy className="h-4 w-4 inline text-yellow-500" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Medal className="h-4 w-4 inline text-slate-400" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Award className="h-4 w-4 inline text-amber-600" />
                    </TableHead>
                    <TableHead className="text-right">Criado</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {segments.map((segment) => (
                    <TableRow key={segment.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <span
                            className="mt-1 h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: segment.color }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              <span aria-hidden="true">{segment.icon === 'tag' ? '🏷️' : (segment.icon || '📁')}</span>
                              <span className="truncate">{segment.name}</span>
                            </div>
                            {segment.description && (
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {segment.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary">
                          {SEGMENT_TYPES.find(t => t.value === segment.segment_type)?.label || segment.segment_type}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        {segment.cnaes && segment.cnaes.length > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{segment.cnaes.length}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge variant="secondary" className="tabular-nums">
                          {segment.lead_count}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">{segment.avg_score}</TableCell>

                      <TableCell className="text-right tabular-nums">
                        R$ {segment.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">{segment.ouro_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{segment.prata_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{segment.bronze_count}</TableCell>

                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(new Date(segment.created_at), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider delayDuration={300}>
                            {segment.cnaes && segment.cnaes.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="icon" 
                                    variant="ghost"
                                    onClick={() => setImportModalSegment({ id: segment.id, name: segment.name, cnaes: segment.cnaes })}
                                  >
                                    <Search className="h-4 w-4 text-primary" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Buscar leads na ListaCNAE</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRecalculateSegmentScores(segment.id, segment.name)}
                                  disabled={recalculateProgressMap.has(segment.id)}
                                >
                                  <RefreshCw className={`h-4 w-4 ${recalculateProgressMap.has(segment.id) ? 'animate-spin' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Recalcular scores</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => handleEdit(segment)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar segmento</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover segmento?</AlertDialogTitle>
                                <AlertDialogDescription>Os leads não serão removidos, apenas o segmento.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteMutation.mutate(segment.id)} 
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum segmento encontrado</p>
              <p className="text-sm">Crie segmentos usando os botões acima</p>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Import Modal for existing segment */}
      {companyId && importModalSegment && (
        <ListaCnaeImportModal
          open={!!importModalSegment}
          onOpenChange={(open) => !open && setImportModalSegment(null)}
          companyId={companyId}
          segment={importModalSegment}
        />
      )}
    </div>
  );
};
