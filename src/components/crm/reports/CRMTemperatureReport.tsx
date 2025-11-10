import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CRMTemperatureReportProps {
  workspaceId: string;
}

export function CRMTemperatureReport({ workspaceId }: CRMTemperatureReportProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise de Temperatura</h2>
          <p className="text-muted-foreground mt-1">
            Distribuição e conversão por qualificação
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Em desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Este relatório estará disponível em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
