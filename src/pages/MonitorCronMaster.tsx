import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CronMasterMonitor } from "@/components/automations/CronMasterMonitor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MonitorCronMaster = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Monitor Cron Master</h1>
            <p className="text-muted-foreground">
              Acompanhe o status e histórico de execuções do sistema de automação
            </p>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Sistema Automático</AlertTitle>
          <AlertDescription>
            O Cron Master executa automaticamente as automações agendadas de todos os clientes.
            As execuções são registradas aqui em tempo real.
          </AlertDescription>
        </Alert>

        <CronMasterMonitor showClientColumn={true} />
      </div>
    </DashboardLayout>
  );
};

export default MonitorCronMaster;
