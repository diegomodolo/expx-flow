import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RelatorioFunil = () => {
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
              <h1 className="text-3xl font-bold text-foreground">Relatório de Funil Completo</h1>
              <p className="text-muted-foreground">Análise detalhada do funil de conversão</p>
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
            <CardTitle>Relatório de Funil Completo</CardTitle>
            <CardDescription>
              Público-alvo: Marketing e Growth
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Conteúdo do relatório em desenvolvimento...
              </p>
              <div className="mt-4 text-sm text-muted-foreground space-y-1">
                <p>• Divisão de métricas por funil (Topo, Meio, Fundo, Retenção)</p>
                <p>• CPL médio por etapa</p>
                <p>• Conversões por etapa</p>
                <p>• Distribuição de orçamento real vs recomendada</p>
                <p>• Gargalos do funil (onde está o maior custo e a menor taxa de conversão)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default RelatorioFunil;