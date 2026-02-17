import { Historia } from "@/hooks/useHistorias";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoriaTableProps {
  historias: Historia[];
  onEdit: (historia: Historia) => void;
}

function formatWorkTime(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    done: { label: "Concluída", variant: "default" },
    progress: { label: "Em Andamento", variant: "secondary" },
    todo: { label: "Aberta", variant: "outline" },
    review: { label: "Revisão", variant: "secondary" },
  };
  const s = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={s.variant} className="text-xs whitespace-nowrap">{s.label}</Badge>;
}

export function HistoriaTable({ historias, onEdit }: HistoriaTableProps) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="min-w-[200px]">Título / Descrição</TableHead>
            <TableHead>Abertura</TableHead>
            <TableHead>Fechamento</TableHead>
            <TableHead>Tempo Total</TableHead>
            <TableHead>Tempo Trabalho</TableHead>
            <TableHead>Líder</TableHead>
            <TableHead className="w-[120px]">Progresso</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {historias.map((h) => {
            const totalDays = h.completed_at
              ? differenceInDays(new Date(h.completed_at), new Date(h.created_at))
              : null;
            const progressPct = h.subtasks_total > 0
              ? Math.round((h.subtasks_done / h.subtasks_total) * 100)
              : 0;

            return (
              <TableRow
                key={h.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onEdit(h)}
              >
                <TableCell>
                  {h.client_logo ? (
                    <img
                      src={h.client_logo}
                      alt={h.client_name || "Cliente"}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                      {h.client_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {h.client_name || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{h.title}</p>
                    {h.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{h.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(h.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {h.completed_at
                    ? format(new Date(h.completed_at), "dd/MM/yyyy", { locale: ptBR })
                    : "—"}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {totalDays !== null ? `${totalDays} dia${totalDays !== 1 ? "s" : ""}` : "—"}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatWorkTime(h.total_work_minutes)}
                </TableCell>
                <TableCell className="text-sm">
                  {h.responsible_name || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={progressPct} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-8 text-right">{progressPct}%</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(h.status)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
