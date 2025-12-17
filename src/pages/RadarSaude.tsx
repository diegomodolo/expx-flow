import React from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AccountHealthRadar } from "@/components/dashboard/AccountHealthRadar";

const RadarSaude = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Radar de Saúde das Contas
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitore a saúde de todas as contas de clientes em tempo real
          </p>
        </div>
        
        <AccountHealthRadar />
      </div>
    </DashboardLayout>
  );
};

export default RadarSaude;
