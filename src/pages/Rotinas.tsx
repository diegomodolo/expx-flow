import React from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DailyRoutinePanel } from "@/components/dashboard/DailyRoutinePanel";

const Rotinas = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Rotinas Diárias
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas tarefas operacionais e mantenha a disciplina do dia a dia
          </p>
        </div>
        
        <DailyRoutinePanel />
      </div>
    </DashboardLayout>
  );
};

export default Rotinas;
