import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PlannerSettings } from "@/components/planner/PlannerSettings";

const PlannerConfigPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planner</h1>
          <p className="text-muted-foreground">
            Configure os slots de tempo para o planner diário
          </p>
        </div>
        <PlannerSettings />
      </div>
    </DashboardLayout>
  );
};

export default PlannerConfigPage;
