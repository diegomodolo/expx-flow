import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CompanySettings } from "@/components/company/CompanySettings";

const Configuracoes = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações da sua empresa e conta
          </p>
        </div>
        <CompanySettings />
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;