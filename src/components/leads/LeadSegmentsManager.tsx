import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Tags, Plus, Trash2, Users, RefreshCw, Edit, X, Building2, Database, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ListaCnaeSegmentModal } from "./ListaCnaeSegmentModal";
import { ListaCnaeImportModal } from "./ListaCnaeImportModal";

const SEGMENT_TYPES = [
  { value: 'sector', label: 'Setor' },
  { value: 'behavior', label: 'Comportamento' },
  { value: 'location', label: 'Localização' },
  { value: 'value', label: 'Valor' },
  { value: 'custom', label: 'Personalizado' },
];

interface FormData {
  name: string;
  description: string;
  segment_type: string;
  cnaes: string[];
}

export const LeadSegmentsManager = () => {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isListaCnaeModalOpen, setIsListaCnaeModalOpen] = useState(false);
  const [importModalSegment, setImportModalSegment] = useState<{ id: string; name: string; cnaes: string[] } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', description: '', segment_type: 'custom', cnaes: [] });
  const [cnaeInput, setCnaeInput] = useState('');

  const companyId = activeCompany?.company_id;

  const { data: segments, isLoading } = useQuery({
    queryKey: ['lead-segments', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('lead_segments')
        .select('*')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      
      const withCounts = await Promise.all((data || []).map(async (seg) => {
        const { count } = await supabase
          .from('lead_segment_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('segment_id', seg.id);
        return { ...seg, lead_count: count || 0 };
      }));
      return withCounts;
    },
    enabled: !!companyId
  });

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
      queryClient.invalidateQueries({ queryKey: ['lead-segments'] }); 
      queryClient.invalidateQueries({ queryKey: ['sectors'] }); 
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
      queryClient.invalidateQueries({ queryKey: ['lead-segments'] }); 
      queryClient.invalidateQueries({ queryKey: ['sectors'] }); 
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
      queryClient.invalidateQueries({ queryKey: ['lead-segments'] }); 
      queryClient.invalidateQueries({ queryKey: ['sectors'] }); 
      toast.success("Segmento removido!"); 
    }
  });

  const resetForm = () => { 
    setFormData({ name: '', description: '', segment_type: 'custom', cnaes: [] }); 
    setCnaeInput('');
    setEditingId(null); 
    setIsDialogOpen(false); 
  };

  const handleEdit = (seg: any) => { 
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
    const cnae = cnaeInput.trim().replace(/\D/g, ''); // Remove non-digits
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Segmentos de Leads
            </CardTitle>
            <CardDescription>Organize leads por características</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsListaCnaeModalOpen(true)}>
              <Database className="h-4 w-4 mr-2" />
              Novo Segmento com CNAE
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setIsDialogOpen(o); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Novo Segmento</Button>
              </DialogTrigger>
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

                {/* CNAEs Section */}
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
          </div>

          {companyId && (
            <ListaCnaeSegmentModal
              open={isListaCnaeModalOpen}
              onOpenChange={setIsListaCnaeModalOpen}
              companyId={companyId}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        ) : segments && segments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CNAEs</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((seg) => (
                <TableRow key={seg.id}>
                  <TableCell>
                    <p className="font-medium">{seg.name}</p>
                    {seg.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {seg.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {SEGMENT_TYPES.find(t => t.value === seg.segment_type)?.label || seg.segment_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {seg.cnaes && seg.cnaes.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{seg.cnaes.length}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {seg.lead_count}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(seg.created_at), "dd/MM/yy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider delayDuration={300}>
                      {seg.cnaes && seg.cnaes.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => setImportModalSegment({ id: seg.id, name: seg.name, cnaes: seg.cnaes })}
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
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(seg)}>
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
                          <AlertDialogTitle>Remover?</AlertDialogTitle>
                          <AlertDialogDescription>Leads não serão removidos.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteMutation.mutate(seg.id)} 
                            className="bg-destructive text-destructive-foreground"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Tags className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum segmento</p>
          </div>
        )}
      </CardContent>

      {/* Import Modal for existing segment */}
      {companyId && importModalSegment && (
        <ListaCnaeImportModal
          open={!!importModalSegment}
          onOpenChange={(open) => !open && setImportModalSegment(null)}
          companyId={companyId}
          segment={importModalSegment}
        />
      )}
    </Card>
  );
};
