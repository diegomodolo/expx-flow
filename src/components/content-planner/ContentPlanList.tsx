import { useState, useMemo } from "react";
import { SearchableClientSelect } from "@/components/ui/searchable-client-select";
import { useContentPlans, ContentPlan } from "@/hooks/useContentPlans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, FileText, Trash2, Edit, Loader2, Plus, ArrowLeft, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useTeams } from "@/hooks/useTeams";
import { useClients } from "@/hooks/useClients";

interface ContentPlanListProps {
  onSelectPlan: (planId: string) => void;
  onCreateNew?: () => void;
}

const statusLabels = {
  rascunho: { label: "Rascunho", variant: "secondary" as const },
  em_revisao: { label: "Em Revisão", variant: "outline" as const },
  aprovado: { label: "Aprovado", variant: "default" as const },
};

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function ContentPlanList({ onSelectPlan, onCreateNew }: ContentPlanListProps) {
  const navigate = useNavigate();
  const { plans, isLoading, deletePlan } = useContentPlans();
  const { teams } = useTeams();
  const { clients } = useClients();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [squadFilter, setSquadFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Get unique clients that have content plans
  const clientsWithPlans = useMemo(() => {
    if (!plans || !clients) return [];
    const clientIds = new Set(plans.map(p => p.client_id));
    return clients.filter(c => clientIds.has(c.id));
  }, [plans, clients]);

  const filteredPlans = useMemo(() => {
    if (!plans) return [];
    
    return plans.filter((plan) => {
      const matchesSearch =
        plan.name.toLowerCase().includes(search.toLowerCase()) ||
        plan.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
        plan.clients?.company?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
      
      const matchesSquad = squadFilter === "all" || (() => {
        if (squadFilter === "none") {
          return !plan.clients?.team_id;
        }
        return plan.clients?.team_id === squadFilter;
      })();
      
      const matchesClient = clientFilter === "all" || plan.client_id === clientFilter;

      return matchesSearch && matchesStatus && matchesSquad && matchesClient;
    });
  }, [plans, search, statusFilter, squadFilter, clientFilter]);

  const handleDelete = async () => {
    if (deleteId) {
      await deletePlan.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/geradores")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5">
              <FileText className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Planejador de Conteúdo
              </h1>
              <p className="text-muted-foreground text-sm">
                Planeje suas postagens mensais com ajuda da IA
              </p>
            </div>
          </div>
        </div>
        {onCreateNew && (
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Planejamento
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="em_revisao">Em Revisão</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={squadFilter} onValueChange={setSquadFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Squad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os squads</SelectItem>
            <SelectItem value="none">Sem squad</SelectItem>
            {teams?.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <SearchableClientSelect
          clients={clientsWithPlans.map(c => ({ id: c.id, name: c.name }))}
          value={clientFilter}
          onValueChange={setClientFilter}
          allLabel="Todos os clientes"
          placeholder="Cliente"
          triggerClassName="w-[200px]"
        />
      </div>

      {/* Table */}
      {filteredPlans && filteredPlans.length > 0 ? (
        <div className="rounded-md border overflow-auto max-h-[calc(100vh-280px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Cliente</TableHead>
                <TableHead>Planejamento</TableHead>
                <TableHead>Mês/Ano</TableHead>
                <TableHead>Aprovação</TableHead>
                <TableHead>Squad</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map((plan) => (
                <TableRow
                  key={plan.id}
                  className="cursor-pointer"
                  onClick={() => onSelectPlan(plan.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={plan.clients?.avatar || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {plan.clients?.name?.substring(0, 2).toUpperCase() || "CL"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground line-clamp-1">
                          {plan.clients?.name || "Cliente"}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {plan.clients?.company}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground line-clamp-1">
                      {plan.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {monthNames[plan.month - 1]} {plan.year}
                    </span>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const total = plan.total_posts || 0;
                      const approved = plan.approved_posts || 0;
                      const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;
                      const isComplete = percentage === 100;
                      
                      return (
                        <div className="flex items-center gap-2 min-w-[120px]">
                          {isComplete ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          ) : (
                            <Progress 
                              value={percentage} 
                              className="h-2 flex-1"
                            />
                          )}
                          <span className={`text-xs font-medium shrink-0 ${isComplete ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {percentage}%
                          </span>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {plan.clients?.teams ? (
                      <Badge variant="outline" className="text-xs">
                        {plan.clients.teams.name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusLabels[plan.status].variant}>
                      {statusLabels[plan.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPlan(plan.id);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(plan.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Nenhum planejamento encontrado
          </h3>
          <p className="text-sm text-muted-foreground">
            {search || statusFilter !== "all" || squadFilter !== "all" || clientFilter !== "all"
              ? "Tente ajustar os filtros de busca"
              : "Crie seu primeiro planejamento de conteúdo"}
          </p>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir planejamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os posts deste planejamento serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePlan.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
