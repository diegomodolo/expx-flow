import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

interface ReportLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  onExportPDF?: () => void;
  onSendEmail?: () => void;
}

export function ReportLayout({ 
  title, 
  description, 
  children, 
  onExportPDF, 
  onSendEmail 
}: ReportLayoutProps) {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/relatorios")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{title}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {onSendEmail && (
              <Button variant="outline" onClick={onSendEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Enviar por Email
              </Button>
            )}
            {onExportPDF && (
              <Button onClick={onExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
            )}
          </div>
        </div>
        {children}
      </div>
    </DashboardLayout>
  );
}