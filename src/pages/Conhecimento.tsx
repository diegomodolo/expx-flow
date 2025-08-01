import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const Conhecimento = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Base de Conhecimento</h1>
        <div className="bg-card p-8 rounded-xl shadow-sm border border-border">
          <p className="text-muted-foreground">Base de conhecimento em desenvolvimento...</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Conhecimento;