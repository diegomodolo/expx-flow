import { Historia } from "@/hooks/useHistorias";
import { BookOpen, Clock, Users, CheckCircle2 } from "lucide-react";
import { differenceInDays } from "date-fns";

interface HistoriaKPIsProps {
  historias: Historia[];
}

export function HistoriaKPIs({ historias }: HistoriaKPIsProps) {
  const total = historias.length;
  const done = historias.filter((h) => h.status === "done");
  const completionRate = total > 0 ? Math.round((done.length / total) * 100) : 0;

  const avgCompletionDays = (() => {
    const completed = done.filter((h) => h.completed_at);
    if (completed.length === 0) return 0;
    const totalDays = completed.reduce((sum, h) => {
      return sum + differenceInDays(new Date(h.completed_at!), new Date(h.created_at));
    }, 0);
    return Math.round(totalDays / completed.length);
  })();

  const uniqueClients = new Set(historias.map((h) => h.related_client_id).filter(Boolean)).size;

  const kpis = [
    { label: "Total de Histórias", value: total, icon: BookOpen, color: "text-primary" },
    { label: "Tempo Médio (dias)", value: avgCompletionDays > 0 ? `${avgCompletionDays}d` : "—", icon: Clock, color: "text-amber-500" },
    { label: "Clientes", value: uniqueClients, icon: Users, color: "text-blue-500" },
    { label: "Taxa de Conclusão", value: `${completionRate}%`, icon: CheckCircle2, color: "text-emerald-500" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className={`p-2 rounded-md bg-muted ${kpi.color}`}>
            <kpi.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
