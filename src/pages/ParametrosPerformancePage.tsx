import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import ParametrosPerformance from "./ParametrosPerformance";

const ParametrosPerformancePage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parâmetros de Performance</h1>
          <p className="text-muted-foreground">
            Defina os critérios de status e benchmarks dos clientes
          </p>
        </div>
        <ParametrosPerformance />
      </div>
    </DashboardLayout>
  );
};

export default ParametrosPerformancePage;
