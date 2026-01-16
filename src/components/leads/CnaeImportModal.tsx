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
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileSpreadsheet, Check, AlertCircle, ChevronRight, ChevronLeft, Phone, RefreshCw, Ban } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  { key: 'razao_social', label: 'Razão Social', required: false },
  { key: 'nome_fantasia', label: 'Nome Fantasia', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'ddd', label: 'DDD', required: false },
  { key: 'phone', label: 'Telefone', required: false },
  { key: 'phone_2', label: 'Telefone 2', required: false },
  { key: 'phone_3', label: 'Telefone 3 (Celular)', required: false },
  { key: 'logradouro', label: 'Logradouro', required: false },
  { key: 'numero', label: 'Número', required: false },
  { key: 'complemento', label: 'Complemento', required: false },
  { key: 'bairro', label: 'Bairro', required: false },
  { key: 'municipio', label: 'Cidade', required: false },
  { key: 'uf', label: 'UF', required: false },
  { key: 'cep', label: 'CEP', required: false },
  { key: 'natureza_juridica', label: 'Natureza Jurídica', required: false },
  { key: 'capital_social', label: 'Capital Social', required: false },
  { key: 'porte', label: 'Porte', required: false },
  { key: 'situacao_cadastral', label: 'Situação Cadastral', required: false },
  { key: 'data_situacao', label: 'Data Situação', required: false },
  { key: 'data_abertura', label: 'Data Abertura', required: false },
  { key: 'simples_option', label: 'Optante Simples Nacional', required: false },
  { key: 'simples_option_date', label: 'Data Opção Simples', required: false },
  { key: 'mei_option', label: 'Optante MEI', required: false },
  { key: 'partner_name', label: 'Nome do Sócio/Proprietário', required: false },
  { key: 'partner_role', label: 'Cargo do Sócio', required: false },
  { key: 'partner_cpf', label: 'CPF do Sócio', required: false },
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
  const [importResult, setImportResult] = useState<{ success: number; duplicates: number; updated?: number } | null>(null);
  const [mergeDddWithPhone, setMergeDddWithPhone] = useState(false);
  const [importMode, setImportMode] = useState<'ignore' | 'update'>('ignore');

  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setParsedData(null);
    setFieldMapping({});
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
    setMergeDddWithPhone(false);
    setImportMode('ignore');
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [onOpenChange, resetState]);

  // Check if DDD field is mapped
  const isDddMapped = Object.values(fieldMapping).includes('ddd');

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
        else if (headerLower.includes('razao') || headerLower.includes('social')) autoMapping[header] = 'razao_social';
        else if (headerLower.includes('fantasia') || headerLower.includes('trade')) autoMapping[header] = 'nome_fantasia';
        else if (headerLower.includes('email')) autoMapping[header] = 'email';
        // DDD detection
        else if (headerLower === 'ddd') autoMapping[header] = 'ddd';
        // Phone detection - must come after DDD check
        else if (
          (headerLower.includes('telefone2') || headerLower.includes('telefone 2') || headerLower === 'telefone_2')
        ) autoMapping[header] = 'phone_2';
        else if (
          (headerLower.includes('telefone3') || headerLower.includes('telefone 3') || headerLower === 'telefone_3' ||
           headerLower.includes('celular') || headerLower === 'cel')
        ) autoMapping[header] = 'phone_3';
        else if (
          (headerLower.includes('telefone') || headerLower.includes('phone') || headerLower === 'tel') &&
          !headerLower.includes('2') && !headerLower.includes('3')
        ) autoMapping[header] = 'phone';
        else if (headerLower.includes('logradouro') || headerLower.includes('street')) autoMapping[header] = 'logradouro';
        else if (headerLower.includes('numero') && !headerLower.includes('cnpj')) autoMapping[header] = 'numero';
        else if (headerLower.includes('complemento')) autoMapping[header] = 'complemento';
        else if (headerLower.includes('bairro') || headerLower.includes('neighborhood')) autoMapping[header] = 'bairro';
        else if (headerLower.includes('municipio') || headerLower.includes('cidade') || headerLower.includes('city')) autoMapping[header] = 'municipio';
        else if (headerLower === 'uf' || headerLower === 'estado' || headerLower === 'state') autoMapping[header] = 'uf';
        else if (headerLower.includes('cep') || headerLower.includes('zip')) autoMapping[header] = 'cep';
        else if (headerLower.includes('natureza')) autoMapping[header] = 'natureza_juridica';
        else if (headerLower.includes('capital')) autoMapping[header] = 'capital_social';
        else if (headerLower.includes('porte')) autoMapping[header] = 'porte';
        else if (headerLower.includes('situacao') && headerLower.includes('cadastral')) autoMapping[header] = 'situacao_cadastral';
        else if (headerLower.includes('data') && headerLower.includes('situacao')) autoMapping[header] = 'data_situacao';
        else if (headerLower.includes('abertura') || (headerLower.includes('inicio') && headerLower.includes('atividade'))) autoMapping[header] = 'data_abertura';
        // Simples Nacional e MEI
        else if ((headerLower.includes('simples') || headerLower.includes('sn')) && (headerLower.includes('opcao') || headerLower.includes('optante'))) autoMapping[header] = 'simples_option';
        else if (headerLower.includes('simples') && headerLower.includes('data')) autoMapping[header] = 'simples_option_date';
        else if (headerLower.includes('mei') && (headerLower.includes('opcao') || headerLower.includes('optante'))) autoMapping[header] = 'mei_option';
        // Sócio/Proprietário
        else if ((headerLower.includes('socio') || headerLower.includes('proprietario') || headerLower.includes('responsavel')) && 
                 (headerLower.includes('nome') || !headerLower.includes('cpf') && !headerLower.includes('cargo') && !headerLower.includes('qualificacao'))) autoMapping[header] = 'partner_name';
        else if ((headerLower.includes('socio') || headerLower.includes('proprietario') || headerLower.includes('responsavel')) && 
                 (headerLower.includes('cargo') || headerLower.includes('qualificacao') || headerLower.includes('funcao'))) autoMapping[header] = 'partner_role';
        else if ((headerLower.includes('socio') || headerLower.includes('proprietario') || headerLower.includes('responsavel')) && 
                 headerLower.includes('cpf')) autoMapping[header] = 'partner_cpf';
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

    // Date fields
    if (fieldKey.includes('data') || fieldKey.includes('date')) {
      // Try to convert DD/MM/YYYY to YYYY-MM-DD
      const dateMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (dateMatch) {
        return `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }
      // Already in ISO format
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.split('T')[0];
      }
      return value;
    }

    // Numeric fields
    if (fieldKey === 'capital_social') {
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

      // Find which headers map to which fields
      const dddHeader = Object.entries(fieldMapping).find(([, v]) => v === 'ddd')?.[0];
      const phoneHeader = Object.entries(fieldMapping).find(([, v]) => v === 'phone')?.[0];
      const phone2Header = Object.entries(fieldMapping).find(([, v]) => v === 'phone_2')?.[0];
      const phone3Header = Object.entries(fieldMapping).find(([, v]) => v === 'phone_3')?.[0];

      // First, deduplicate all rows by CNPJ (keep last occurrence for most recent data)
      const deduplicatedRows = new Map<string, Record<string, string>>();
      parsedData.rows.forEach(row => {
        const cnpjHeader = Object.entries(fieldMapping).find(([, v]) => v === 'cnpj')?.[0];
        if (cnpjHeader) {
          const cnpj = (row[cnpjHeader] || '').trim();
          if (cnpj) {
            deduplicatedRows.set(cnpj, row);
          }
        }
      });
      
      const uniqueRows = Array.from(deduplicatedRows.values());

      for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
        const batch = uniqueRows.slice(i, i + BATCH_SIZE);
        
        const leadsToInsert = batch.map(row => {
          const lead: Record<string, string | number | boolean | null> = {
            company_id: companyId,
          };

          // Get DDD value if mapped
          const dddValue = dddHeader ? (row[dddHeader] || '').trim() : '';

          Object.entries(fieldMapping).forEach(([header, fieldKey]) => {
            if (fieldKey && row[header] !== undefined) {
              let value = sanitizeValue(row[header], fieldKey);

              // If merge DDD is enabled and this is a phone field, concatenate DDD
              if (mergeDddWithPhone && dddValue && (fieldKey === 'phone' || fieldKey === 'phone_2' || fieldKey === 'phone_3')) {
                const phoneValue = String(value || '').trim();
                if (phoneValue && !phoneValue.startsWith(dddValue)) {
                  value = `${dddValue}${phoneValue}`;
                }
              }

              lead[fieldKey] = value;
            }
          });

          // If merge DDD is enabled, don't save DDD separately (optional behavior)
          // If you want to keep DDD even when merged, comment out the next line:
          // if (mergeDddWithPhone) delete lead.ddd;

          return lead;
        }).filter(lead => lead.cnpj && lead.cnae_code);

        if (leadsToInsert.length > 0) {
          const { data, error } = await supabase
            .from('cnae_lead_pool' as any)
            .upsert(leadsToInsert as any, { 
              onConflict: 'cnpj,company_id',
              ignoreDuplicates: importMode === 'ignore'
            })
            .select('id');

          if (error) {
            console.error('Insert error:', error);
            throw error;
          }

          const returnedCount = data?.length || 0;
          const batchTotal = leadsToInsert.length;
          
          if (importMode === 'update') {
            // In update mode, all returned are either new or updated
            successCount += returnedCount;
          } else {
            // In ignore mode, returned = new, difference = duplicates ignored
            successCount += returnedCount;
            duplicateCount += batchTotal - returnedCount;
          }
        }

        setImportProgress(Math.min(100, Math.round(((i + BATCH_SIZE) / uniqueRows.length) * 100)));
      }

      setImportResult({ 
        success: successCount, 
        duplicates: importMode === 'ignore' ? duplicateCount : 0,
        updated: importMode === 'update' ? successCount : undefined
      });
      
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

                {/* DDD Merge Option - Shows when DDD is mapped */}
                {isDddMapped && (
                  <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                    <Phone className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="merge-ddd"
                          checked={mergeDddWithPhone}
                          onCheckedChange={(checked) => setMergeDddWithPhone(!!checked)}
                        />
                        <label 
                          htmlFor="merge-ddd" 
                          className="text-sm font-medium cursor-pointer"
                        >
                          Juntar DDD aos telefones durante a importação
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        O DDD será concatenado no início de cada telefone (ex: 11 + 99999999 = 1199999999)
                      </p>
                    </div>
                  </div>
                )}

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
                    {mergeDddWithPhone && isDddMapped && (
                      <div className="flex justify-between text-primary">
                        <span>DDD será concatenado aos telefones:</span>
                        <strong>Sim</strong>
                      </div>
                    )}
                  </div>

                  {/* Import Mode Selection */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-sm">Modo de Importação</h4>
                    <RadioGroup
                      value={importMode}
                      onValueChange={(value) => setImportMode(value as 'ignore' | 'update')}
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="ignore" id="mode-ignore" className="mt-0.5" />
                        <Label htmlFor="mode-ignore" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Ban className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Ignorar duplicados</span>
                            <Badge variant="secondary" className="text-xs">Padrão</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Leads com mesmo CNPJ já existentes serão ignorados
                          </p>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="update" id="mode-update" className="mt-0.5" />
                        <Label htmlFor="mode-update" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-primary" />
                            <span className="font-medium">Atualizar existentes</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Leads com mesmo CNPJ terão seus dados atualizados (útil para corrigir telefones, emails, etc)
                          </p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {isImporting && (
                    <div className="space-y-2">
                      <Progress value={importProgress} className="w-full" />
                      <p className="text-sm text-center text-muted-foreground">
                        Importando... {importProgress}%
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-muted p-6 rounded-lg text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium">Importação Concluída!</h3>
                  <div className="space-y-1 text-sm">
                    {importResult.updated !== undefined ? (
                      <p><strong>{importResult.success.toLocaleString('pt-BR')}</strong> leads importados/atualizados</p>
                    ) : (
                      <>
                        <p><strong>{importResult.success.toLocaleString('pt-BR')}</strong> leads importados com sucesso</p>
                        {importResult.duplicates > 0 && (
                          <p className="text-muted-foreground">
                            {importResult.duplicates.toLocaleString('pt-BR')} duplicatas ignoradas
                          </p>
                        )}
                      </>
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
              <Button variant="outline" onClick={() => setStep(step === 'confirm' ? 'mapping' : 'upload')}>
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
              <Button 
                onClick={() => setStep('confirm')} 
                disabled={!canProceedToConfirm()}
              >
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
