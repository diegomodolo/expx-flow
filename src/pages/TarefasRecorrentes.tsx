import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RecurringTasksManager } from "@/components/tasks/RecurringTasksManager";

const TarefasRecorrentes = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarefas Recorrentes</h1>
          <p className="text-muted-foreground">
            Gerencie todas as tarefas recorrentes do sistema
          </p>
        </div>
        
        <RecurringTasksManager />
      </div>
    </DashboardLayout>
  );
};

export default TarefasRecorrentes;
