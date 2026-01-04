import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket } from "lucide-react";
import { AutopilotPublishHistory } from "@/components/generators/AutopilotPublishHistory";

export default function HistoricoPublicacoesAutopilot() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/geradores/fabrica-anuncios")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/5">
              <Rocket className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Histórico de Publicações Autopilot
              </h1>
              <p className="text-muted-foreground mt-1">
                Criativos publicados automaticamente via autopilot
              </p>
            </div>
          </div>
        </div>

        <AutopilotPublishHistory />
      </div>
    </DashboardLayout>
  );
}
