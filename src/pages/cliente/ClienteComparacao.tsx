import { useParams } from "react-router-dom";
import { PeriodComparisonTab } from "@/components/clients/PeriodComparisonTab";

export function ClienteComparacao() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Comparação de Períodos</h3>
      <PeriodComparisonTab clientId={id || ""} />
    </div>
  );
}
