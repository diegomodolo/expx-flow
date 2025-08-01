import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const Clientes = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <div className="bg-card p-8 rounded-xl shadow-sm border border-border">
          <p className="text-muted-foreground">Página de gestão de clientes em desenvolvimento...</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Clientes;