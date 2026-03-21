import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportDetailAccordion } from "@/components/reportes/ReportDetailAccordion";
import { useDeleteReport, type UserReport } from "@/hooks/useUserReports";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ReportListProps {
  reports: UserReport[];
  companyId: string;
}

const statusBadgeConfig: Record<string, { label: string; className: string }> =
  {
    aberto: { label: "Aberto", className: "bg-blue-500 text-white" },
    em_analise: { label: "Em Análise", className: "bg-yellow-500 text-black" },
    implementado: {
      label: "Implementado",
      className: "bg-green-500 text-black",
    },
    fechado: { label: "Fechado", className: "bg-gray-500 text-white" },
    recusado: { label: "Recusado", className: "bg-red-500 text-white" },
  };

const typeBadgeConfig: Record<string, { label: string; className: string }> = {
  bug: { label: "Bug", className: "bg-red-500 text-white" },
  feature: { label: "Feature", className: "bg-violet-500 text-white" },
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffH < 24) return `há ${diffH}h`;
  if (diffD < 30) return `há ${diffD}d`;
  return date.toLocaleDateString("pt-BR");
}

export function ReportList({ reports, companyId }: ReportListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const deleteReport = useDeleteReport(companyId);

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum reporte encontrado.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {reports.map((report) => {
        const isExpanded = expandedId === report.id;
        const typeBadge = typeBadgeConfig[report.type];
        const statusBadge = statusBadgeConfig[report.status];
        const borderColor =
          report.type === "bug" ? "border-l-red-500" : "border-l-violet-500";

        return (
          <div key={report.id} className="border-b last:border-b-0">
            <button
              onClick={() => setExpandedId(isExpanded ? null : report.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors",
                isExpanded && "bg-muted/30",
                `border-l-3 ${borderColor}`,
              )}
            >
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap",
                  typeBadge.className,
                )}
              >
                {typeBadge.label}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {report.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {report.user_name} · {formatRelativeDate(report.created_at)}
                </div>
              </div>
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap",
                  statusBadge.className,
                )}
              >
                {statusBadge.label}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Excluir reporte"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir reporte</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir este reporte? Esta ação não
                      pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteReport.mutate(report.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>

            <ReportDetailAccordion
              report={report}
              companyId={companyId}
              isExpanded={isExpanded}
            />
          </div>
        );
      })}
    </div>
  );
}
