import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CRMSourcesReportProps {
  workspaceId: string;
}

export function CRMSourcesReport({ workspaceId }: CRMSourcesReportProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise de Fontes</h2>
          <p className="text-muted-foreground mt-1">
            Performance por origem e UTM
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
