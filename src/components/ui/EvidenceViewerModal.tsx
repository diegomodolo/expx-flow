import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, X, User, Calendar, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportData {
  id: string;
  reporter_name: string;
  lead_received_date: string;
  disqualification_reason: string;
  additional_notes?: string;
  conversation_link?: string;
  created_at: string;
  client_name?: string;
  client_email?: string;
}

interface EvidenceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
  reportData?: ReportData;
}

export function EvidenceViewerModal({ isOpen, onClose, imageUrl, fileName, reportData }: EvidenceViewerModalProps) {
  const [imageError, setImageError] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getReasonLabel = (reason: string) => {
    const labels = {
      'fora_perfil': 'Fora do perfil',
      'informacoes_incorretas': 'Informações incorretas',  
      'contato_errado': 'Contato errado',
      'ligacao_sem_resposta': 'Ligação sem resposta',
      'outro': 'Outro'
    };
    return labels[reason as keyof typeof labels] || reason;
  };

  const getReasonBadgeColor = (reason: string) => {
    const colors = {
      'fora_perfil': 'bg-orange-100 text-orange-800 border-orange-200',
      'informacoes_incorretas': 'bg-red-100 text-red-800 border-red-200',
      'contato_errado': 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      'ligacao_sem_resposta': 'bg-blue-100 text-blue-800 border-blue-200',
      'outro': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[reason as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={reportData ? "max-w-6xl max-h-[95vh] p-0" : "max-w-4xl max-h-[90vh] p-0"}>
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">
                {reportData ? "Report de Lead Desqualificado" : "Evidência"}
              </DialogTitle>
              {reportData && reportData.client_name && (
                <p className="text-sm text-muted-foreground">
                  Cliente: {reportData.client_name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                {reportData ? "Download Evidência" : "Download"}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {reportData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 pt-0">
              {/* Informações do Report */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informações do Report
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Reportado por</p>
                        <p className="text-sm text-muted-foreground">{reportData.reporter_name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Data do Lead</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(reportData.lead_received_date), "PPP", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Motivo da Desqualificação</p>
                        <Badge className={getReasonBadgeColor(reportData.disqualification_reason)}>
                          {getReasonLabel(reportData.disqualification_reason)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-md font-semibold">Informações do Cliente</h4>
                  <div className="space-y-2">
                    {reportData.client_name && (
                      <div>
                        <p className="text-sm font-medium">Nome</p>
                        <p className="text-sm text-muted-foreground">{reportData.client_name}</p>
                      </div>
                    )}
                    {reportData.client_email && (
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{reportData.client_email}</p>
                      </div>
                    )}
                  </div>
                </div>

                {reportData.additional_notes && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-md font-semibold">Observações Adicionais</h4>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{reportData.additional_notes}</p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-md font-semibold">Informações do Sistema</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">ID do Report</p>
                      <p className="text-sm text-muted-foreground font-mono">{reportData.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Data de Criação</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(reportData.created_at), "PPP 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>

                {reportData.conversation_link && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-md font-semibold">Link da Conversa</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(reportData.conversation_link, '_blank')}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Abrir Conversa
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Evidência */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Evidência</h3>
                <div className="border rounded-lg overflow-hidden">
                  {!imageError ? (
                    <img
                      src={imageUrl}
                      alt="Evidência do report"
                      className="w-full h-auto"
                      onError={() => setImageError(true)}
                      style={{ maxHeight: '600px', objectFit: 'contain' }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 bg-muted">
                      <X className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Não foi possível carregar a imagem</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={handleDownload}>
                        <Download className="h-4 w-4 mr-1" />
                        Fazer Download
                      </Button>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{fileName}</p>
                </div>
              </div>
            </div>
          ) : (
            // Simple view for just the image (used in LeadDisqualificationTab)
            <div className="p-4 pt-0">
              {!imageError ? (
                <img
                  src={imageUrl}
                  alt="Evidência"
                  className="w-full h-auto rounded-lg shadow-lg"
                  onError={() => setImageError(true)}
                  style={{ maxHeight: 'calc(90vh - 120px)', objectFit: 'contain' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg">
                  <X className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Não foi possível carregar a imagem</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-1" />
                    Fazer Download
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}