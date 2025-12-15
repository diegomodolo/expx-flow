import { useState, useCallback } from "react";
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
import { MetaAudience, UserData, UploadResult } from "@/hooks/useMetaAudiences";
import { Upload, FileText, Keyboard, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface UploadLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: MetaAudience | null;
  onUpload: (audienceId: string, users: UserData[]) => Promise<UploadResult | null>;
  loading: boolean;
}

export function UploadLeadsModal({
  open,
  onOpenChange,
  audience,
  onUpload,
  loading,
}: UploadLeadsModalProps) {
  const [mode, setMode] = useState<"csv" | "manual">("csv");
  const [csvData, setCsvData] = useState("");
  const [manualData, setManualData] = useState<UserData[]>([{ email: "", phone: "" }]);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [parsedCount, setParsedCount] = useState(0);

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

  const handleSubmit = async () => {
    if (!audience) return;

    const users = mode === "csv" ? parseCSV(csvData) : getValidManualData();
    if (users.length === 0) return;

    const uploadResult = await onUpload(audience.id, users);
    if (uploadResult) {
      setResult(uploadResult);
    }
  };

  const handleClose = () => {
    setCsvData("");
    setManualData([{ email: "", phone: "" }]);
    setResult(null);
    setParsedCount(0);
    onOpenChange(false);
  };

  const canSubmit =
    (mode === "csv" && parsedCount > 0) ||
    (mode === "manual" && getValidManualData().length > 0);

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

        {result ? (
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session ID:</span>
                <span className="font-mono text-xs">{result.session_id}</span>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm">
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500" />
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
            <Tabs value={mode} onValueChange={(v) => setMode(v as "csv" | "manual")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="csv">
                  <FileText className="h-4 w-4 mr-2" />
                  Colar CSV
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Keyboard className="h-4 w-4 mr-2" />
                  Manual
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
                    disabled={loading}
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
                          disabled={loading}
                        />
                      </div>
                      <div className="flex-1">
                        {index === 0 && <Label className="text-xs">Telefone</Label>}
                        <Input
                          value={row.phone || ""}
                          onChange={(e) => updateManualRow(index, "phone", e.target.value)}
                          placeholder="11999998888"
                          disabled={loading}
                        />
                      </div>
                      {manualData.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeManualRow(index)}
                          disabled={loading}
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
                  disabled={loading}
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
            </Tabs>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Upload className="h-4 w-4 mr-2" />
                Enviar Leads
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
