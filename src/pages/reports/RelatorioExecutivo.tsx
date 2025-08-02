import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RelatorioExecutivo = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        {/* Header with navigation */}
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
              <h1 className="text-3xl font-bold text-foreground">Relatório Executivo</h1>
              <p className="text-muted-foreground">Visão geral para gestores e proprietários</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Enviar por Email
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Relatório Executivo (Cliente)</CardTitle>
            <CardDescription>
              Público-alvo: Dono/gestor do cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Conteúdo do relatório em desenvolvimento...
              </p>
              <div className="mt-4 text-sm text-muted-foreground space-y-1">
                <p>• Investimento total vs Leads gerados</p>
                <p>• CPL médio</p>
                <p>• CPA e ROI/ROAS</p>
                <p>• Top 3 campanhas</p>
                <p>• Principais oportunidades de melhoria</p>
                <p>• Ações implementadas na última semana/mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default RelatorioExecutivo;