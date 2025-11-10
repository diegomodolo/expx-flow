import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CRMExecutiveReportProps {
  workspaceId: string;
}

export function CRMExecutiveReport({ workspaceId }: CRMExecutiveReportProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Relatório Executivo</h2>
          <p className="text-muted-foreground mt-1">
            Visão consolidada com insights e exportação PDF
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
