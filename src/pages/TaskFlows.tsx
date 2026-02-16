import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useTaskFlows } from "@/hooks/useTaskFlows";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Loader2,
  GitBranch,
  Trash2,
  MoreHorizontal,
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TaskFlows() {
  const navigate = useNavigate();
  const { flows, isLoading, createFlow, deleteFlow, isCreating } = useTaskFlows();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredFlows = flows.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    const flow = await createFlow("Novo Fluxo");
    if (flow) navigate(`/fluxos/${flow.id}`);
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fluxos de Tarefas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crie fluxos visuais conectando quadros e definindo ações automáticas
            </p>
          </div>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Novo Fluxo
          </Button>
        </div>


        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fluxo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-8 px-0"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filteredFlows.length} fluxo{filteredFlows.length !== 1 ? "s" : ""}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredFlows.length === 0 ? (
            <div className="p-12 text-center">
              <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {search ? "Nenhum fluxo encontrado" : "Nenhum fluxo criado"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search
                  ? "Tente buscar com outro termo."
                  : "Crie seu primeiro fluxo de tarefas para conectar quadros e automatizar movimentações."}
              </p>
              {!search && (
                <Button onClick={handleCreate} disabled={isCreating}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Fluxo
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredFlows.map((flow) => (
                <div
                  key={flow.id}
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors group"
                  onClick={() => navigate(`/fluxos/${flow.id}`)}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <GitBranch className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{flow.name}</h3>
                    {flow.description && (
                      <p className="text-xs text-muted-foreground truncate">{flow.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                    {format(new Date(flow.updated_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
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
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </Card>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
