import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { LeadFieldMapper, LEAD_FIELDS } from "./LeadFieldMapper";
import { LeadImportPreview } from "./LeadImportPreview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";

interface LeadImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

type Step = "upload" | "mapping" | "confirm";

export const LeadImportModal = ({ open, onOpenChange, companyId }: LeadImportModalProps) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [newSegmentName, setNewSegmentName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number } | null>(null);

  const { data: segments } = useQuery({
    queryKey: ['lead-segments', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_segments')
        .select('*')
        .eq('company_id', companyId)
        .order('name');
      return data || [];
    },
    enabled: !!companyId && open
  });

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    try {
      setFile(selectedFile);
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Get the range to find actual data boundaries
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Try to find the header row (first row with multiple non-empty cells)
      let headerRowIndex = 0;
      for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
        let nonEmptyCells = 0;
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[cellAddress];
          if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
            nonEmptyCells++;
          }
        }
        // Consider a row as header if it has at least 2 non-empty cells
        if (nonEmptyCells >= 2) {
          headerRowIndex = r;
          break;
        }
      }
      
      // Parse with the detected header row
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        range: headerRowIndex,
        defval: '',
        raw: false
      });
      
      if (jsonData.length === 0) {
        toast.error("Arquivo vazio ou formato inválido");
        return;
      }

      // Filter out columns that are empty or have generic names like "__EMPTY"
      const cols = Object.keys(jsonData[0]).filter(col => {
        const normalizedCol = col.trim().toLowerCase();
        return normalizedCol && !normalizedCol.startsWith('__empty') && col.trim() !== '';
      });
      
      // If no valid columns found, try getting all non-empty keys
      const validCols = cols.length > 0 ? cols : Object.keys(jsonData[0]).filter(col => col.trim() !== '');
      
      setColumns(validCols);
      setRawData(jsonData);
      
      // Auto-map columns based on similarity
      const autoMapping: Record<string, string> = {};
      cols.forEach(col => {
        const normalizedCol = col.toLowerCase().replace(/[_\s-]/g, '');
        const matchedField = LEAD_FIELDS.find(f => {
          const normalizedKey = f.key.toLowerCase().replace(/[_\s-]/g, '');
          const normalizedLabel = f.label.toLowerCase().replace(/[_\s-]/g, '');
          return normalizedCol.includes(normalizedKey) || 
                 normalizedKey.includes(normalizedCol) ||
                 normalizedCol.includes(normalizedLabel) ||
                 normalizedLabel.includes(normalizedCol);
        });
        if (matchedField) {
          autoMapping[col] = matchedField.key;
        }
      });
      setFieldMapping(autoMapping);
      setStep("mapping");
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Erro ao processar arquivo");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      handleFileSelect(droppedFile);
    } else {
      toast.error("Formato inválido. Use CSV ou XLSX.");
    }
  }, [handleFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const hashValue = async (value: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(value.toLowerCase().trim());
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleImport = async () => {
    if (!companyId) return;
    
    setIsImporting(true);
    setImportProgress(0);
    
    let imported = 0;
    let duplicates = 0;
    
    try {
      // Determine segment ID
      let segmentId = selectedSegmentId;
      
      if (newSegmentName && !selectedSegmentId) {
        // Create new segment
        const { data: newSegment, error } = await supabase
          .from('lead_segments')
          .insert({
            company_id: companyId,
            name: newSegmentName,
            segment_type: 'sector',
            is_auto: false,
            color: '#3b82f6',
            icon: '📁'
          })
          .select()
          .single();
        
        if (error) throw error;
        segmentId = newSegment.id;
      }
      
      const batchSize = 50;
      const batches = Math.ceil(rawData.length / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const batch = rawData.slice(i * batchSize, (i + 1) * batchSize);
        
        for (const row of batch) {
          const leadData: Record<string, unknown> = {
            company_id: companyId,
            created_at: new Date().toISOString(),
            first_captured_at: new Date().toISOString(),
            global_score: 0,
            total_conversions: 0,
            total_value: 0
          };
          
          // Map fields
          Object.entries(fieldMapping).forEach(([column, field]) => {
            if (row[column] !== undefined && row[column] !== null && row[column] !== '') {
              leadData[field] = row[column];
            }
          });
          
          // Generate hashes for deduplication (MUST await async function)
          if (leadData.email) {
            leadData.email_hash = await hashValue(String(leadData.email));
          }
          if (leadData.phone) {
            leadData.phone_hash = await hashValue(String(leadData.phone));
          }
          
          // Validate required field
          if (!leadData.full_name && !leadData.email && !leadData.phone) {
            console.warn("Skipping row - no identifiable data (name, email, or phone):", row);
            continue;
          }
          
          // Check for duplicates
          let isDuplicate = false;
          if (leadData.email_hash) {
            const { data: existing } = await supabase
              .from('lead_master_pool')
              .select('id')
              .eq('company_id', companyId)
              .eq('email_hash', String(leadData.email_hash))
              .maybeSingle();
            if (existing) isDuplicate = true;
          }
          
          if (!isDuplicate && leadData.phone_hash) {
            const { data: existing } = await supabase
              .from('lead_master_pool')
              .select('id')
              .eq('company_id', companyId)
              .eq('phone_hash', String(leadData.phone_hash))
              .maybeSingle();
            if (existing) isDuplicate = true;
          }
          
          if (isDuplicate) {
            duplicates++;
            continue;
          }
          
          // Insert lead
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: newLead, error } = await supabase
            .from('lead_master_pool')
            .insert(leadData as any)
            .select()
            .single();
          
          if (error) {
            console.error("Error inserting lead:", error, "Lead data:", JSON.stringify(leadData, null, 2));
            continue;
          }
          
          imported++;
          
          // Assign to segment
          if (segmentId && newLead) {
            await supabase
              .from('lead_segment_assignments')
              .insert({
                lead_id: newLead.id,
                segment_id: segmentId
              });
          }
        }
        
        setImportProgress(Math.round(((i + 1) / batches) * 100));
      }
      
      // Log import to history (LGPD compliant - no personal data)
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('lead_import_history')
        .insert({
          company_id: companyId,
          imported_by: user?.id || '',
          file_name: file?.name || 'unknown',
          total_rows: rawData.length,
          leads_imported: imported,
          leads_duplicated: duplicates,
          default_segment_id: segmentId || null,
          status: 'completed'
        });
      
      setImportResult({ imported, duplicates });
      queryClient.invalidateQueries({ queryKey: ['lead-pool'] });
      queryClient.invalidateQueries({ queryKey: ['lead-pool-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lead-segments'] });
      queryClient.invalidateQueries({ queryKey: ['lead-import-history'] });
      
      toast.success(`${imported} leads importados com sucesso!`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erro durante a importação");
      
      // Log failed import
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('lead_import_history')
        .insert({
          company_id: companyId,
          imported_by: user?.id || '',
          file_name: file?.name || 'unknown',
          total_rows: rawData.length,
          leads_imported: imported,
          leads_duplicated: duplicates,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
    } finally {
      setIsImporting(false);
    }
  };

  const resetModal = () => {
    setStep("upload");
    setFile(null);
    setRawData([]);
    setColumns([]);
    setFieldMapping({});
    setSelectedSegmentId("");
    setNewSegmentName("");
    setImportProgress(0);
    setImportResult(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetModal();
    onOpenChange(open);
  };

  const getMappedData = () => {
    return rawData.slice(0, 5).map(row => {
      const mapped: Record<string, unknown> = {};
      Object.entries(fieldMapping).forEach(([column, field]) => {
        mapped[field] = row[column];
      });
      return mapped;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Leads
          </DialogTitle>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</div>
            <span className="text-sm">Upload</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step === 'mapping' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'mapping' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</div>
            <span className="text-sm">Mapear</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'confirm' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</div>
            <span className="text-sm">Confirmar</span>
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Arraste um arquivo ou clique para selecionar</p>
            <p className="text-sm text-muted-foreground">Suporta CSV, XLS e XLSX</p>
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === "mapping" && (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm">
                <strong>{file?.name}</strong> • {rawData.length} linhas • {columns.length} colunas
              </p>
            </div>
            
            <LeadFieldMapper
              columns={columns}
              fieldMapping={fieldMapping}
              onMappingChange={setFieldMapping}
              sampleRow={rawData[0]}
            />

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={() => setStep("confirm")} disabled={Object.keys(fieldMapping).length === 0}>
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <div className="space-y-6">
            {!importResult ? (
              <>
                <div className="space-y-4">
                  <Label>Segmento para os leads importados</Label>
                  <div className="flex gap-4">
                    <Select value={selectedSegmentId} onValueChange={(v) => { setSelectedSegmentId(v); setNewSegmentName(""); }}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione um segmento existente" />
                      </SelectTrigger>
                      <SelectContent>
                        {segments?.map(seg => (
                          <SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground self-center">ou</span>
                    <Input
                      placeholder="Criar novo segmento..."
                      value={newSegmentName}
                      onChange={(e) => { setNewSegmentName(e.target.value); setSelectedSegmentId(""); }}
                      className="flex-1"
                    />
                  </div>
                </div>

                <LeadImportPreview
                  data={getMappedData()}
                  fieldMapping={fieldMapping}
                />

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm"><strong>{rawData.length}</strong> leads serão processados</p>
                  <p className="text-xs text-muted-foreground">Leads duplicados (mesmo email ou telefone) serão ignorados</p>
                </div>

                {isImporting && (
                  <div className="space-y-2">
                    <Progress value={importProgress} />
                    <p className="text-sm text-center text-muted-foreground">Importando... {importProgress}%</p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep("mapping")} disabled={isImporting}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button onClick={handleImport} disabled={isImporting || (!selectedSegmentId && !newSegmentName)}>
                    <Check className="h-4 w-4 mr-2" />
                    Importar Leads
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Check className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-xl font-semibold mb-2">Importação Concluída!</h3>
                <p className="text-muted-foreground mb-4">
                  <strong>{importResult.imported}</strong> leads importados
                  {importResult.duplicates > 0 && (
                    <span className="block text-yellow-600">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      {importResult.duplicates} duplicados ignorados
                    </span>
                  )}
                </p>
                <Button onClick={() => handleClose(false)}>Fechar</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
