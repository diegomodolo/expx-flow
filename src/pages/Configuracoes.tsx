import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const Configuracoes = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <div className="bg-card p-8 rounded-xl shadow-sm border border-border">
          <p className="text-muted-foreground">Página de configurações em desenvolvimento...</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;