import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const Relatorios = () => {
  return (
    <DashboardLayout>
      <div className="flex flex-col h-full space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <div className="bg-card p-8 rounded-xl shadow-sm border border-border">
          <p className="text-muted-foreground">Página de relatórios em desenvolvimento...</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;