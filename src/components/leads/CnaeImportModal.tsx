import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Check, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

interface CnaeImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  sampleRow: Record<string, string>;
}

interface FieldMapping {
  [key: string]: string;
}

const CNAE_LEAD_FIELDS = [
  { key: 'cnpj', label: 'CNPJ', required: true },
  { key: 'cnae_code', label: 'Código CNAE', required: true },
  { key: 'cnae_description', label: 'Descrição CNAE', required: false },
  { key: 'company_name', label: 'Razão Social', required: false },
  { key: 'trade_name', label: 'Nome Fantasia', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Telefone', required: false },
  { key: 'street', label: 'Logradouro', required: false },
  { key: 'number', label: 'Número', required: false },
  { key: 'complement', label: 'Complemento', required: false },
  { key: 'neighborhood', label: 'Bairro', required: false },
  { key: 'city', label: 'Cidade', required: false },
  { key: 'state', label: 'UF', required: false },
  { key: 'zip_code', label: 'CEP', required: false },
  { key: 'legal_nature', label: 'Natureza Jurídica', required: false },
  { key: 'share_capital', label: 'Capital Social', required: false },
  { key: 'company_size', label: 'Porte', required: false },
  { key: 'registration_status', label: 'Situação Cadastral', required: false },
  { key: 'registration_status_date', label: 'Data Situação', required: false },
  { key: 'activity_start_date', label: 'Data Início Atividade', required: false },
  { key: 'simples_option', label: 'Opção pelo Simples', required: false },
  { key: 'simples_option_date', label: 'Data Opção Simples', required: false },
  { key: 'simples_exclusion_date', label: 'Data Exclusão Simples', required: false },
  { key: 'mei_option', label: 'Opção pelo MEI', required: false },
  { key: 'partner_name', label: 'Nome do Sócio', required: false },
  { key: 'partner_cpf', label: 'CPF do Sócio', required: false },
  { key: 'secondary_cnaes', label: 'CNAEs Secundários', required: false },
];

type Step = 'upload' | 'mapping' | 'confirm';

export function CnaeImportModal({ open, onOpenChange }: CnaeImportModalProps) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; duplicates: number } | null>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setParsedData(null);
    setFieldMapping({});
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [onOpenChange, resetState]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { 
        header: 1,
        raw: false,
        defval: ''
      });

      if (jsonData.length < 2) {
        toast.error("Arquivo deve ter pelo menos 2 linhas (cabeçalho + dados)");
        return;
      }

      const headers = (jsonData[0] as unknown as string[]).map(h => String(h || '').trim());
      const rows = jsonData.slice(1).map((row: unknown) => {
        const rowArray = row as string[];
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = String(rowArray[index] || '').trim();
        });
        return obj;
      }).filter(row => Object.values(row).some(v => v !== ''));

      const sampleRow = rows[0] || {};

      setParsedData({ headers, rows, sampleRow });

      // Auto-map fields based on header names
      const autoMapping: FieldMapping = {};
      headers.forEach(header => {
        const headerLower = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        if (headerLower.includes('cnpj')) autoMapping[header] = 'cnpj';
        else if (headerLower.includes('cnae') && headerLower.includes('principal')) autoMapping[header] = 'cnae_code';
        else if (headerLower.includes('cnae') && headerLower.includes('desc')) autoMapping[header] = 'cnae_description';
        else if (headerLower.includes('razao') || headerLower.includes('social')) autoMapping[header] = 'company_name';
        else if (headerLower.includes('fantasia') || headerLower.includes('trade')) autoMapping[header] = 'trade_name';
        else if (headerLower.includes('email')) autoMapping[header] = 'email';
        else if (headerLower.includes('telefone') || headerLower.includes('phone')) autoMapping[header] = 'phone';
        else if (headerLower.includes('logradouro') || headerLower.includes('street')) autoMapping[header] = 'street';
        else if (headerLower.includes('numero') && !headerLower.includes('cnpj')) autoMapping[header] = 'number';
        else if (headerLower.includes('complemento')) autoMapping[header] = 'complement';
        else if (headerLower.includes('bairro') || headerLower.includes('neighborhood')) autoMapping[header] = 'neighborhood';
        else if (headerLower.includes('municipio') || headerLower.includes('cidade') || headerLower.includes('city')) autoMapping[header] = 'city';
        else if (headerLower === 'uf' || headerLower === 'estado' || headerLower === 'state') autoMapping[header] = 'state';
        else if (headerLower.includes('cep') || headerLower.includes('zip')) autoMapping[header] = 'zip_code';
        else if (headerLower.includes('natureza')) autoMapping[header] = 'legal_nature';
        else if (headerLower.includes('capital')) autoMapping[header] = 'share_capital';
        else if (headerLower.includes('porte')) autoMapping[header] = 'company_size';
        else if (headerLower.includes('situacao') && headerLower.includes('cadastral')) autoMapping[header] = 'registration_status';
        else if (headerLower.includes('data') && headerLower.includes('situacao')) autoMapping[header] = 'registration_status_date';
        else if (headerLower.includes('inicio') && headerLower.includes('atividade')) autoMapping[header] = 'activity_start_date';
        else if (headerLower.includes('simples') && headerLower.includes('opcao')) autoMapping[header] = 'simples_option';
        else if (headerLower.includes('simples') && headerLower.includes('data')) autoMapping[header] = 'simples_option_date';
        else if (headerLower.includes('exclusao') && headerLower.includes('simples')) autoMapping[header] = 'simples_exclusion_date';
        else if (headerLower.includes('mei')) autoMapping[header] = 'mei_option';
        else if (headerLower.includes('socio') && headerLower.includes('nome')) autoMapping[header] = 'partner_name';
        else if (headerLower.includes('socio') && headerLower.includes('cpf')) autoMapping[header] = 'partner_cpf';
        else if (headerLower.includes('cnae') && headerLower.includes('secundar')) autoMapping[header] = 'secondary_cnaes';
      });

      setFieldMapping(autoMapping);
      setStep('mapping');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error("Erro ao processar arquivo");
    }
  }, []);

  const handleMappingChange = (header: string, fieldKey: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [header]: fieldKey === 'none' ? '' : fieldKey
    }));
  };

  const canProceedToConfirm = () => {
    const mappedFields = Object.values(fieldMapping).filter(Boolean);
    return mappedFields.includes('cnpj') && mappedFields.includes('cnae_code');
  };

  const sanitizeValue = (value: string, fieldKey: string): string | number | boolean | null => {
    if (!value || value === '-' || value === '') return null;

    // Boolean fields
    if (fieldKey === 'simples_option' || fieldKey === 'mei_option') {
      const lower = value.toLowerCase().trim();
      if (lower === 'sim' || lower === 's' || lower === 'true' || lower === '1') return true;
      if (lower === 'não' || lower === 'nao' || lower === 'n' || lower === 'false' || lower === '0') return false;
      return null;
    }

    // Date fields
    if (fieldKey.includes('date')) {
      // Try to convert DD/MM/YYYY to YYYY-MM-DD
      const dateMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (dateMatch) {
        return `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }
      // Already in ISO format
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.split('T')[0];
      }
      return null;
    }

    // Numeric fields
    if (fieldKey === 'share_capital') {
      // Remove R$, dots, and convert comma to dot
      const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }

    return value.trim();
  };

  const handleImport = async () => {
    if (!companyId || !parsedData) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const BATCH_SIZE = 100;
      let successCount = 0;
      let duplicateCount = 0;

      for (let i = 0; i < parsedData.rows.length; i += BATCH_SIZE) {
        const batch = parsedData.rows.slice(i, i + BATCH_SIZE);
        
        const leadsToInsert = batch.map(row => {
          const lead: Record<string, string | number | boolean | null> = {
            company_id: companyId,
          };

          Object.entries(fieldMapping).forEach(([header, fieldKey]) => {
            if (fieldKey && row[header] !== undefined) {
              lead[fieldKey] = sanitizeValue(row[header], fieldKey);
            }
          });

          return lead;
        }).filter(lead => lead.cnpj && lead.cnae_code);

        if (leadsToInsert.length > 0) {
          const { data, error } = await supabase
            .from('cnae_lead_pool' as any)
            .upsert(leadsToInsert as any, { 
              onConflict: 'company_id,cnpj,cnae_code',
              ignoreDuplicates: true 
            })
            .select('id');

          if (error) {
            console.error('Insert error:', error);
            throw error;
          }

          successCount += data?.length || 0;
          duplicateCount += leadsToInsert.length - (data?.length || 0);
        }

        setImportProgress(Math.min(100, Math.round(((i + BATCH_SIZE) / parsedData.rows.length) * 100)));
      }

      setImportResult({ success: successCount, duplicates: duplicateCount });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['cnae-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['cnae-leads-count'] });
      queryClient.invalidateQueries({ queryKey: ['cnae-leads'] });

      toast.success(`Importação concluída: ${successCount} leads importados`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Erro ao importar leads");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Planilha para Base CNAE
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && "Selecione um arquivo CSV ou XLSX com os dados dos leads por CNAE"}
            {step === 'mapping' && "Mapeie as colunas do arquivo para os campos do sistema"}
            {step === 'confirm' && "Revise e confirme a importação"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4 border-b">
          <div className={`flex items-center gap-1 ${step === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Badge variant={step === 'upload' ? 'default' : 'secondary'} className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
              1
            </Badge>
            <span className="text-sm">Upload</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-1 ${step === 'mapping' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Badge variant={step === 'mapping' ? 'default' : 'secondary'} className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
              2
            </Badge>
            <span className="text-sm">Mapeamento</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-1 ${step === 'confirm' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Badge variant={step === 'confirm' ? 'default' : 'secondary'} className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
              3
            </Badge>
            <span className="text-sm">Confirmar</span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="p-6 flex flex-col items-center justify-center h-full">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center w-full max-w-md">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Arraste um arquivo ou clique para selecionar</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Suporta arquivos CSV e XLSX
                </p>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && parsedData && (
            <ScrollArea className="h-[400px] p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Campos obrigatórios: <strong>CNPJ</strong> e <strong>Código CNAE</strong>
                  </span>
                </div>

                {parsedData.headers.map((header) => (
                  <div key={header} className="grid grid-cols-3 gap-4 items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{header}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Ex: {parsedData.sampleRow[header] || '-'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground justify-self-center" />
                    <Select
                      value={fieldMapping[header] || 'none'}
                      onValueChange={(value) => handleMappingChange(header, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o campo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não importar</SelectItem>
                        {CNAE_LEAD_FIELDS.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label} {field.required && '*'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && parsedData && (
            <div className="p-6 space-y-4">
              {!importResult ? (
                <>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Total de registros:</span>
                      <strong>{parsedData.rows.length.toLocaleString('pt-BR')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Campos mapeados:</span>
                      <strong>{Object.values(fieldMapping).filter(Boolean).length}</strong>
                    </div>
                  </div>

                  {isImporting && (
                    <div className="space-y-2">
                      <Progress value={importProgress} />
                      <p className="text-sm text-center text-muted-foreground">
                        Importando... {importProgress}%
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium">Importação concluída!</h3>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Leads importados:</span>
                      <strong className="text-green-600">{importResult.success.toLocaleString('pt-BR')}</strong>
                    </div>
                    {importResult.duplicates > 0 && (
                      <div className="flex justify-between">
                        <span>Duplicados ignorados:</span>
                        <strong className="text-muted-foreground">{importResult.duplicates.toLocaleString('pt-BR')}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {step !== 'upload' && !importResult && (
              <Button variant="ghost" onClick={() => setStep(step === 'confirm' ? 'mapping' : 'upload')}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              {importResult ? 'Fechar' : 'Cancelar'}
            </Button>
            {step === 'mapping' && (
              <Button onClick={() => setStep('confirm')} disabled={!canProceedToConfirm()}>
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 'confirm' && !importResult && (
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? 'Importando...' : 'Importar Leads'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
