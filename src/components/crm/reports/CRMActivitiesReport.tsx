import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CRMActivitiesReportProps {
  workspaceId: string;
}

export function CRMActivitiesReport({ workspaceId }: CRMActivitiesReportProps) {
  const [startDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate] = useState<Date>(new Date());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análise de Atividades</h2>
          <p className="text-muted-foreground mt-1">
            Engajamento e tempo de resposta por lead
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
