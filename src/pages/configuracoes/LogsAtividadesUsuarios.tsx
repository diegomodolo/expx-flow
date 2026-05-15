// Sub-pagina de configuracoes — DashboardLayout e fornecido pelo pai (Configuracoes.tsx)
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  Filter,
  LogIn,
  LogOut,
  MousePointer,
  Eye,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useUserActivityLogs,
  ActivityLogFilters,
} from "@/hooks/useUserActivityLogs";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const EVENT_LABELS: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  page_view: {
    label: "Página",
    icon: <Eye className="h-3 w-3" />,
    variant: "secondary",
  },
  action: {
    label: "Ação",
    icon: <MousePointer className="h-3 w-3" />,
    variant: "default",
  },
  login: {
    label: "Login",
    icon: <LogIn className="h-3 w-3" />,
    variant: "outline",
  },
  logout: {
    label: "Logout",
    icon: <LogOut className="h-3 w-3" />,
    variant: "outline",
  },
};

export function LogsAtividadesUsuarios() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;
  const [filters, setFilters] = useState<ActivityLogFilters>({ limit: 200 });

  const { data: logs = [], isLoading } = useUserActivityLogs(filters);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-logs", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("user_id, name, avatar")
        .eq("company_id", companyId!);
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const stats = {
    total: logs.length,
    logins: logs.filter((l) => l.event_type === "login").length,
    acoes: logs.filter((l) => l.event_type === "action").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Logs de Atividade</h2>
        <p className="text-sm text-muted-foreground">
          Histórico de uso da plataforma pelos colaboradores
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Logins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.logins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ações Registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.acoes}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

        <Select
          value={filters.userId ?? "todos"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, userId: v === "todos" ? undefined : v }))
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os colaboradores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os colaboradores</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.user_id} value={e.user_id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.eventType ?? "todos"}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              eventType: v === "todos" ? undefined : v,
            }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="page_view">Páginas</SelectItem>
            <SelectItem value="action">Ações</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-40"
          onChange={(e) =>
            setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))
          }
        />
        <Input
          type="date"
          className="w-40"
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              dateTo: e.target.value ? e.target.value + "T23:59:59" : undefined,
            }))
          }
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Detalhe</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Data/Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhum log encontrado para os filtros selecionados
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const employee = employees.find(
                    (e) => e.user_id === log.user_id,
                  );
                  const evt = EVENT_LABELS[log.event_type] ?? {
                    label: log.event_type,
                    icon: <Activity className="h-3 w-3" />,
                    variant: "secondary" as const,
                  };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {employee?.name ?? log.user_id.slice(0, 8) + "..."}
                      </TableCell>
                      <TableCell>
                        <Badge variant={evt.variant} className="gap-1 text-xs">
                          {evt.icon} {evt.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.module ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.action_name ?? log.page_path ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.duration_ms
                          ? `${Math.round(log.duration_ms / 1000)}s`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default LogsAtividadesUsuarios;
