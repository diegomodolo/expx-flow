import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useTaskFlows } from "@/hooks/useTaskFlows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Loader2,
  GitBranch,
  Trash2,
  MoreVertical,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TaskFlows() {
  const navigate = useNavigate();
  const { flows, isLoading, createFlow, deleteFlow, isCreating } = useTaskFlows();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredFlows = useMemo(() => {
    return flows.filter((f) =>
      !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [flows, search]);

  const handleCreate = async () => {
    const flow = await createFlow("Novo Fluxo");
    if (flow) navigate(`/fluxos/${flow.id}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Início</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Fluxos de Tarefas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Fluxos de Tarefas</h1>
              <p className="text-sm text-muted-foreground">Crie fluxos visuais conectando quadros e definindo ações automáticas</p>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Novo Fluxo
          </Button>
        </div>

        {/* Card container */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar fluxos..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : filteredFlows.length === 0 ? (
            <div className="text-center py-16">
              <GitBranch className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <h3 className="text-lg font-medium text-foreground">Nenhum fluxo encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro fluxo de tarefas para conectar quadros e automatizar movimentações.</p>
              <Button className="mt-4" onClick={handleCreate} disabled={isCreating}>
                <Plus className="w-4 h-4 mr-2" /> Criar Fluxo
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[180px]">Atualizado em</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFlows.map((flow) => (
                    <TableRow
                      key={flow.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/fluxos/${flow.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <GitBranch className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{flow.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[400px] truncate">
                        {flow.description || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(flow.updated_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(flow.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
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
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fluxo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fluxo será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteFlow(deleteId); setDeleteId(null); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
