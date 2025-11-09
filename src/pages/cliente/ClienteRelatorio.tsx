import { useParams } from "react-router-dom";
import { WeeklyReportTab } from "@/components/reports/WeeklyReportTab";

export function ClienteRelatorio() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Relatório Semanal</h3>
      <WeeklyReportTab clientId={id || ""} />
    </div>
  );
}
