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
import { useLeadScoring } from "@/hooks/useLeadScoring";

interface LeadImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

type Step = "upload" | "mapping" | "confirm";

export const LeadImportModal = ({ open, onOpenChange, companyId }: LeadImportModalProps) => {
  const queryClient = useQueryClient();
  const { scoreAllCompanyLeads } = useLeadScoring();
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

  // Data sanitization functions for Brazilian formats
  const parseBoolean = (value: unknown): boolean | null => {
    if (!value || value === '-' || value === '') return null;
    const str = String(value).toLowerCase().trim();
    return str === 'sim' || str === 's' || str === 'yes' || str === 'y' || str === '1' || str === 'true';
  };

  const parseDate = (value: unknown): string | null => {
    if (!value || value === '-' || value === '') return null;
    const str = String(value).trim();
    // Try DD/MM/YYYY format
    const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) {
      const day = brMatch[1].padStart(2, '0');
      const month = brMatch[2].padStart(2, '0');
      const year = brMatch[3];
      return `${year}-${month}-${day}`;
    }
    // Try YYYY-MM-DD format (already correct)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    return null;
  };

  const parseCurrency = (value: unknown): number | null => {
    if (!value || value === '-' || value === '') return null;
    const str = String(value)
      .replace(/R\$\s*/gi, '')
      .replace(/\./g, '')      // Remove thousand separators
      .replace(',', '.')       // Convert decimal comma to dot
      .trim();
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  };

  const sanitizeValue = (value: unknown): unknown => {
    if (value === '-' || value === '' || value === null || value === undefined) {
      return null;
    }
    return value;
  };

  // Fields that need special parsing
  const BOOLEAN_FIELDS = ['simples_option', 'mei_option'];
  const DATE_FIELDS = ['registration_status_date', 'activity_start_date', 'simples_option_date', 'simples_exclusion_date'];
  const CURRENCY_FIELDS = ['share_capital'];

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

      setImportProgress(5);

      // STEP 1: Pre-process all leads with data sanitization
      const leadsWithMappedData = rawData.map(row => {
        const leadData: Record<string, unknown> = {
          company_id: companyId,
          created_at: new Date().toISOString(),
          first_captured_at: new Date().toISOString(),
          global_score: 0,
          total_conversions: 0,
          total_value: 0
        };
        
        Object.entries(fieldMapping).forEach(([column, field]) => {
          const rawValue = row[column];
          
          // Skip empty values
          if (rawValue === undefined || rawValue === null || rawValue === '' || rawValue === '-') {
            return;
          }
          
          // Apply appropriate parsing based on field type
          if (BOOLEAN_FIELDS.includes(field)) {
            leadData[field] = parseBoolean(rawValue);
          } else if (DATE_FIELDS.includes(field)) {
            leadData[field] = parseDate(rawValue);
          } else if (CURRENCY_FIELDS.includes(field)) {
            leadData[field] = parseCurrency(rawValue);
          } else {
            leadData[field] = sanitizeValue(rawValue);
          }
        });
        
        // Fallback: use company_name or company_trade_name as full_name if not provided
        if (!leadData.full_name) {
          const fallbackName = leadData.company_trade_name || leadData.company_name;
          if (fallbackName) {
            leadData.full_name = fallbackName;
          }
        }

        return leadData;
      });

      // Filter out leads without identifiable data
      const validLeads = leadsWithMappedData.filter(
        lead => lead.full_name || lead.email || lead.phone || lead.company_name || lead.cnpj
      );

      setImportProgress(10);

      // STEP 2: Calculate all hashes in parallel
      const leadsWithHashes = await Promise.all(
        validLeads.map(async (lead) => {
          const leadWithHash = { ...lead };
          if (lead.email) {
            leadWithHash.email_hash = await hashValue(String(lead.email));
          }
          if (lead.phone) {
            leadWithHash.phone_hash = await hashValue(String(lead.phone));
          }
          return leadWithHash;
        })
      );

      setImportProgress(20);

      // STEP 3: Fetch ALL existing hashes from database in one query
      const emailHashes = leadsWithHashes
        .map(l => l.email_hash)
        .filter((h): h is string => !!h);
      
      const phoneHashes = leadsWithHashes
        .map(l => l.phone_hash)
        .filter((h): h is string => !!h);

      // Batch fetch existing hashes (max 1000 per query for performance)
      const existingEmailHashes = new Set<string>();
      const existingPhoneHashes = new Set<string>();

      // Fetch email hashes in batches
      const emailBatchSize = 500;
      for (let i = 0; i < emailHashes.length; i += emailBatchSize) {
        const batch = emailHashes.slice(i, i + emailBatchSize);
        if (batch.length > 0) {
          const { data: existingEmails } = await supabase
            .from('lead_master_pool')
            .select('email_hash')
            .eq('company_id', companyId)
            .in('email_hash', batch);
          
          existingEmails?.forEach(e => {
            if (e.email_hash) existingEmailHashes.add(e.email_hash);
          });
        }
      }

      // Fetch phone hashes in batches
      for (let i = 0; i < phoneHashes.length; i += emailBatchSize) {
        const batch = phoneHashes.slice(i, i + emailBatchSize);
        if (batch.length > 0) {
          const { data: existingPhones } = await supabase
            .from('lead_master_pool')
            .select('phone_hash')
            .eq('company_id', companyId)
            .in('phone_hash', batch);
          
          existingPhones?.forEach(p => {
            if (p.phone_hash) existingPhoneHashes.add(p.phone_hash);
          });
        }
      }

      setImportProgress(30);

      // STEP 4: Filter out duplicates locally (no DB queries)
      const newLeads: Record<string, unknown>[] = [];
      const seenHashes = new Set<string>();

      for (const lead of leadsWithHashes) {
        const emailHash = lead.email_hash as string | undefined;
        const phoneHash = lead.phone_hash as string | undefined;
        
        // Check if duplicate in database
        if (emailHash && existingEmailHashes.has(emailHash)) {
          duplicates++;
          continue;
        }
        if (phoneHash && existingPhoneHashes.has(phoneHash)) {
          duplicates++;
          continue;
        }
        
        // Check if duplicate within this import (same file)
        const uniqueKey = emailHash || phoneHash || '';
        if (uniqueKey && seenHashes.has(uniqueKey)) {
          duplicates++;
          continue;
        }
        if (uniqueKey) seenHashes.add(uniqueKey);
        
        newLeads.push(lead);
      }

      setImportProgress(40);

      // STEP 5: Batch insert leads
      const insertBatchSize = 100;
      const insertedLeadIds: string[] = [];
      const totalBatches = Math.ceil(newLeads.length / insertBatchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batch = newLeads.slice(i * insertBatchSize, (i + 1) * insertBatchSize).map(lead => ({
          ...lead,
          full_name: lead.full_name || lead.company_name || lead.company_trade_name || lead.email || lead.cnpj || 'Lead sem nome'
        }));
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: insertedBatch, error } = await supabase
          .from('lead_master_pool')
          .insert(batch as any)
          .select('id');
        
        if (error) {
          console.error("Batch insert error:", error);
          // Try inserting one by one for this failed batch
          for (const lead of batch) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: single, error: singleError } = await supabase
              .from('lead_master_pool')
              .insert(lead as any)
              .select('id')
              .single();
            
            if (!singleError && single) {
              insertedLeadIds.push(single.id);
              imported++;
            } else {
              console.error("Single insert error:", singleError, lead);
            }
          }
        } else if (insertedBatch) {
          insertedBatch.forEach(l => insertedLeadIds.push(l.id));
          imported += insertedBatch.length;
        }
        
        // Update progress (40% to 80%)
        const progress = 40 + Math.round((i + 1) / totalBatches * 40);
        setImportProgress(progress);
      }

      setImportProgress(85);

      // STEP 6: Batch assign to segment
      if (segmentId && insertedLeadIds.length > 0) {
        const segmentAssignments = insertedLeadIds.map(leadId => ({
          lead_id: leadId,
          segment_id: segmentId
        }));

        // Insert segment assignments in batches
        for (let i = 0; i < segmentAssignments.length; i += insertBatchSize) {
          const batch = segmentAssignments.slice(i, i + insertBatchSize);
          await supabase
            .from('lead_segment_assignments')
            .insert(batch);
        }
      }

      setImportProgress(95);

      // Log import to history
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
      
      setImportProgress(100);
      setImportResult({ imported, duplicates });
      queryClient.invalidateQueries({ queryKey: ['lead-pool'] });
      queryClient.invalidateQueries({ queryKey: ['lead-pool-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lead-segments'] });
      queryClient.invalidateQueries({ queryKey: ['lead-segments-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['lead-import-history'] });
      
      toast.success(`${imported} leads importados com sucesso!`);
      
      // Recalcular scores em segundo plano após importação
      if (imported > 0) {
        toast.info("Recalculando scores dos leads em segundo plano...");
        scoreAllCompanyLeads()
          .then((scoredCount) => {
            queryClient.invalidateQueries({ queryKey: ['lead-pool'] });
            queryClient.invalidateQueries({ queryKey: ['lead-classification-stats'] });
            queryClient.invalidateQueries({ queryKey: ['lead-segments-dashboard'] });
            toast.success(`${scoredCount} leads recalculados com sucesso!`);
          })
          .catch((err) => {
            console.error("Error recalculating scores:", err);
            toast.error("Erro ao recalcular scores dos leads");
          });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erro durante a importação");
      
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
