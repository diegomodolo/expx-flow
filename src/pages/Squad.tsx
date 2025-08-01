import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const Squad = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Squad / Tarefas</h1>
        <div className="bg-card p-8 rounded-xl shadow-sm border border-border">
          <p className="text-muted-foreground">Página de gestão do squad e tarefas em desenvolvimento...</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Squad;