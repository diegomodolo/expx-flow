import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { MetaAudience, UserData, UploadResult } from "@/hooks/useMetaAudiences";
import { Upload, FileText, Keyboard, Loader2, CheckCircle, AlertCircle, Database, Hash, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

interface UploadStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
}

interface UploadLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: MetaAudience | null;
  onUpload: (audienceId: string, users: UserData[]) => Promise<UploadResult | null>;
  loading: boolean;
}

interface LeadSegment {
  id: string;
  name: string;
  segment_type: string;
  lead_count?: number;
}

export function UploadLeadsModal({
  open,
  onOpenChange,
  audience,
  onUpload,
  loading,
}: UploadLeadsModalProps) {
  const { activeCompany } = useCompany();
  const [mode, setMode] = useState<"csv" | "manual" | "segment">("csv");
  const [csvData, setCsvData] = useState("");
  const [manualData, setManualData] = useState<UserData[]>([{ email: "", phone: "" }]);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [parsedCount, setParsedCount] = useState(0);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [segmentLeadsCount, setSegmentLeadsCount] = useState<number>(0);
  const [loadingSegmentLeads, setLoadingSegmentLeads] = useState(false);
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch segments from Lead Intelligence Hub
  const { data: segments = [], isLoading: loadingSegments } = useQuery({
    queryKey: ['lead-segments-for-audience', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      
      // Get segments with lead counts
      const { data: segmentsData, error } = await supabase
        .from('lead_segments')
        .select('id, name, segment_type')
        .eq('company_id', activeCompany.company_id)
        .order('name');

      if (error) throw error;

      // Get lead counts for each segment
      const segmentsWithCounts: LeadSegment[] = [];
      for (const segment of segmentsData || []) {
        const { count } = await supabase
          .from('lead_segment_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('segment_id', segment.id);
        
        segmentsWithCounts.push({
          ...segment,
          lead_count: count || 0,
        });
      }

      return segmentsWithCounts;
    },
    enabled: open && !!activeCompany?.company_id,
  });

  // Update segment leads count when segment is selected
  useEffect(() => {
    if (selectedSegmentId) {
      const segment = segments.find(s => s.id === selectedSegmentId);
      setSegmentLeadsCount(segment?.lead_count || 0);
    } else {
      setSegmentLeadsCount(0);
    }
  }, [selectedSegmentId, segments]);

  const parseCSV = useCallback((csv: string): UserData[] => {
    const lines = csv.trim().split("\n");
    if (lines.length === 0) return [];

    // Try to detect header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes("email") || firstLine.includes("telefone") || firstLine.includes("phone");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const users: UserData[] = [];

    for (const line of dataLines) {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

      const user: UserData = {};

      // Try to detect email vs phone
      for (const part of parts) {
        if (part.includes("@")) {
          user.email = part;
        } else if (/^\+?[\d\s()-]+$/.test(part) && part.replace(/\D/g, "").length >= 8) {
          user.phone = part;
        }
      }

      if (user.email || user.phone) {
        users.push(user);
      }
    }

    return users;
  }, []);

  const handleCsvChange = (value: string) => {
    setCsvData(value);
    const parsed = parseCSV(value);
    setParsedCount(parsed.length);
  };

  const addManualRow = () => {
    setManualData([...manualData, { email: "", phone: "" }]);
  };

  const updateManualRow = (index: number, field: keyof UserData, value: string) => {
    const updated = [...manualData];
    updated[index] = { ...updated[index], [field]: value };
    setManualData(updated);
  };

  const removeManualRow = (index: number) => {
    setManualData(manualData.filter((_, i) => i !== index));
  };

  const getValidManualData = (): UserData[] => {
    return manualData.filter((u) => u.email || u.phone);
  };

  // Fetch leads from segment with pagination and batched queries
  const fetchLeadsFromSegment = async (segmentId: string): Promise<UserData[]> => {
    const users: UserData[] = [];
    const assignmentPageSize = 500; // Smaller to avoid URL length issues
    const leadBatchSize = 50; // Small batch for .in() queries to avoid URL too long
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      // Get lead IDs from assignments
      const { data: assignments, error: assignError } = await supabase
        .from('lead_segment_assignments')
        .select('lead_id')
        .eq('segment_id', segmentId)
        .range(from, from + assignmentPageSize - 1);

      if (assignError) throw assignError;

      if (!assignments || assignments.length === 0) {
        hasMore = false;
        break;
      }

      const leadIds = assignments.map(a => a.lead_id);

      // Batch the lead IDs to avoid URL length issues
      for (let i = 0; i < leadIds.length; i += leadBatchSize) {
        const batchIds = leadIds.slice(i, i + leadBatchSize);
        
        // Get lead data for this batch
        const { data: leads, error: leadsError } = await supabase
          .from('lead_master_pool')
          .select('email, phone, first_name, last_name, city, state, country, zip_code')
          .in('id', batchIds);

        if (leadsError) throw leadsError;

        for (const lead of leads || []) {
          if (lead.email || lead.phone) {
            users.push({
              email: lead.email || undefined,
              phone: lead.phone || undefined,
              firstName: lead.first_name || undefined,
              lastName: lead.last_name || undefined,
              city: lead.city || undefined,
              state: lead.state || undefined,
              country: lead.country || undefined,
              zipCode: lead.zip_code || undefined,
            });
          }
        }
      }

      if (assignments.length < assignmentPageSize) {
        hasMore = false;
      } else {
        from += assignmentPageSize;
      }
    }

    return users;
  };

  const updateStep = (stepId: string, updates: Partial<UploadStep>) => {
    setUploadSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const handleSubmit = async () => {
    if (!audience) return;

    setIsUploading(true);
    setUploadProgress(0);
    setResult(null);

    const steps: UploadStep[] = [
      { id: 'collect', label: 'Coletando leads', icon: <Database className="h-4 w-4" />, status: 'pending' },
      { id: 'validate', label: 'Validando dados', icon: <ShieldCheck className="h-4 w-4" />, status: 'pending' },
      { id: 'hash', label: 'Criptografando (SHA256)', icon: <Hash className="h-4 w-4" />, status: 'pending' },
      { id: 'send', label: 'Enviando para o Meta', icon: <Send className="h-4 w-4" />, status: 'pending' },
    ];
    setUploadSteps(steps);

    let users: UserData[] = [];

    // Step 1: Collect
    updateStep('collect', { status: 'active' });
    setUploadProgress(5);

    try {
      if (mode === "csv") {
        users = parseCSV(csvData);
      } else if (mode === "manual") {
        users = getValidManualData();
      } else if (mode === "segment") {
        if (!selectedSegmentId) return;
        setLoadingSegmentLeads(true);
        users = await fetchLeadsFromSegment(selectedSegmentId);
        setLoadingSegmentLeads(false);
      }

      updateStep('collect', { status: 'done', detail: `${users.length} leads coletados` });
      setUploadProgress(25);

      if (users.length === 0) {
        updateStep('validate', { status: 'error', detail: 'Nenhum lead válido encontrado' });
        setIsUploading(false);
        return;
      }

      // Step 2: Validate
      updateStep('validate', { status: 'active' });
      await new Promise(r => setTimeout(r, 300)); // brief pause for UI
      const validUsers = users.filter(u => u.email || u.phone);
      updateStep('validate', { status: 'done', detail: `${validUsers.length} leads válidos` });
      setUploadProgress(40);

      // Step 3: Hash + Send (done by edge function)
      updateStep('hash', { status: 'active', detail: `Processando em lotes de 5.000...` });
      setUploadProgress(50);

      // Small delay to show hashing step
      await new Promise(r => setTimeout(r, 500));
      updateStep('hash', { status: 'done', detail: 'Dados criptografados' });
      setUploadProgress(60);

      // Step 4: Send to Meta
      updateStep('send', { status: 'active', detail: `Enviando ${validUsers.length} leads...` });
      setUploadProgress(70);

      const uploadResult = await onUpload(audience.id, validUsers);

      if (uploadResult) {
        updateStep('send', { status: 'done', detail: `${uploadResult.num_received} recebidos pelo Meta` });
        setUploadProgress(100);
        setResult(uploadResult);
      } else {
        updateStep('send', { status: 'error', detail: 'Erro ao enviar para o Meta' });
      }
    } catch (error: any) {
      console.error('Error in upload process:', error);
      // Mark current active step as error
      setUploadSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error', detail: error.message } : s));
      setLoadingSegmentLeads(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setCsvData("");
    setManualData([{ email: "", phone: "" }]);
    setResult(null);
    setParsedCount(0);
    setSelectedSegmentId("");
    setSegmentLeadsCount(0);
    setUploadSteps([]);
    setIsUploading(false);
    setUploadProgress(0);
    onOpenChange(false);
  };

  const canSubmit =
    (mode === "csv" && parsedCount > 0) ||
    (mode === "manual" && getValidManualData().length > 0) ||
    (mode === "segment" && selectedSegmentId && segmentLeadsCount > 0);

  const isProcessing = loading || loadingSegmentLeads || isUploading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Leads ao Público</DialogTitle>
          {audience && (
            <p className="text-sm text-muted-foreground">
              Público: <span className="font-medium">{audience.name}</span>
            </p>
          )}
        </DialogHeader>

        {/* Progress / Upload Steps View */}
        {(isUploading || uploadSteps.length > 0) && !result ? (
          <div className="py-6 space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>

            <div className="space-y-3">
              {uploadSteps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    step.status === 'active' ? 'border-primary bg-primary/5' :
                    step.status === 'done' ? 'border-green-500/30 bg-green-500/5' :
                    step.status === 'error' ? 'border-destructive/30 bg-destructive/5' :
                    'border-border bg-muted/30'
                  }`}
                >
                  <div className="mt-0.5">
                    {step.status === 'active' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : step.status === 'done' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : step.status === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <span className="text-muted-foreground">{step.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      step.status === 'active' ? 'text-primary' :
                      step.status === 'done' ? 'text-green-600 dark:text-green-400' :
                      step.status === 'error' ? 'text-destructive' :
                      'text-muted-foreground'
                    }`}>
                      {step.label}
                    </p>
                    {step.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!isUploading && uploadSteps.some(s => s.status === 'error') && (
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>Fechar</Button>
                <Button onClick={handleSubmit}>Tentar Novamente</Button>
              </DialogFooter>
            )}
          </div>
        ) : result ? (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Upload Concluído!</h3>
              <p className="text-muted-foreground">
                Os leads foram enviados para processamento no Meta.
              </p>
            </div>
            <div className="bg-muted p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registros enviados:</span>
                <span className="font-medium">{result.num_received}</span>
              </div>
              {result.num_invalid_entries > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Registros inválidos:</span>
                  <span className="font-medium">{result.num_invalid_entries}</span>
                </div>
              )}
              {(result as any).batches_processed > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lotes processados:</span>
                  <span className="font-medium">{(result as any).batches_processed}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session ID:</span>
                <span className="font-mono text-xs">{result.session_id}</span>
              </div>
            </div>
            <div className="bg-accent/50 p-3 rounded-md text-sm">
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-primary" />
                <span>
                  O Meta pode levar até 24 horas para processar completamente os leads
                  e atualizar o tamanho do público.
                </span>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "csv" | "manual" | "segment")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="csv">
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Keyboard className="h-4 w-4 mr-2" />
                  Manual
                </TabsTrigger>
                <TabsTrigger value="segment">
                  <Database className="h-4 w-4 mr-2" />
                  Segmento
                </TabsTrigger>
              </TabsList>

              <TabsContent value="csv" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Cole os dados (CSV, separado por vírgula, ponto-e-vírgula ou tab)</Label>
                  <Textarea
                    value={csvData}
                    onChange={(e) => handleCsvChange(e.target.value)}
                    placeholder="email,telefone
joao@email.com,11999998888
maria@email.com,11988887777"
                    rows={8}
                    className="font-mono text-sm"
                    disabled={isProcessing}
                  />
                  {parsedCount > 0 && (
                    <Badge variant="secondary">
                      {parsedCount} lead{parsedCount > 1 ? "s" : ""} detectado{parsedCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <p className="font-medium mb-1">Formatos aceitos:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Emails e/ou telefones (com ou sem cabeçalho)</li>
                    <li>Telefones com ou sem código do país (+55)</li>
                    <li>Os dados serão criptografados (SHA256) antes do envio</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="space-y-3">
                  {manualData.map((row, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        {index === 0 && <Label className="text-xs">Email</Label>}
                        <Input
                          value={row.email || ""}
                          onChange={(e) => updateManualRow(index, "email", e.target.value)}
                          placeholder="email@exemplo.com"
                          disabled={isProcessing}
                        />
                      </div>
                      <div className="flex-1">
                        {index === 0 && <Label className="text-xs">Telefone</Label>}
                        <Input
                          value={row.phone || ""}
                          onChange={(e) => updateManualRow(index, "phone", e.target.value)}
                          placeholder="11999998888"
                          disabled={isProcessing}
                        />
                      </div>
                      {manualData.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeManualRow(index)}
                          disabled={isProcessing}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addManualRow}
                  disabled={isProcessing}
                >
                  + Adicionar linha
                </Button>
                {getValidManualData().length > 0 && (
                  <Badge variant="secondary">
                    {getValidManualData().length} lead{getValidManualData().length > 1 ? "s" : ""} válido
                    {getValidManualData().length > 1 ? "s" : ""}
                  </Badge>
                )}
              </TabsContent>

              <TabsContent value="segment" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Selecione um segmento do Lead Intelligence Hub</Label>
                  <Select
                    value={selectedSegmentId}
                    onValueChange={setSelectedSegmentId}
                    disabled={isProcessing || loadingSegments}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSegments ? "Carregando..." : "Selecione um segmento"} />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map((segment) => (
                        <SelectItem key={segment.id} value={segment.id}>
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span>{segment.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {segment.lead_count} lead{segment.lead_count !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSegmentId && (
                  <div className="bg-muted p-4 rounded-md space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Leads no segmento:</span>
                      <span className="font-medium">{segmentLeadsCount}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Todos os leads deste segmento serão enviados para o público personalizado.
                    </p>
                  </div>
                )}

                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <p className="font-medium mb-1">Como funciona:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Selecione um segmento existente</li>
                    <li>Todos os leads com email ou telefone serão incluídos</li>
                    <li>Os dados serão criptografados (SHA256) antes do envio ao Meta</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isProcessing}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isProcessing || !canSubmit}>
                {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Upload className="h-4 w-4 mr-2" />
                {mode === "segment" ? `Enviar ${segmentLeadsCount} Leads` : "Enviar Leads"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
