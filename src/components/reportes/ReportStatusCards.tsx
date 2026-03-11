import type { UserReport } from "@/hooks/useUserReports";

interface ReportStatusCardsProps {
  reports: UserReport[];
}

const statusConfig = [
  { key: "aberto", label: "Abertos", color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "em_analise", label: "Em Análise", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { key: "implementado", label: "Implementados", color: "text-green-400", bg: "bg-green-500/10" },
  { key: "recusado", label: "Recusados", color: "text-red-400", bg: "bg-red-500/10" },
] as const;

export function ReportStatusCards({ reports }: ReportStatusCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statusConfig.map(({ key, label, color, bg }) => {
        const count = reports.filter((r) => r.status === key).length;
        return (
          <div
            key={key}
            className={`${bg} rounded-lg p-4 text-center border border-white/5`}
          >
            <div className={`text-2xl font-bold ${color}`}>{count}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        );
      })}
    </div>
  );
}
