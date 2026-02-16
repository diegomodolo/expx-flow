import { useState, useMemo } from "react";
import { SearchableClientSelect } from "@/components/ui/searchable-client-select";
import { useNavigate } from "react-router-dom";
import { ContentPresentation, usePresentations } from "@/hooks/usePresentations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { 
  Calendar, 
  Eye, 
  Link2, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Upload,
  Loader2,
  Search,
  Presentation
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeams } from "@/hooks/useTeams";
import { useClients } from "@/hooks/useClients";
import { Card } from "@/components/ui/card";

interface PresentationListProps {
  presentations: ContentPresentation[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const statusConfig = {
  draft: { label: "Rascunho", variant: "secondary" as const },
  ready: { label: "Pronto", variant: "default" as const },
  published: { label: "Publicado", variant: "default" as const },
};

export function PresentationList({ presentations, isLoading, onEdit }: PresentationListProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { deletePresentation, publishPresentation } = usePresentations();
  const { teams } = useTeams();
  const { clients } = useClients();
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [squadFilter, setSquadFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Get unique clients that have presentations
  const clientsWithPresentations = useMemo(() => {
    if (!presentations || !clients) return [];
    const clientIds = new Set(presentations.map(p => p.client_id));
    return clients.filter(c => clientIds.has(c.id));
  }, [presentations, clients]);

  // Generate unique month/year options from presentations
  const dateOptions = useMemo(() => {
    if (!presentations) return [];
    const uniqueDates = new Map<string, { month: number; year: number; label: string }>();
    presentations.forEach(p => {
      const key = `${p.year}-${p.month}`;
      if (!uniqueDates.has(key)) {
        uniqueDates.set(key, {
          month: p.month,
          year: p.year,
          label: `${MONTH_NAMES[p.month - 1]} ${p.year}`
        });
      }
    });
    return Array.from(uniqueDates.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [presentations]);

  const filteredPresentations = useMemo(() => {
    if (!presentations) return [];
    
    return presentations.filter((presentation) => {
      const matchesSearch =
        presentation.name.toLowerCase().includes(search.toLowerCase()) ||
        presentation.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
        presentation.clients?.company?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || presentation.status === statusFilter;
      
      const matchesSquad = squadFilter === "all" || (() => {
        if (squadFilter === "none") {
          return !presentation.clients?.team_id;
        }
        return presentation.clients?.team_id === squadFilter;
      })();
      
      const matchesClient = clientFilter === "all" || presentation.client_id === clientFilter;
      
      const matchesDate = dateFilter === "all" || (() => {
        const [year, month] = dateFilter.split("-").map(Number);
        return presentation.year === year && presentation.month === month;
      })();

      return matchesSearch && matchesStatus && matchesSquad && matchesClient && matchesDate;
    });
  }, [presentations, search, statusFilter, squadFilter, clientFilter, dateFilter]);

  const handleCopyLink = (token: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/apresentacao/${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado!",
      description: "O link da apresentação foi copiado para a área de transferência.",
    });
  };

  const handlePublish = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await publishPresentation.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deletePresentation.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[160px]" />
          <Skeleton className="h-10 w-[160px]" />
          <Skeleton className="h-10 w-[160px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="rounded-md border">
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
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
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="ready">Pronto</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
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
          clients={clientsWithPresentations.map(c => ({ id: c.id, name: c.name }))}
          value={clientFilter}
          onValueChange={setClientFilter}
          allLabel="Todos os clientes"
          placeholder="Cliente"
          triggerClassName="w-[180px]"
        />

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Data" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as datas</SelectItem>
            {dateOptions.map((option) => (
              <SelectItem key={`${option.year}-${option.month}`} value={`${option.year}-${option.month}`}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredPresentations.length > 0 ? (
        <div className="rounded-md border overflow-auto max-h-[calc(100vh-320px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Cliente</TableHead>
                <TableHead>Apresentação</TableHead>
                <TableHead>Mês/Ano</TableHead>
                <TableHead>Squad</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visualizações</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPresentations.map((presentation) => (
                <TableRow
                  key={presentation.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/geradores/apresentacoes/${presentation.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={presentation.clients?.avatar || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {presentation.clients?.name?.substring(0, 2).toUpperCase() || "CL"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground line-clamp-1">
                          {presentation.clients?.name || "Cliente"}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {presentation.clients?.company}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1 h-6 rounded-full shrink-0"
                        style={{ backgroundColor: presentation.primary_color }}
                      />
                      <span className="font-medium text-foreground line-clamp-1">
                        {presentation.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {MONTH_NAMES[presentation.month - 1]} {presentation.year}
                    </span>
                  </TableCell>
                  <TableCell>
                    {presentation.clients?.teams ? (
                      <Badge variant="outline" className="text-xs">
                        {presentation.clients.teams.name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[presentation.status].variant}>
                      {statusConfig[presentation.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {presentation.view_count > 0 ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {presentation.view_count}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">
                      {format(new Date(presentation.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => onEdit(presentation.id)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {presentation.status !== 'published' && (
                          <DropdownMenuItem onClick={(e) => handlePublish(presentation.id, e)}>
                            <Upload className="h-4 w-4 mr-2" />
                            Publicar
                          </DropdownMenuItem>
                        )}
                        {presentation.public_token && (
                          <DropdownMenuItem onClick={(e) => handleCopyLink(presentation.public_token!, e)}>
                            <Link2 className="h-4 w-4 mr-2" />
                            Copiar Link
                          </DropdownMenuItem>
                        )}
                        {presentation.public_token && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/apresentacao/${presentation.public_token}`, '_blank');
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(presentation.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Presentation className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {presentations.length === 0 ? "Nenhuma apresentação" : "Nenhum resultado encontrado"}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {presentations.length === 0
                ? "Comece criando sua primeira apresentação de conteúdo para enviar aos clientes."
                : "Tente ajustar os filtros de busca."}
            </p>
          </div>
        </Card>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir apresentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os criativos e mídias serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePresentation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
