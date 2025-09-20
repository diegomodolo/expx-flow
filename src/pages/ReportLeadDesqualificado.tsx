import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Upload, Send, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  company_name?: string;
}

interface TokenInfo {
  id: string;
  client_id: string;
  company_id: string;
}

export default function ReportLeadDesqualificado() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [reporterName, setReporterName] = useState("");
  const [leadDate, setLeadDate] = useState<Date>();
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [conversationLink, setConversationLink] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const reasonOptions = [
    { value: "fora_perfil", label: "Fora do perfil" },
    { value: "informacoes_incorretas", label: "Informações incorretas" },
    { value: "contato_errado", label: "Contato errado" },
    { value: "ligacao_sem_resposta", label: "Ligação sem resposta" },
    { value: "outro", label: "Outro" }
  ];

  useEffect(() => {
    if (token) {
      validateTokenAndLoadClient();
    }
  }, [token]);

  const validateTokenAndLoadClient = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('lead_disqualification_tokens')
        .select(`
          id,
          client_id,
          company_id
        `)
        .eq('token', token)
        .single();

      if (error || !data) {
        setError('Token inválido ou expirado');
        return;
      }

      // Buscar dados do cliente separadamente
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          email,
          company_id
        `)
        .eq('id', data.client_id)
        .single();

      if (clientError || !clientData) {
        setError('Cliente não encontrado');
        return;
      }

      setTokenInfo({
        id: data.id,
        client_id: data.client_id,
        company_id: data.company_id
      });

      setClientInfo({
        id: clientData.id,
        name: clientData.name,
        email: clientData.email,
        company_name: undefined // Por enquanto sem nome da empresa
      });

    } catch (err) {
      console.error('Error validating token:', err);
      setError('Erro ao validar token');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo e tamanho do arquivo
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB",
          variant: "destructive",
        });
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo não suportado",
          description: "Apenas imagens (JPEG, PNG, GIF) e PDFs são permitidos",
          variant: "destructive",
        });
        return;
      }

      setEvidenceFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reporterName || !leadDate || !reason) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      let evidenceFileUrl = null;

      // Upload do arquivo de evidência primeiro, se fornecido
      if (evidenceFile && clientInfo) {
        // Gerar nome de arquivo com fallback caso o nome original seja undefined
        const originalName = evidenceFile.name || 'arquivo_sem_nome';
        const fileExtension = originalName.split('.').pop() || 'bin';
        const timestamp = Date.now();
        const fileName = `${clientInfo.id}/${timestamp}-${originalName}`;
        
        console.log('Uploading file:', {
          originalName: evidenceFile.name,
          generatedName: fileName,
          fileSize: evidenceFile.size,
          fileType: evidenceFile.type
        });
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('lead-evidence')
          .upload(fileName, evidenceFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: "Erro no upload da evidência",
            description: "Não foi possível fazer upload do arquivo, mas o report será enviado sem evidência.",
            variant: "destructive",
          });
        } else {
          console.log('Upload success:', uploadData);
          evidenceFileUrl = fileName;
        }
      }

      // Enviar o report com a URL do arquivo (se houver)
      const { data, error } = await supabase.functions.invoke('process-lead-disqualification-report', {
        body: {
          token,
          reporter_name: reporterName,
          lead_received_date: format(leadDate, 'yyyy-MM-dd'),
          disqualification_reason: reason,
          additional_notes: notes,
          conversation_link: conversationLink || null,
          evidence_file_url: evidenceFileUrl
        }
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Report enviado!",
        description: "Obrigado pelo feedback. O report foi enviado com sucesso.",
      });

    } catch (err) {
      console.error('Error submitting report:', err);
      toast({
        title: "Erro ao enviar report",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Erro</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle>Report Enviado!</CardTitle>
            <CardDescription>
              Obrigado pelo feedback. Seu report foi enviado com sucesso e nossa equipe irá analisá-lo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Report de Lead Desqualificado</h1>
          <p className="text-muted-foreground">
            Use este formulário para reportar leads que não atendem aos critérios esperados
          </p>
        </div>

        {/* Client Info */}
        {clientInfo && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{clientInfo.name}</h3>
                  <p className="text-sm text-muted-foreground">{clientInfo.email}</p>
                  {clientInfo.company_name && (
                    <Badge variant="secondary" className="mt-1">
                      {clientInfo.company_name}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Lead</CardTitle>
            <CardDescription>
              Preencha as informações sobre o lead que deseja reportar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Reporter Name */}
              <div className="space-y-2">
                <Label htmlFor="reporter-name">
                  Nome de quem está reportando *
                </Label>
                <Input
                  id="reporter-name"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              {/* Lead Date */}
              <div className="space-y-2">
                <Label>Data em que o lead foi recebido *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !leadDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {leadDate ? format(leadDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={leadDate}
                      onSelect={setLeadDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label>Motivo da desqualificação *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações adicionais</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Descreva detalhes adicionais sobre a desqualificação..."
                  rows={4}
                />
              </div>

              {/* Conversation Link */}
              <div className="space-y-2">
                <Label htmlFor="conversation-link">Link da conversa (opcional)</Label>
                <Input
                  id="conversation-link"
                  type="url"
                  value={conversationLink}
                  onChange={(e) => setConversationLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {/* Evidence Upload */}
              <div className="space-y-2">
                <Label htmlFor="evidence">Upload de evidência (opcional)</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                    <div className="space-y-2">
                      <Label
                        htmlFor="evidence"
                        className="cursor-pointer text-sm font-medium text-primary hover:underline"
                      >
                        Clique para fazer upload
                      </Label>
                      <Input
                        id="evidence"
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground">
                        Imagens ou PDF, máximo 10MB
                      </p>
                    </div>
                  </div>
                  {evidenceFile && (
                    <Alert className="mt-4">
                      <AlertDescription>
                        Arquivo selecionado: {evidenceFile.name}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Report
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Este report será enviado diretamente para nossa equipe de análise.</p>
        </div>
      </div>
    </div>
  );
}